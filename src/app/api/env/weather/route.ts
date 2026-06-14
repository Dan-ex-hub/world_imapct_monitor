import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchGlobalWeather } from '@/lib/env/openmeteo'
import { interpolateToGrid, gridToJSON } from '@/lib/env/gridInterpolator'
import type { EnvLayerData, WindPoint, TempAnomalyPoint } from '@/store/types'

const WIND_KEY = 'wind'
const TEMP_KEY = 'temp_anomaly'
const CACHE_MS = 21_600_000 // 6h

/**
 * Module-level guard so we never launch two background weather refreshes at
 * once (a single throttled pass takes ~2 minutes). Resets on server restart.
 */
let refreshing = false

/**
 * GET /api/env/weather
 *
 * Open-Meteo bills every coordinate as one API call (600/min, 5k/hr, 10k/day),
 * so we NEVER fetch on the request path. Instead:
 *   1. Serve whatever global wind/temp is cached (built into dense grids).
 *   2. If the cache is missing or stale, kick off ONE throttled background
 *      refresh that repopulates the cache over ~2 minutes.
 * The client polls this endpoint periodically and picks up fresh data once the
 * background pass completes.
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const now = new Date()

    // ── Read cached global wind + temp ────────────────────────────────────
    const { data: rows } = await supabase
      .from('env_data_cache')
      .select('layer_type, data, fetched_at, expires_at')
      .in('layer_type', [WIND_KEY, TEMP_KEY])

    interface WeatherRow {
      layer_type: string
      data: { points?: unknown[] } | null
      fetched_at: string
      expires_at: string
    }
    const typedRows = (rows ?? []) as WeatherRow[]
    const windRow = typedRows.find((r) => r.layer_type === WIND_KEY)
    const tempRow = typedRows.find((r) => r.layer_type === TEMP_KEY)

    const windPoints: WindPoint[] = (windRow?.data?.points as WindPoint[]) ?? []
    const tempPoints: TempAnomalyPoint[] = (tempRow?.data?.points as TempAnomalyPoint[]) ?? []

    const isFresh = (r: typeof windRow) =>
      !!r?.expires_at && new Date(r.expires_at).getTime() > now.getTime()
    const stale = !isFresh(windRow) || !isFresh(tempRow)

    // ── Trigger a background refresh if data is stale/missing ─────────────
    if (stale && !refreshing) {
      refreshing = true
      console.log('[Weather] Cache stale/missing → starting background refresh')
      after(async () => {
        try {
          const { wind, temp, complete } = await fetchGlobalWeather()
          if (!complete) {
            console.warn('[Weather] Background pass incomplete; not overwriting cache')
            return
          }
          const bg = createAdminClient()
          const expires = new Date(Date.now() + CACHE_MS).toISOString()
          const ts = new Date().toISOString()
          await Promise.all([
            wind.length > 0 &&
              bg.from('env_data_cache').upsert({
                layer_type: WIND_KEY,
                data: { points: wind },
                fetched_at: ts,
                expires_at: expires,
              }),
            temp.length > 0 &&
              bg.from('env_data_cache').upsert({
                layer_type: TEMP_KEY,
                data: { points: temp },
                fetched_at: ts,
                expires_at: expires,
              }),
          ])
          console.log(`[Weather] Background refresh cached: ${wind.length} wind, ${temp.length} temp pts`)
        } catch (err) {
          console.error('[Weather] Background refresh error:', err)
        } finally {
          refreshing = false
        }
      })
    }

    // ── Build dense grids from whatever we have and respond ───────────────
    const windGrid = windPoints.length > 0
      ? gridToJSON(interpolateToGrid(windPoints.map((p) => ({ lat: p.lat, lon: p.lon, value: p.speed }))))
      : undefined
    const tempGrid = tempPoints.length > 0
      ? gridToJSON(interpolateToGrid(tempPoints.map((p) => ({ lat: p.lat, lon: p.lon, value: p.anomalyC }))))
      : undefined

    return NextResponse.json(
      {
        wind: { type: 'wind', updatedAt: now.toISOString(), wind: windPoints, windGrid } as EnvLayerData,
        temperature_anomaly: {
          type: 'temperature_anomaly',
          updatedAt: now.toISOString(),
          tempAnomalies: tempPoints,
          tempGrid,
        } as EnvLayerData,
        meta: {
          windPoints: windPoints.length,
          tempPoints: tempPoints.length,
          stale,
          refreshing,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[Weather] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 })
  }
}
