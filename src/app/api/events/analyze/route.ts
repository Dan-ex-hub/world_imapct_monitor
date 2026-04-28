import { NextRequest, NextResponse } from 'next/server'
import { analyzeNewsItem } from '@/lib/ai/eventGenerator'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/events/analyze
 * Analyze a news headline/article using AI and generate event data
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

    // Validate input
    if (!body.title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      )
    }

    // Analyze the news item
    const result = await analyzeNewsItem({
      title: body.title,
      link: body.link || '',
      pubDate: body.pubDate || new Date().toISOString(),
      content: body.content,
      contentSnippet: body.contentSnippet,
    })

    if (!result.shouldDisplay) {
      return NextResponse.json({
        shouldDisplay: false,
        reason: result.reason || 'Event not significant enough',
      })
    }

    return NextResponse.json({
      shouldDisplay: true,
      event: result.event,
    })
  } catch (error) {
    console.error('Event analysis error:', error)
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
