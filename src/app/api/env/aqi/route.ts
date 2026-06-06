import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAQIForZone } from '@/lib/env/openaq'
import { getZoneForType, getCurrentZoneForType, GLOBE_ZONES } from '@/lib/env/zones'
import { interpolateToGrid, gridToJSON } from '@/lib/env/gridInterpolator'
import type { EnvLayerData, AQIPoint } from '@/store/types'

/**
 * GET /api/env/aqi
 * Cache-first strategy:
 * 1. Immediately read all cached zones from Supabase → respond to client (fast)
 * 2. Trigger background refresh of stale/missing zones AFTER response is sent
 *    so the client never waits for external API calls
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const now = new Date()
    const sixHoursAgo = new Date(now.getTime() - 21_600_000)

    // ── Step 1: Read ALL cached zones immediately ──────────────────────────
    const { data: allCachedZones } = await supabase
      .from('env_data_cache').select('*').like('layer_type', 'aqi_zone_%')

    // Merge all cached zones into a single response
    const allAqiPoints: AQIPoint[] = []
    allCachedZones?.forEach((z: any) => {
      const d = z.data as { points: AQIPoint[] }
      if (d?.points) allAqiPoints.push(...d.points)
    })

    const zonesLoaded = allCachedZones?.length ?? 0
    const coverage = Math.round(zonesLoaded / GLOBE_ZONES.length * 100)
    console.log(`[AQI] Returning ${allAqiPoints.length} pts (${coverage}% coverage) immediately`)

    // ── Step 2: Schedule background refresh AFTER response is sent ─────────
    after(async () => {
      try {
        const bgSupabase = createAdminClient()
        const cacheIsEmpty = zonesLoaded === 0

        if (cacheIsEmpty) {
          // First ever load — fetch ALL 4 zones concurrently in the background
          console.log('[AQI] Cache empty — fetching all 4 zones concurrently in background...')
          await Promise.allSettled(
            GLOBE_ZONES.map(async (zone) => {
              const key = `aqi_zone_${zone.id}`
              try {
                const points = await getAQIForZone(zone)
                if (points.length > 0) {
                  await bgSupabase.from('env_data_cache').upsert({
                    layer_type: key,
                    data: { points, zone: zone.id },
                    fetched_at: now.toISOString(),
                    expires_at: new Date(now.getTime() + 172_800_000).toISOString(),
                  })
                  console.log(`[AQI] BG: Cached ${points.length} pts for ${zone.name}`)
                }
              } catch (err) {
                console.error(`[AQI] BG: Failed zone ${zone.name}:`, err)
              }
            })
          )
        } else {
          // Subsequent loads — refresh one stale zone per request
          const aqiZone = getZoneForType('aqi') ?? getCurrentZoneForType('aqi')
          const aqiZoneKey = `aqi_zone_${aqiZone.id}`
          const zoneCache = allCachedZones?.find((c: any) => c.layer_type === aqiZoneKey)
          const needsRefresh = !zoneCache || new Date(zoneCache.fetched_at) < sixHoursAgo

          if (needsRefresh) {
            try {
              const points = await getAQIForZone(aqiZone)
              if (points.length > 0) {
                await bgSupabase.from('env_data_cache').upsert({
                  layer_type: aqiZoneKey,
                  data: { points, zone: aqiZone.id },
                  fetched_at: now.toISOString(),
                  expires_at: new Date(now.getTime() + 172_800_000).toISOString(),
                })
                console.log(`[AQI] BG: Refreshed ${points.length} pts for ${aqiZone.name}`)
              }
            } catch (err) {
              console.error(`[AQI] BG: Failed to refresh ${aqiZone.name}:`, err)
            }
          } else {
            console.log(`[AQI] BG: Zone ${aqiZone.name} is fresh, skipping refresh`)
          }
        }
      } catch (err) {
        console.error('[AQI] BG refresh error:', err)
      }
    })

    // ── Pre-interpolate to dense grid (server-side IDW) ──────────────────
    const aqiGrid = allAqiPoints.length > 0
      ? gridToJSON(interpolateToGrid(allAqiPoints.map(p => ({ lat: p.lat, lon: p.lon, value: p.aqi }))))
      : undefined

    // ── Respond immediately with what we have ─────────────────────────────
    const aqiData: EnvLayerData = {
      type: 'aqi',
      updatedAt: now.toISOString(),
      aqi: allAqiPoints,
      aqiGrid,
    }

    return NextResponse.json(
      {
        ...aqiData,
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
    console.error('[AQI] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch AQI data' }, { status: 500 })
  }
}
