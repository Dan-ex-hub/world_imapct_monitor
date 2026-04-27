import axios from 'axios'
import type { WindPoint, TempAnomalyPoint } from '@/store/types'

const BASE = 'https://api.open-meteo.com/v1'

/**
 * Fetch wind speed + direction for a global grid.
 * Uses a 10°x10° grid (~36x18 = 648 points) to stay within rate limits.
 */
export async function getWindGrid(): Promise<WindPoint[]> {
  const points: WindPoint[] = []
  const batchSize = 10

  // Generate lat/lon grid at 10° intervals
  const coords: { lat: number; lon: number }[] = []
  for (let lat = -80; lat <= 80; lat += 10) {
    for (let lon = -180; lon <= 170; lon += 10) {
      coords.push({ lat, lon })
    }
  }

  // Batch requests to avoid rate limiting
  for (let i = 0; i < coords.length; i += batchSize) {
    const batch = coords.slice(i, i + batchSize)
    const latitudes = batch.map((c) => c.lat).join(',')
    const longitudes = batch.map((c) => c.lon).join(',')

    try {
      const { data } = await axios.get(`${BASE}/forecast`, {
        params: {
          latitude: latitudes,
          longitude: longitudes,
          current: 'wind_speed_10m,wind_direction_10m',
          forecast_days: 1,
        },
        timeout: 10000,
      })

      // Handle single or multiple results
      const results = Array.isArray(data) ? data : [data]
      results.forEach((result: Record<string, unknown>, idx: number) => {
        const current = result.current as Record<string, number> | undefined
        if (current?.wind_speed_10m !== undefined) {
          points.push({
            lat: batch[idx].lat,
            lon: batch[idx].lon,
            speed: current.wind_speed_10m,
            direction: current.wind_direction_10m ?? 0,
          })
        }
      })
    } catch {
      // Skip failed batches
    }

    // Small delay between batches to respect rate limits
    if (i + batchSize < coords.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return points
}

/**
 * Fetch temperature anomalies for a coarse global grid.
 * Compares current temperature to historical average.
 */
export async function getTempAnomalies(): Promise<TempAnomalyPoint[]> {
  const points: TempAnomalyPoint[] = []
  const batchSize = 10

  const coords: { lat: number; lon: number }[] = []
  for (let lat = -60; lat <= 70; lat += 15) {
    for (let lon = -180; lon <= 165; lon += 15) {
      coords.push({ lat, lon })
    }
  }

  for (let i = 0; i < coords.length; i += batchSize) {
    const batch = coords.slice(i, i + batchSize)
    const latitudes = batch.map((c) => c.lat).join(',')
    const longitudes = batch.map((c) => c.lon).join(',')

    try {
      const { data } = await axios.get(`${BASE}/forecast`, {
        params: {
          latitude: latitudes,
          longitude: longitudes,
          current: 'temperature_2m',
          daily: 'temperature_2m_max,temperature_2m_min',
          forecast_days: 1,
        },
        timeout: 10000,
      })

      const results = Array.isArray(data) ? data : [data]
      results.forEach((result: Record<string, unknown>, idx: number) => {
        const current = result.current as Record<string, number> | undefined
        const daily = result.daily as Record<string, number[]> | undefined
        if (current?.temperature_2m !== undefined && daily?.temperature_2m_max) {
          const avgDaily = (daily.temperature_2m_max[0] + (daily.temperature_2m_min?.[0] ?? daily.temperature_2m_max[0])) / 2
          // Anomaly = current temp - daily average (simplified)
          const anomaly = current.temperature_2m - avgDaily
          points.push({
            lat: batch[idx].lat,
            lon: batch[idx].lon,
            anomalyC: Math.round(anomaly * 10) / 10,
          })
        }
      })
    } catch {
      // Skip failed batches
    }

    if (i + batchSize < coords.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return points
}
