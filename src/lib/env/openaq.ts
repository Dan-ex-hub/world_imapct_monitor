import axios from 'axios'
import type { AQIPoint } from '@/store/types'

const BASE = 'https://api.openaq.org/v2'

/**
 * EPA standard PM2.5 → AQI conversion
 * Follows EPA breakpoint table for PM2.5 (µg/m³)
 */
export function aqiFromPm25(pm25: number): number {
  const breakpoints: [number, number, number, number][] = [
    [0, 12, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400],
    [350.5, 500.4, 401, 500],
  ]

  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (pm25 >= cLow && pm25 <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (pm25 - cLow) + iLow)
    }
  }
  return pm25 > 500 ? 500 : 0
}

/** Return the AQI text category for color mapping */
export function aqiCategory(aqi: number): AQIPoint['category'] {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy for Sensitive'
  if (aqi <= 200) return 'Unhealthy'
  if (aqi <= 300) return 'Very Unhealthy'
  return 'Hazardous'
}

/** AQI category → hex color */
export function aqiColor(category: AQIPoint['category']): string {
  switch (category) {
    case 'Good': return '#00e676'
    case 'Moderate': return '#ffeb3b'
    case 'Unhealthy for Sensitive': return '#ff9800'
    case 'Unhealthy': return '#f44336'
    case 'Very Unhealthy': return '#9c27b0'
    case 'Hazardous': return '#7b1fa2'
    default: return '#ffffff'
  }
}

/**
 * Fetch global AQI data from OpenAQ.
 * Returns one entry per city, deduplicated, with PM2.5 converted to AQI.
 */
export async function getGlobalAQI(): Promise<AQIPoint[]> {
  try {
    const { data } = await axios.get(`${BASE}/latest`, {
      params: {
        limit: 500,
        parameter: 'pm25',
        order_by: 'lastUpdated',
        sort: 'desc',
      },
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!data?.results) return []

    const cityMap = new Map<string, AQIPoint>()

    for (const result of data.results) {
      const city = result.city || result.location || 'Unknown'
      if (cityMap.has(city)) continue

      const measurement = result.measurements?.find(
        (m: { parameter: string }) => m.parameter === 'pm25'
      )
      if (!measurement) continue

      const pm25 = measurement.value
      const aqi = aqiFromPm25(pm25)

      cityMap.set(city, {
        lat: result.coordinates?.latitude ?? 0,
        lon: result.coordinates?.longitude ?? 0,
        city,
        country: result.country || '',
        aqi,
        pm25,
        category: aqiCategory(aqi),
      })
    }

    return Array.from(cityMap.values()).filter((p) => p.lat !== 0 && p.lon !== 0)
  } catch {
    return []
  }
}
