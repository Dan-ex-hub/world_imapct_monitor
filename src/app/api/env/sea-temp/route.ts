import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EnvLayerData } from '@/store/types'

/**
 * GET /api/env/sea-temp
 * Placeholder for sea surface temperature data
 * Would integrate with NOAA ERDDAP or similar service
 * For now, returns empty data
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check cache first
    const { data: cached } = await supabase
      .from('env_data_cache')
      .select('*')
      .eq('layer_type', 'sea_temp')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached?.data) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      })
    }

    // TODO: Implement NOAA ERDDAP integration
    // For now, return empty data
    const now = new Date()
    const layerData: EnvLayerData = {
      type: 'sea_temp',
      updatedAt: now.toISOString(),
    }

    // Cache for 24 hours
    await supabase.from('env_data_cache').upsert({
      layer_type: 'sea_temp',
      data: layerData,
      fetched_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 86400_000).toISOString(),
    })

    return NextResponse.json(layerData, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
      },
    })
  } catch (error) {
    console.error('Sea temp API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch sea temperature data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
