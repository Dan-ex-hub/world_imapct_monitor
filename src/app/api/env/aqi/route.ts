import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGlobalAQI } from '@/lib/env/openaq'
import type { EnvLayerData } from '@/store/types'

/**
 * GET /api/env/aqi
 * Fetch air quality index data from OpenAQ
 * Caches in env_data_cache table for 30 minutes
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check cache first
    const { data: cached } = await supabase
      .from('env_data_cache')
      .select('*')
      .eq('layer_type', 'aqi')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached?.data) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      })
    }

    // Fetch fresh data
    console.log('Fetching AQI data from OpenAQ...')
    const aqiPoints = await getGlobalAQI()

    const now = new Date()
    const layerData: EnvLayerData = {
      type: 'aqi',
      updatedAt: now.toISOString(),
      aqi: aqiPoints,
    }

    // Cache for 30 minutes
    await supabase.from('env_data_cache').upsert({
      layer_type: 'aqi',
      data: layerData,
      fetched_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 1800_000).toISOString(),
    })

    // Also store in aqi_history for sparklines
    if (aqiPoints.length > 0) {
      const historyRecords = aqiPoints.slice(0, 100).map((point) => ({
        city: point.city,
        country: point.country,
        lat: point.lat,
        lon: point.lon,
        aqi: point.aqi,
        pm25: point.pm25,
        recorded_at: now.toISOString(),
      }))

      await supabase.from('aqi_history').insert(historyRecords)
    }

    return NextResponse.json(layerData, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error('AQI API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch AQI data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
