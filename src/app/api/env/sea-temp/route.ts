import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchGlobalSeaTemp } from '@/lib/env/seatemp'
import { interpolateToGrid, gridToJSON } from '@/lib/env/gridInterpolator'
import type { EnvLayerData, SeaTempPoint } from '@/store/types'

const KEY = 'sea_temp'
const CACHE_MS = 172_800_000 // 48h — SST changes slowly

/** Guard against launching two background refreshes at once. */
let refreshing = false

/**
 * GET /api/env/sea-temp
 *
 * Open-Meteo bills each coordinate as one API call, so we NEVER fetch on the
 * request path. Serve whatever global SST is cached and kick off one throttled
 * background refresh when it's stale/missing.
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const now = new Date()

    const { data: rows } = await supabase
      .from('env_data_cache')
      .select('layer_type, data, fetched_at, expires_at')
      .eq('layer_type', KEY)

    interface Row { data: { points?: SeaTempPoint[] } | null; expires_at: string }
    const row = (rows?.[0] as Row | undefined)
    const points: SeaTempPoint[] = row?.data?.points ?? []
    const stale = !row?.expires_at || new Date(row.expires_at).getTime() <= now.getTime()

    if (stale && !refreshing) {
      refreshing = true
      console.log('[SeaTemp] Cache stale/missing → starting background refresh')
      after(async () => {
        try {
          const { points: fresh, complete } = await fetchGlobalSeaTemp()
          if (!complete || fresh.length === 0) {
            console.warn('[SeaTemp] Background pass incomplete; not overwriting cache')
            return
          }
          const bg = createAdminClient()
          await bg.from('env_data_cache').upsert({
            layer_type: KEY,
            data: { points: fresh },
            fetched_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + CACHE_MS).toISOString(),
          })
          console.log(`[SeaTemp] Background refresh cached: ${fresh.length} pts`)
        } catch (err) {
          console.error('[SeaTemp] Background refresh error:', err)
        } finally {
          refreshing = false
        }
      })
    }

    const seaTempGrid = points.length > 0
      ? gridToJSON(interpolateToGrid(points.map((p) => ({ lat: p.lat, lon: p.lon, value: p.tempC })), 10))
      : undefined

    const seaData: EnvLayerData = {
      type: 'sea_temp',
      updatedAt: now.toISOString(),
      seaTemp: points,
      seaTempGrid,
    }

    return NextResponse.json(
      { ...seaData, meta: { points: points.length, stale, refreshing } },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[SeaTemp] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch sea temperature data' }, { status: 500 })
  }
}
