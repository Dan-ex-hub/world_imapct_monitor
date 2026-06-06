import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSeaTempForZone } from '@/lib/env/seatemp'
import { getZoneForType, getCurrentZoneForType, GLOBE_ZONES } from '@/lib/env/zones'
import { interpolateToGrid, gridToJSON } from '@/lib/env/gridInterpolator'
import type { EnvLayerData, SeaTempPoint } from '@/store/types'

/**
 * GET /api/env/sea-temp
 * Cache-first strategy:
 * 1. Immediately read all cached zones from Supabase → respond to client (fast)
 * 2. Trigger background refresh of stale/missing zones AFTER response is sent
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const now = new Date()
    const sixHoursAgo = new Date(now.getTime() - 21_600_000)

    // ── Step 1: Read ALL cached zones immediately ──────────────────────────
    const { data: allCachedZones } = await supabase
      .from('env_data_cache').select('*').like('layer_type', 'sea_zone_%')

    // Merge all cached zones into a single response
    const allSeaPoints: SeaTempPoint[] = []
    allCachedZones?.forEach((z: any) => {
      const d = z.data as { points: SeaTempPoint[] }
      if (d?.points) allSeaPoints.push(...d.points)
    })

    const zonesLoaded = allCachedZones?.length ?? 0
    const coverage = Math.round(zonesLoaded / GLOBE_ZONES.length * 100)
    console.log(`[SeaTemp] Returning ${allSeaPoints.length} pts (${coverage}% coverage) immediately`)

    // ── Step 2: Schedule background refresh AFTER response is sent ─────────
    after(async () => {
      try {
        const bgSupabase = createAdminClient()
        const cacheIsEmpty = zonesLoaded === 0

        if (cacheIsEmpty) {
          // First ever load — fetch ALL 4 zones concurrently in the background
          console.log('[SeaTemp] Cache empty — fetching all 4 zones concurrently in background...')
          await Promise.allSettled(
            GLOBE_ZONES.map(async (zone) => {
              const key = `sea_zone_${zone.id}`
              try {
                const points = await getSeaTempForZone(zone)
                if (points.length > 0) {
                  await bgSupabase.from('env_data_cache').upsert({
                    layer_type: key,
                    data: { points, zone: zone.id },
                    fetched_at: now.toISOString(),
                    expires_at: new Date(now.getTime() + 172_800_000).toISOString(),
                  })
                  console.log(`[SeaTemp] BG: Cached ${points.length} pts for ${zone.name}`)
                }
              } catch (err) {
                console.error(`[SeaTemp] BG: Failed zone ${zone.name}:`, err)
              }
            })
          )
        } else {
          // Subsequent loads — refresh one stale zone per request
          const seaZone = getZoneForType('sea_temp') ?? getCurrentZoneForType('sea_temp')
          const seaKey = `sea_zone_${seaZone.id}`
          const zoneCache = allCachedZones?.find((c: any) => c.layer_type === seaKey)
          const needsRefresh = !zoneCache || new Date(zoneCache.fetched_at) < sixHoursAgo

          if (needsRefresh) {
            try {
              const points = await getSeaTempForZone(seaZone)
              if (points.length > 0) {
                await bgSupabase.from('env_data_cache').upsert({
                  layer_type: seaKey,
                  data: { points, zone: seaZone.id },
                  fetched_at: now.toISOString(),
                  expires_at: new Date(now.getTime() + 172_800_000).toISOString(),
                })
                console.log(`[SeaTemp] BG: Refreshed ${points.length} pts for ${seaZone.name}`)
              }
            } catch (err) {
              console.error(`[SeaTemp] BG: Failed to refresh ${seaZone.name}:`, err)
            }
          } else {
            console.log(`[SeaTemp] BG: Zone ${seaZone.name} is fresh, skipping refresh`)
          }
        }
      } catch (err) {
        console.error('[SeaTemp] BG refresh error:', err)
      }
    })

    // ── Pre-interpolate to dense grid (server-side IDW) ──────────────────
    let seaTempGrid
    try {
      const t0 = Date.now()
      seaTempGrid = allSeaPoints.length > 0
        ? gridToJSON(interpolateToGrid(allSeaPoints.map(p => ({ lat: p.lat, lon: p.lon, value: p.tempC }))))
        : undefined
      console.log(`[SeaTemp] Grid: ${Date.now() - t0}ms (${allSeaPoints.length} pts)`)
    } catch (err) {
      console.error('[SeaTemp] Grid interpolation failed:', err)
      seaTempGrid = undefined
    }

    // ── Respond immediately with what we have ─────────────────────────────
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
          coverage: `${coverage}%`,
          zonesLoaded,
          totalZones: GLOBE_ZONES.length,
          isPartial: zonesLoaded < GLOBE_ZONES.length,
        }
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[SeaTemp] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch sea temperature data' }, { status: 500 })
  }
}
