/**
 * Alternative weather API provider (WeatherAPI.com)
 * Free tier: 1 million calls/month
 * Requires API key but has generous free tier
 *
 * NOTE: WeatherAPI.com has no bulk/batch endpoint, so each grid point is a
 * separate request. This provider is an EMERGENCY FALLBACK only, used when
 * Open-Meteo fails entirely. It uses the same shared 2.5° grid so fallback
 * data matches the resolution of every other layer.
 */

import axios from 'axios'
import type { WindPoint, TempAnomalyPoint } from '@/store/types'
import { type GlobeZone, generateZoneGrid, GRID_RESOLUTION } from './zones'

const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY || ''
const BASE = 'https://api.weatherapi.com/v1'

/**
 * Fetch wind data using WeatherAPI.com (fallback provider)
 */
export async function getWindGridForZoneWeatherAPI(zone: GlobeZone): Promise<WindPoint[]> {
  if (!WEATHERAPI_KEY) {
    console.warn('[WeatherAPI] No API key configured')
    return []
  }

  const points: WindPoint[] = []
  const coords = generateZoneGrid(zone, GRID_RESOLUTION) // 2.5° — matches all layers

  console.log(`[WeatherAPI] Fetching wind for zone: ${zone.name} (${coords.length} points)`)

  // WeatherAPI allows bulk requests
  for (let i = 0; i < coords.length; i++) {
    const { lat, lon } = coords[i]

    try {
      const { data } = await axios.get(`${BASE}/current.json`, {
        params: {
          key: WEATHERAPI_KEY,
          q: `${lat},${lon}`,
          aqi: 'no',
        },
        timeout: 5000,
      })

      if (data.current) {
        points.push({
          lat,
          lon,
          speed: data.current.wind_kph / 3.6, // Convert kph to m/s
          direction: data.current.wind_degree,
        })
      }
    } catch (err) {
      // Skip failed points
    }

    // Rate limiting: 1 request per 100ms = 600/minute (well under limit)
    if (i < coords.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  console.log(`[WeatherAPI] Fetched ${points.length} wind points for ${zone.name}`)
  return points
}

/**
 * Fetch temperature data using WeatherAPI.com
 */
export async function getTempAnomaliesForZoneWeatherAPI(zone: GlobeZone): Promise<TempAnomalyPoint[]> {
  if (!WEATHERAPI_KEY) {
    console.warn('[WeatherAPI] No API key configured')
    return []
  }

  const points: TempAnomalyPoint[] = []
  const coords = generateZoneGrid(zone, GRID_RESOLUTION) // 2.5° — matches primary source

  console.log(`[WeatherAPI] Fetching temperature for zone: ${zone.name} (${coords.length} points)`)

  for (let i = 0; i < coords.length; i++) {
    const { lat, lon } = coords[i]

    try {
      const { data } = await axios.get(`${BASE}/current.json`, {
        params: {
          key: WEATHERAPI_KEY,
          q: `${lat},${lon}`,
          aqi: 'no',
        },
        timeout: 5000,
      })

      if (data.current) {
        // Simplified anomaly: current temp vs average for this location
        // (WeatherAPI doesn't provide historical baseline, so this is approximate)
        const currentTemp = data.current.temp_c
        const avgTemp = 15 // Global average baseline (simplified)
        const anomaly = currentTemp - avgTemp

        points.push({
          lat,
          lon,
          anomalyC: Math.round(anomaly * 10) / 10,
        })
      }
    } catch (err) {
      // Skip failed points
    }

    if (i < coords.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  console.log(`[WeatherAPI] Fetched ${points.length} temp points for ${zone.name}`)
  return points
}
