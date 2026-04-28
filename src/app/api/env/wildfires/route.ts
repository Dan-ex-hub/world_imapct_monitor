import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWildfires } from '@/lib/env/eonet'
import type { EnvLayerData } from '@/store/types'

/**
 * GET /api/env/wildfires
 * Fetch wildfire data from NASA EONET
 * Caches in env_data_cache table for 15 minutes
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check cache first
    const { data: cached } = await supabase
      .from('env_data_cache')
      .select('*')
      .eq('layer_type', 'wildfires')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached?.data) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        },
      })
    }

    // Fetch fresh data
    console.log('Fetching wildfire data from NASA EONET...')
    const wildfires = await getWildfires()

    const now = new Date()
    const layerData: EnvLayerData = {
      type: 'wildfires',
      updatedAt: now.toISOString(),
      wildfires,
    }

    // Cache for 15 minutes
    await supabase.from('env_data_cache').upsert({
      layer_type: 'wildfires',
      data: layerData,
      fetched_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 900_000).toISOString(),
    })

    return NextResponse.json(layerData, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    })
  } catch (error) {
    console.error('Wildfires API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch wildfire data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
