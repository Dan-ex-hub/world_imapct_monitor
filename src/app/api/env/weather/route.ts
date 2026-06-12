import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getWindGridForZone, getTempAnomaliesForZone } from '@/lib/env/openmeteo'
import { getWindGridForZoneWeatherAPI, getTempAnomaliesForZoneWeatherAPI } from '@/lib/env/weatherapi'
import { GLOBE_ZONES, GRID_CACHE_VERSION, zoneCacheKey } from '@/lib/env/zones'
import { interpolateToGrid, gridToJSON } from '@/lib/env/gridInterpolator'
import type { EnvLayerData, WindPoint, TempAnomalyPoint } from '@/store/types'

/**
 * GET /api/env/weather
 * Always-complete strategy:
 * 1. Read all cached zones from Supabase (versioned keys — only 2.5° data matches)
 * 2. If any zones are missing, fetch them NOW (in-request, parallel) before responding
 * 3. Respond with a fully-populated grid — client always gets 100% coverage
 * 4. Schedule background refresh of stale zones AFTER response is sent,
 *    and purge legacy pre-v2 (5°) cache rows so stale data is never served
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const now = new Date()
    const sixHoursAgo = new Date(now.getTime() - 21_600_000)

    // ── Step 1: Read ALL cached zones immediately (parallel) ───────────────
    // Versioned key prefix (e.g. wind_zone_v2_%) ignores any legacy 5° rows.
    const [{ data: allWindZones }, { data: allTempZones }] = await Promise.all([
      supabase.from('env_data_cache').select('*').like('layer_type', `wind_zone_${GRID_CACHE_VERSION}_%`),
      supabase.from('env_data_cache').select('*').like('layer_type', `temp_zone_${GRID_CACHE_VERSION}_%`),
    ])

    // Find which zones are missing from cache
    const cachedWindIds = new Set((allWindZones ?? []).map((z: any) => z.layer_type))
    const cachedTempIds = new Set((allTempZones ?? []).map((z: any) => z.layer_type))
    const missingWindZones = GLOBE_ZONES.filter(z => !cachedWindIds.has(zoneCacheKey('wind', z.id)))
    const missingTempZones = GLOBE_ZONES.filter(z => !cachedTempIds.has(zoneCacheKey('temp', z.id)))

    // ── Step 2: Fetch ALL missing zones NOW, in parallel, before responding ──
    if (missingWindZones.length > 0 || missingTempZones.length > 0) {
      console.log(`[Weather] Fetching ${missingWindZones.length} missing wind zones, ${missingTempZones.length} missing temp zones synchronously...`)

      const fetchedWindZones: { layer_type: string; data: any }[] = []
      const fetchedTempZones: { layer_type: string; data: any }[] = []

      await Promise.allSettled([
        // Fetch missing wind zones
        ...missingWindZones.map(async (zone) => {
          const key = zoneCacheKey('wind', zone.id)
          let points: WindPoint[] = []
          try {
            points = await getWindGridForZone(zone)
          } catch {
            try { points = await getWindGridForZoneWeatherAPI(zone) } catch { /* skip */ }
          }
          if (points.length > 0) {
            await supabase.from('env_data_cache').upsert({
              layer_type: key,
              data: { points, zone: zone.id },
              fetched_at: now.toISOString(),
              expires_at: new Date(now.getTime() + 21_600_000).toISOString(), // 6h cache
            })
            fetchedWindZones.push({ layer_type: key, data: { points } })
            console.log(`[Weather] Fetched ${points.length} wind pts for ${zone.name}`)
          }
        }),
        // Fetch missing temp zones
        ...missingTempZones.map(async (zone) => {
          const key = zoneCacheKey('temp', zone.id)
          let points: TempAnomalyPoint[] = []
          try {
            points = await getTempAnomaliesForZone(zone)
          } catch {
            try { points = await getTempAnomaliesForZoneWeatherAPI(zone) } catch { /* skip */ }
          }
          if (points.length > 0) {
            await supabase.from('env_data_cache').upsert({
              layer_type: key,
              data: { points, zone: zone.id },
              fetched_at: now.toISOString(),
              expires_at: new Date(now.getTime() + 21_600_000).toISOString(),
            })
            fetchedTempZones.push({ layer_type: key, data: { points } })
            console.log(`[Weather] Fetched ${points.length} temp pts for ${zone.name}`)
          }
        }),
      ])

      // Merge newly fetched into the zone arrays
      fetchedWindZones.forEach(z => (allWindZones ?? []).push(z as any))
      fetchedTempZones.forEach(z => (allTempZones ?? []).push(z as any))
    }

    // ── Step 3: Merge all zones into point arrays ─────────────────────────
    const allWindPoints: WindPoint[] = []
    ;(allWindZones ?? []).forEach((z: any) => {
      const d = z.data as { points: WindPoint[] }
      if (d?.points) allWindPoints.push(...d.points)
    })

    const allTempPoints: TempAnomalyPoint[] = []
    ;(allTempZones ?? []).forEach((z: any) => {
      const d = z.data as { points: TempAnomalyPoint[] }
      if (d?.points) allTempPoints.push(...d.points)
    })

    console.log(`[Weather] Building grids: ${allWindPoints.length} wind pts, ${allTempPoints.length} temp pts`)

    // ── Step 4: Schedule background refresh of STALE zones after response ──
    after(async () => {
      try {
        const bgSupabase = createAdminClient()

        // Purge legacy pre-v2 (5°) zone caches so stale low-resolution data
        // can never be served again. Legacy keys: wind_zone_zone-* / temp_zone_zone-*
        await Promise.allSettled([
          bgSupabase.from('env_data_cache').delete().like('layer_type', 'wind_zone_zone-%'),
          bgSupabase.from('env_data_cache').delete().like('layer_type', 'temp_zone_zone-%'),
        ])

        const staleWindZones = GLOBE_ZONES.filter(z => {
          const cached = (allWindZones ?? []).find((c: any) => c.layer_type === zoneCacheKey('wind', z.id))
          return cached && new Date(cached.fetched_at) < sixHoursAgo
        })
        const staleTempZones = GLOBE_ZONES.filter(z => {
          const cached = (allTempZones ?? []).find((c: any) => c.layer_type === zoneCacheKey('temp', z.id))
          return cached && new Date(cached.fetched_at) < sixHoursAgo
        })

        if (staleWindZones.length === 0 && staleTempZones.length === 0) return

        console.log(`[Weather] BG: Refreshing ${staleWindZones.length} stale wind, ${staleTempZones.length} stale temp zones`)

        await Promise.allSettled([
          ...staleWindZones.map(async (zone) => {
            let points: WindPoint[] = []
            try { points = await getWindGridForZone(zone) } catch {
              try { points = await getWindGridForZoneWeatherAPI(zone) } catch { /* skip */ }
            }
            if (points.length > 0) {
              await bgSupabase.from('env_data_cache').upsert({
                layer_type: zoneCacheKey('wind', zone.id),
                data: { points, zone: zone.id },
                fetched_at: now.toISOString(),
                expires_at: new Date(now.getTime() + 21_600_000).toISOString(),
              })
            }
          }),
          ...staleTempZones.map(async (zone) => {
            let points: TempAnomalyPoint[] = []
            try { points = await getTempAnomaliesForZone(zone) } catch {
              try { points = await getTempAnomaliesForZoneWeatherAPI(zone) } catch { /* skip */ }
            }
            if (points.length > 0) {
              await bgSupabase.from('env_data_cache').upsert({
                layer_type: zoneCacheKey('temp', zone.id),
                data: { points, zone: zone.id },
                fetched_at: now.toISOString(),
                expires_at: new Date(now.getTime() + 21_600_000).toISOString(),
              })
            }
          }),
        ])
      } catch (err) {
        console.error('[Weather] BG refresh error:', err)
      }
    })

    // ── Step 5: Build dense grids and respond ─────────────────────────────
    const windGrid = allWindPoints.length > 0
      ? gridToJSON(interpolateToGrid(allWindPoints.map(p => ({ lat: p.lat, lon: p.lon, value: p.speed }))))
      : undefined
    const tempGrid = allTempPoints.length > 0
      ? gridToJSON(interpolateToGrid(allTempPoints.map(p => ({ lat: p.lat, lon: p.lon, value: p.anomalyC }))))
      : undefined

    const windZonesLoaded = (allWindZones?.length ?? 0)
    const tempZonesLoaded = (allTempZones?.length ?? 0)

    return NextResponse.json(
      {
        wind: {
          type: 'wind',
          updatedAt: now.toISOString(),
          wind: allWindPoints,
          windGrid,
        } as EnvLayerData,
        temperature_anomaly: {
          type: 'temperature_anomaly',
          updatedAt: now.toISOString(),
          tempAnomalies: allTempPoints,
          tempGrid,
        } as EnvLayerData,
        meta: {
          windCoverage: `${Math.round(windZonesLoaded / GLOBE_ZONES.length * 100)}%`,
          tempCoverage: `${Math.round(tempZonesLoaded / GLOBE_ZONES.length * 100)}%`,
          zonesLoaded: { wind: windZonesLoaded, temp: tempZonesLoaded, total: GLOBE_ZONES.length },
          gridResolution: 2.5,
          isPartial: false, // always complete now
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[Weather] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 })
  }
}
