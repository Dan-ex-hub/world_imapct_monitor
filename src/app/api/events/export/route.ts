import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/events/export
 * Export events as CSV
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || '48h'

    // Calculate time threshold
    const hoursMap: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '48h': 48,
    }
    const hours = hoursMap[timeRange] || 48
    const threshold = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    // Fetch events
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('published_at', threshold)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch events for export:', error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    // Generate CSV
    const headers = [
      'ID',
      'Headline',
      'Country',
      'Latitude',
      'Longitude',
      'Impact Level',
      'Category',
      'Summary',
      'Sentiment',
      'Confidence Score',
      'Is Market Moving',
      'Published At',
      'Expires At',
      'Source URL',
      'Created By',
    ]

    const rows = data.map((event) => [
      event.id,
      `"${event.headline.replace(/"/g, '""')}"`, // Escape quotes
      event.country,
      event.lat,
      event.lon,
      event.impact_level,
      event.category,
      `"${event.summary.replace(/"/g, '""')}"`,
      `"${event.sentiment.replace(/"/g, '""')}"`,
      Number(event.confidence_score) * 100,
      event.is_market_moving,
      event.published_at,
      event.expires_at,
      event.source_url || '',
      event.created_by,
    ])

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="impactglobe-events-${new Date().toISOString().split('T')[0]}.csv"`,
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
