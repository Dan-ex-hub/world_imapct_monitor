import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSeaTempForZone } from '@/lib/env/seatemp'
import { GLOBE_ZONES, GRID_CACHE_VERSION, zoneCacheKey } from '@/lib/env/zones'
import { interpolateToGrid, gridToJSON } from '@/lib/env/gridInterpolator'
import type { EnvLayerData, SeaTempPoint } from '@/store/types'

/**
 * GET /api/env/sea-temp
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

    // ── Step 1: Read ALL cached zones immediately ──────────────────────────
    // Versioned key prefix (sea_zone_v2_%) ignores any legacy 5° rows.
    const { data: allCachedZones } = await supabase
      .from('env_data_cache').select('*').like('layer_type', `sea_zone_${GRID_CACHE_VERSION}_%`)

    // Find which zones are missing from cache
    const cachedIds = new Set((allCachedZones ?? []).map((z: any) => z.layer_type))
    const missingZones = GLOBE_ZONES.filter(z => !cachedIds.has(zoneCacheKey('sea', z.id)))

    // ── Step 2: Fetch ALL missing zones NOW, in parallel, before responding ──
    const freshZones: { layer_type: string; data: any; fetched_at?: string }[] = []

    if (missingZones.length > 0) {
      console.log(`[SeaTemp] Fetching ${missingZones.length} missing zones synchronously...`)

      await Promise.allSettled(
        missingZones.map(async (zone) => {
          const key = zoneCacheKey('sea', zone.id)
          try {
            const points = await getSeaTempForZone(zone)
            if (points.length > 0) {
              await supabase.from('env_data_cache').upsert({
                layer_type: key,
                data: { points, zone: zone.id },
                fetched_at: now.toISOString(),
                expires_at: new Date(now.getTime() + 172_800_000).toISOString(), // 48h for sea temp (slow changing)
              })
              freshZones.push({ layer_type: key, data: { points }, fetched_at: now.toISOString() })
              console.log(`[SeaTemp] Fetched ${points.length} pts for ${zone.name}`)
            }
          } catch (err) {
            console.error(`[SeaTemp] Failed zone ${zone.name}:`, err)
          }
        })
      )
    }

    // ── Step 3: Merge all zones into a single point array ─────────────────
    const allSeaPoints: SeaTempPoint[] = []
    ;(allCachedZones ?? []).forEach((z: any) => {
      const d = z.data as { points: SeaTempPoint[] }
      if (d?.points) allSeaPoints.push(...d.points)
    })
    freshZones.forEach(z => {
      if (z.data?.points) allSeaPoints.push(...z.data.points)
    })

    const zonesLoaded = (allCachedZones?.length ?? 0) + freshZones.length
    console.log(`[SeaTemp] Returning ${allSeaPoints.length} pts (${zonesLoaded}/${GLOBE_ZONES.length} zones)`)

    // ── Step 4: Schedule background refresh of STALE zones after response ──
    after(async () => {
      try {
        const bgSupabase = createAdminClient()

        // Purge legacy pre-v2 (5°) zone caches so stale low-resolution data
        // can never be served again. Legacy keys: sea_zone_zone-*
        await bgSupabase.from('env_data_cache').delete().like('layer_type', 'sea_zone_zone-%')

        const allZones = [...(allCachedZones ?? []), ...freshZones]
        const staleZones = GLOBE_ZONES.filter(z => {
          const cached = allZones.find((c: any) => c.layer_type === zoneCacheKey('sea', z.id))
          return cached && new Date((cached as any).fetched_at) < sixHoursAgo
        })

        if (staleZones.length === 0) return
        console.log(`[SeaTemp] BG: Refreshing ${staleZones.length} stale zones`)

        await Promise.allSettled(
          staleZones.map(async (zone) => {
            try {
              const points = await getSeaTempForZone(zone)
              if (points.length > 0) {
                await bgSupabase.from('env_data_cache').upsert({
                  layer_type: zoneCacheKey('sea', zone.id),
                  data: { points, zone: zone.id },
                  fetched_at: now.toISOString(),
                  expires_at: new Date(now.getTime() + 172_800_000).toISOString(),
                })
              }
            } catch (err) {
              console.error(`[SeaTemp] BG: Failed ${zone.name}:`, err)
            }
          })
        )
      } catch (err) {
        console.error('[SeaTemp] BG refresh error:', err)
      }
    })

    // ── Step 5: Build dense grid and respond ──────────────────────────────
    const seaTempGrid = allSeaPoints.length > 0
      ? gridToJSON(interpolateToGrid(allSeaPoints.map(p => ({ lat: p.lat, lon: p.lon, value: p.tempC }))))
      : undefined

    const seaData: EnvLayerData = {
      type: 'sea_temp',
      updatedAt: now.toISOString(),
      seaTemp: allSeaPoints,
      seaTempGrid,
    }

    return NextResponse.json(
      {
        ...seaData,
        meta: {
          coverage: `${Math.round(zonesLoaded / GLOBE_ZONES.length * 100)}%`,
          zonesLoaded,
          totalZones: GLOBE_ZONES.length,
          gridResolution: 2.5,
          isPartial: false, // always complete now
        }
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[SeaTemp] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch sea temperature data' }, { status: 500 })
  }
}
