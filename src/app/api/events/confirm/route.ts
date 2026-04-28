import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/events/confirm
 * Confirm an AI-generated event and save it to the database
 * Requires authentication or admin secret
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication or admin secret
    const adminSecret = request.headers.get('x-admin-secret')
    const supabase = await createClient()

    if (adminSecret !== process.env.ADMIN_SECRET) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()

    // Validate required fields
    const requiredFields = [
      'headline',
      'country',
      'lat',
      'lon',
      'impactLevel',
      'category',
      'summary',
      'sentiment',
    ]

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Calculate expiration (48 hours from now)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    // Insert event
    const { data, error } = await supabase
      .from('events')
      .insert({
        headline: body.headline,
        country: body.country,
        lat: body.lat,
        lon: body.lon,
        impact_level: body.impactLevel,
        category: body.category,
        summary: body.summary,
        sentiment: body.sentiment,
        forex_impacts: body.forexImpacts || [],
        confidence_score: (body.confidenceScore || 0) / 100, // Convert 0-100 to 0-1
        is_market_moving: body.isMarketMoving || false,
        expires_at: expiresAt,
        source_url: body.sourceUrl,
        created_by: adminSecret === process.env.ADMIN_SECRET ? 'ai-confirmed' : 'manual',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to confirm event:', error)
      return NextResponse.json(
        { error: 'Failed to save event', details: error.message },
        { status: 500 }
      )
    }

    // Log to deduplication table
    if (body.sourceUrl) {
      await supabase.from('event_dedup_log').insert({
        source_headline: body.headline,
        source_url: body.sourceUrl,
        matched_event_id: data.id,
        action: 'created',
      })
    }

    // Transform to app format
    const event = {
      id: data.id,
      headline: data.headline,
      country: data.country,
      lat: Number(data.lat),
      lon: Number(data.lon),
      impactLevel: data.impact_level,
      category: data.category,
      summary: data.summary,
      sentiment: data.sentiment,
      forexImpacts: data.forex_impacts || [],
      confidenceScore: Number(data.confidence_score) * 100,
      isMarketMoving: data.is_market_moving,
      publishedAt: data.published_at,
      expiresAt: data.expires_at,
      sourceUrl: data.source_url,
      createdBy: data.created_by,
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Event confirmation error:', error)
    return NextResponse.json(
      {
        error: 'Confirmation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
