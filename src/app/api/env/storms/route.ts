import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStorms } from '@/lib/env/eonet'
import type { EnvLayerData } from '@/store/types'

/**
 * GET /api/env/storms
 * Fetch severe storm data from NASA EONET
 * Caches in env_data_cache table for 15 minutes
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check cache first
    const { data: cached } = await supabase
      .from('env_data_cache')
      .select('*')
      .eq('layer_type', 'storms')
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
    console.log('Fetching storm data from NASA EONET...')
    const storms = await getStorms()

    const now = new Date()
    const layerData: EnvLayerData = {
      type: 'storms',
      updatedAt: now.toISOString(),
      storms,
    }

    // Cache for 15 minutes
    await supabase.from('env_data_cache').upsert({
      layer_type: 'storms',
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
    console.error('Storms API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch storm data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
