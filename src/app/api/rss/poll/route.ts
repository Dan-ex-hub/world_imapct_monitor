import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseMultipleFeeds, filterNewItems, deduplicateItems } from '@/lib/rss/parser'
import { DEFAULT_RSS_SOURCES } from '@/lib/rss/sources'
import { analyzeNewsItemsBatch, deduplicateEvents } from '@/lib/ai/eventGenerator'

/**
 * GET /api/rss/poll
 * Poll RSS feeds, analyze with AI, and create events
 * Protected by CRON_SECRET for Vercel Cron Jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret')
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    console.log('Starting RSS poll...')

    // Get active RSS sources from database (or use defaults)
    const { data: dbSources } = await supabase
      .from('rss_sources')
      .select('*')
      .eq('is_active', true)

    const sources = dbSources && dbSources.length > 0
      ? dbSources.map((s) => ({ name: s.name, url: s.url }))
      : DEFAULT_RSS_SOURCES.map((s) => ({ name: s.name, url: s.url }))

    console.log(`Polling ${sources.length} RSS sources...`)

    // Parse all feeds
    const feeds = await parseMultipleFeeds(sources.map((s) => s.url))
    console.log(`Parsed ${feeds.length} feeds successfully`)

    // Collect all items
    let allItems = feeds.flatMap((feed) => feed.items)
    console.log(`Total items: ${allItems.length}`)

    // Filter items from last 2 hours only (to avoid reprocessing old news)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    allItems = filterNewItems(allItems, twoHoursAgo)
    console.log(`Items from last 2 hours: ${allItems.length}`)

    // Deduplicate by GUID/link
    allItems = deduplicateItems(allItems)
    console.log(`After deduplication: ${allItems.length}`)

    if (allItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new items to process',
        stats: { feeds: feeds.length, items: 0, analyzed: 0, created: 0 },
      })
    }

    // Limit to 20 most recent items to avoid overwhelming the AI
    allItems = allItems.slice(0, 20)

    // Analyze items with AI (batch processing)
    console.log(`Analyzing ${allItems.length} items with AI...`)
    const analysisResults = await analyzeNewsItemsBatch(allItems, 3)
    console.log(`AI analysis complete: ${analysisResults.length} events to display`)

    if (analysisResults.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No significant events found',
        stats: { feeds: feeds.length, items: allItems.length, analyzed: allItems.length, created: 0 },
      })
    }

    // Get existing events from last 24 hours for deduplication
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existingEvents } = await supabase
      .from('events')
      .select('headline')
      .gte('published_at', oneDayAgo)

    // Deduplicate against existing events
    console.log('Deduplicating against existing events...')
    const uniqueEvents = await deduplicateEvents(
      analysisResults,
      existingEvents || []
    )
    console.log(`After deduplication: ${uniqueEvents.length} unique events`)

    // Insert events into database
    const eventsToInsert = uniqueEvents.map((result) => {
      if (!result.event) return null

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

      return {
        headline: result.event.headline,
        country: result.event.country,
        lat: result.event.lat,
        lon: result.event.lon,
        impact_level: result.event.impactLevel,
        category: result.event.category,
        summary: result.event.summary,
        sentiment: result.event.sentiment,
        forex_impacts: result.event.forexImpacts || [],
        confidence_score: result.event.confidenceScore / 100, // Convert 0-100 to 0-1
        is_market_moving: result.event.isMarketMoving || false,
        expires_at: expiresAt,
        source_url: result.event.sourceUrl,
        created_by: 'ai-auto' as const,
      }
    }).filter(Boolean)

    if (eventsToInsert.length > 0) {
      const { data: insertedEvents, error } = await supabase
        .from('events')
        .insert(eventsToInsert)
        .select()

      if (error) {
        console.error('Failed to insert events:', error)
        return NextResponse.json(
          { error: 'Failed to save events', details: error.message },
          { status: 500 }
        )
      }

      console.log(`Successfully created ${insertedEvents.length} events`)

      // Log to deduplication table
      const dedupLogs = insertedEvents.map((event) => ({
        source_headline: event.headline,
        source_url: event.source_url,
        matched_event_id: event.id,
        action: 'created' as const,
      }))

      await supabase.from('event_dedup_log').insert(dedupLogs)

      // Update RSS sources last_polled_at
      if (dbSources && dbSources.length > 0) {
        await supabase
          .from('rss_sources')
          .update({ last_polled_at: new Date().toISOString() })
          .in('url', sources.map((s) => s.url))
      }

      return NextResponse.json({
        success: true,
        message: `Created ${insertedEvents.length} new events`,
        stats: {
          feeds: feeds.length,
          items: allItems.length,
          analyzed: analysisResults.length,
          created: insertedEvents.length,
        },
        events: insertedEvents.map((e) => ({
          id: e.id,
          headline: e.headline,
          impactLevel: e.impact_level,
        })),
      })
    }

    return NextResponse.json({
      success: true,
      message: 'No new events to create',
      stats: {
        feeds: feeds.length,
        items: allItems.length,
        analyzed: analysisResults.length,
        created: 0,
      },
    })
  } catch (error) {
    console.error('RSS poll error:', error)
    return NextResponse.json(
      {
        error: 'RSS poll failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
