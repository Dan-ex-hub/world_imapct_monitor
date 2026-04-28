import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/events/export
 * Export events as CSV (FREE - no authentication required)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || '48h'
    const category = searchParams.get('category')
    const impactLevel = searchParams.get('impactLevel')
    const country = searchParams.get('country')

    const supabase = await createClient()

    // Calculate time threshold
    const hoursMap: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '48h': 48,
    }
    const hours = hoursMap[timeRange] || 48
    const threshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    // Build query
    let query = supabase
      .from('events')
      .select('*')
      .gte('published_at', threshold)
      .lte('expires_at', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString())
      .order('published_at', { ascending: false })

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    if (impactLevel) {
      query = query.eq('impact_level', impactLevel)
    }
    if (country) {
      query = query.eq('country', country)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch events for export:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    // Generate CSV
    const csvHeaders = [
      'id',
      'headline',
      'country',
      'lat',
      'lon',
      'impact_level',
      'category',
      'published_at',
      'forex_pairs',
      'confidence_score',
      'is_market_moving',
      'summary',
      'sentiment',
      'source_url',
    ]

    const csvRows = data.map((event) => {
      const forexPairs = event.forex_impacts
        ? event.forex_impacts.map((impact: any) => impact.pair).join('; ')
        : ''

      return [
        event.id,
        `"${event.headline.replace(/"/g, '""')}"`, // Escape quotes
        event.country,
        event.lat,
        event.lon,
        event.impact_level,
        event.category,
        event.published_at,
        `"${forexPairs}"`,
        (Number(event.confidence_score) * 100).toFixed(0),
        event.is_market_moving ? 'Yes' : 'No',
        `"${event.summary.replace(/"/g, '""')}"`,
        `"${event.sentiment.replace(/"/g, '""')}"`,
        event.source_url || '',
      ].join(',')
    })

    const csv = [csvHeaders.join(','), ...csvRows].join('\n')

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0]
    const filename = `impactglobe-events-${date}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Events export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
