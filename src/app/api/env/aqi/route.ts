import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGlobalAQI } from '@/lib/env/openaq'
import type { EnvLayerData } from '@/store/types'
import { isRateLimited, RATE_LIMITS } from '@/lib/utils/ratelimit'

/**
 * GET /api/env/aqi
 * Fetch air quality index data from OpenAQ
 * Caches in env_data_cache table for 30 minutes
 */
export async function GET(request: Request) {
  // Rate limiting
  const identifier = `env-aqi-${request.headers.get('x-forwarded-for') || 'unknown'}`
  if (isRateLimited(identifier, RATE_LIMITS.ENV_API)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    )
  }

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
    
    // Try to return stale data if upstream API is down
    const supabase = await createClient()
    const { data: staleData } = await supabase
      .from('env_data_cache')
      .select('*')
      .eq('layer_type', 'aqi')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single()

    if (staleData?.data) {
      console.log('Returning stale AQI data due to upstream error')
      return NextResponse.json(
        {
          ...staleData.data,
          warning: 'Using cached data due to upstream service unavailability',
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch AQI data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
