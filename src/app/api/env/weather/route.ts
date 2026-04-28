import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWindGrid, getTempAnomalies } from '@/lib/env/openmeteo'
import type { EnvLayerData } from '@/store/types'
import { isRateLimited, RATE_LIMITS } from '@/lib/utils/ratelimit'

/**
 * GET /api/env/weather
 * Fetch wind and temperature anomaly data from Open-Meteo
 * Caches in env_data_cache table for 1 hour
 */
export async function GET(request: Request) {
  // Rate limiting to protect free API
  const identifier = `env-weather-${request.headers.get('x-forwarded-for') || 'unknown'}`
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
      .in('layer_type', ['wind', 'temperature_anomaly'])
      .gt('expires_at', new Date().toISOString())

    const now = new Date()
    const windCache = cached?.find((c) => c.layer_type === 'wind')
    const tempCache = cached?.find((c) => c.layer_type === 'temperature_anomaly')

    let windData = windCache?.data
    let tempData = tempCache?.data

    // Fetch wind data if not cached or expired
    if (!windData) {
      console.log('Fetching wind data from Open-Meteo...')
      const windPoints = await getWindGrid()
      windData = {
        type: 'wind' as const,
        updatedAt: now.toISOString(),
        wind: windPoints,
      }

      // Cache for 1 hour
      await supabase.from('env_data_cache').upsert({
        layer_type: 'wind',
        data: windData,
        fetched_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 3600_000).toISOString(),
      })
    }

    // Fetch temperature anomaly data if not cached or expired
    if (!tempData) {
      console.log('Fetching temperature anomaly data from Open-Meteo...')
      const tempPoints = await getTempAnomalies()
      tempData = {
        type: 'temperature_anomaly' as const,
        updatedAt: now.toISOString(),
        tempAnomalies: tempPoints,
      }

      // Cache for 6 hours
      await supabase.from('env_data_cache').upsert({
        layer_type: 'temperature_anomaly',
        data: tempData,
        fetched_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 21600_000).toISOString(),
      })
    }

    return NextResponse.json(
      {
        wind: windData,
        temperature_anomaly: tempData,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    )
  } catch (error) {
    console.error('Weather API error:', error)
    
    // Try to return stale data if upstream API is down
    const supabase = await createClient()
    const { data: staleData } = await supabase
      .from('env_data_cache')
      .select('*')
      .in('layer_type', ['wind', 'temperature_anomaly'])
      .order('fetched_at', { ascending: false })
      .limit(2)

    if (staleData && staleData.length > 0) {
      console.log('Returning stale data due to upstream error')
      const windData = staleData.find((d) => d.layer_type === 'wind')?.data
      const tempData = staleData.find((d) => d.layer_type === 'temperature_anomaly')?.data
      
      return NextResponse.json(
        {
          wind: windData,
          temperature_anomaly: tempData,
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
        error: 'Failed to fetch weather data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
