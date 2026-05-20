import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getWindGridForZone, getTempAnomaliesForZone } from '@/lib/env/openmeteo'
import { getWindGridForZoneWeatherAPI, getTempAnomaliesForZoneWeatherAPI } from '@/lib/env/weatherapi'
import { getZoneForType, getCurrentZoneForType, GLOBE_ZONES } from '@/lib/env/zones'
import type { EnvLayerData, WindPoint, TempAnomalyPoint } from '@/store/types'

/**
 * GET /api/env/weather
 * Cache-first strategy:
 * 1. Immediately read all cached zones from Supabase → respond to client (fast)
 * 2. Trigger background refresh of stale/missing zones AFTER response is sent
 *    — wind and temp zones refresh concurrently
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const now = new Date()
    const sixHoursAgo = new Date(now.getTime() - 21_600_000)

    // ── Step 1: Read ALL cached zones immediately (parallel) ───────────────
    const [{ data: allWindZones }, { data: allTempZones }] = await Promise.all([
      supabase.from('env_data_cache').select('*').like('layer_type', 'wind_zone_%'),
      supabase.from('env_data_cache').select('*').like('layer_type', 'temp_zone_%'),
    ])

    // Merge all cached wind + temp points
    const allWindPoints: WindPoint[] = []
    allWindZones?.forEach((z: any) => {
      const d = z.data as { points: WindPoint[] }
      if (d?.points) allWindPoints.push(...d.points)
    })

    const allTempPoints: TempAnomalyPoint[] = []
    allTempZones?.forEach((z: any) => {
      const d = z.data as { points: TempAnomalyPoint[] }
      if (d?.points) allTempPoints.push(...d.points)
    })

    const windZonesLoaded = allWindZones?.length ?? 0
    const tempZonesLoaded = allTempZones?.length ?? 0
    const windCoverage = Math.round(windZonesLoaded / GLOBE_ZONES.length * 100)
    const tempCoverage = Math.round(tempZonesLoaded / GLOBE_ZONES.length * 100)

    console.log(`[Weather] Returning ${allWindPoints.length} wind (${windCoverage}%), ${allTempPoints.length} temp (${tempCoverage}%) immediately`)

    // ── Step 2: Schedule background refresh AFTER response is sent ─────────
    after(async () => {
      try {
        const bgSupabase = createAdminClient()
        const windCacheEmpty = windZonesLoaded === 0
        const tempCacheEmpty = tempZonesLoaded === 0

        // Run wind and temp refreshes concurrently
        await Promise.allSettled([
          // Wind zones
          (async () => {
            if (windCacheEmpty) {
              console.log('[Weather] BG: Wind cache empty — fetching all 4 zones concurrently...')
              await Promise.allSettled(
                GLOBE_ZONES.map(async (zone) => {
                  const key = `wind_zone_${zone.id}`
                  let points: WindPoint[] = []
                  try {
                    points = await getWindGridForZone(zone)
                  } catch {
                    try { points = await getWindGridForZoneWeatherAPI(zone) } catch { /* skip */ }
                  }
                  if (points.length > 0) {
                    await bgSupabase.from('env_data_cache').upsert({
                      layer_type: key,
                      data: { points, zone: zone.id },
                      fetched_at: now.toISOString(),
                      expires_at: new Date(now.getTime() + 172_800_000).toISOString(),
                    })
                    console.log(`[Weather] BG: Cached ${points.length} wind pts for ${zone.name}`)
                  }
                })
              )
            } else {
              const windZone = getZoneForType('wind') ?? getCurrentZoneForType('wind')
              const windKey = `wind_zone_${windZone.id}`
              const cached = allWindZones?.find((c: any) => c.layer_type === windKey)
              if (!cached || new Date(cached.fetched_at) < sixHoursAgo) {
                let points: WindPoint[] = []
                try { points = await getWindGridForZone(windZone) } catch {
                  try { points = await getWindGridForZoneWeatherAPI(windZone) } catch { /* skip */ }
                }
                if (points.length > 0) {
                  await bgSupabase.from('env_data_cache').upsert({
                    layer_type: windKey,
                    data: { points, zone: windZone.id },
                    fetched_at: now.toISOString(),
                    expires_at: new Date(now.getTime() + 172_800_000).toISOString(),
                  })
                  console.log(`[Weather] BG: Refreshed ${points.length} wind pts for ${windZone.name}`)
                }
              } else {
                console.log(`[Weather] BG: Wind zone ${windZone.name} is fresh, skipping`)
              }
            }
          })(),

          // Temp zones
          (async () => {
            if (tempCacheEmpty) {
              console.log('[Weather] BG: Temp cache empty — fetching all 4 zones concurrently...')
              await Promise.allSettled(
                GLOBE_ZONES.map(async (zone) => {
                  const key = `temp_zone_${zone.id}`
                  let points: TempAnomalyPoint[] = []
                  try {
                    points = await getTempAnomaliesForZone(zone)
                  } catch {
                    try { points = await getTempAnomaliesForZoneWeatherAPI(zone) } catch { /* skip */ }
                  }
                  if (points.length > 0) {
                    await bgSupabase.from('env_data_cache').upsert({
                      layer_type: key,
                      data: { points, zone: zone.id },
                      fetched_at: now.toISOString(),
                      expires_at: new Date(now.getTime() + 172_800_000).toISOString(),
                    })
                    console.log(`[Weather] BG: Cached ${points.length} temp pts for ${zone.name}`)
                  }
                })
              )
            } else {
              const tempZone = getZoneForType('temp') ?? getCurrentZoneForType('temp')
              const tempKey = `temp_zone_${tempZone.id}`
              const cached = allTempZones?.find((c: any) => c.layer_type === tempKey)
              if (!cached || new Date(cached.fetched_at) < sixHoursAgo) {
                let points: TempAnomalyPoint[] = []
                try { points = await getTempAnomaliesForZone(tempZone) } catch {
                  try { points = await getTempAnomaliesForZoneWeatherAPI(tempZone) } catch { /* skip */ }
                }
                if (points.length > 0) {
                  await bgSupabase.from('env_data_cache').upsert({
                    layer_type: tempKey,
                    data: { points, zone: tempZone.id },
                    fetched_at: now.toISOString(),
                    expires_at: new Date(now.getTime() + 172_800_000).toISOString(),
                  })
                  console.log(`[Weather] BG: Refreshed ${points.length} temp pts for ${tempZone.name}`)
                }
              } else {
                console.log(`[Weather] BG: Temp zone ${tempZone.name} is fresh, skipping`)
              }
            }
          })(),
        ])
      } catch (err) {
        console.error('[Weather] BG refresh error:', err)
      }
    })

    // ── Respond immediately with what we have ─────────────────────────────
    return NextResponse.json(
      {
        wind: { type: 'wind', updatedAt: now.toISOString(), wind: allWindPoints } as EnvLayerData,
        temperature_anomaly: { type: 'temperature_anomaly', updatedAt: now.toISOString(), tempAnomalies: allTempPoints } as EnvLayerData,
        meta: {
          windCoverage: `${windCoverage}%`,
          tempCoverage: `${tempCoverage}%`,
          zonesLoaded: { wind: windZonesLoaded, temp: tempZonesLoaded, total: GLOBE_ZONES.length },
          isPartial: windZonesLoaded < GLOBE_ZONES.length || tempZonesLoaded < GLOBE_ZONES.length,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[Weather] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 })
  }
}
