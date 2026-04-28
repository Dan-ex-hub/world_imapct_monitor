import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/watchlist
 * Fetch user's watchlist items
 * Requires authentication
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Watchlist fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Watchlist API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/watchlist
 * Add item to watchlist
 * Requires authentication
 * Body: { type: 'country' | 'forex_pair' | 'event', value: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.type || !body.value) {
      return NextResponse.json(
        { error: 'Missing required fields: type, value' },
        { status: 400 }
      )
    }

    if (!['country', 'forex_pair', 'event'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: country, forex_pair, or event' },
        { status: 400 }
      )
    }

    // Check if already in watchlist
    const { data: existing } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', body.type)
      .eq('value', body.value)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Item already in watchlist' },
        { status: 409 }
      )
    }

    // Add to watchlist
    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        user_id: user.id,
        type: body.type,
        value: body.value,
      })
      .select()
      .single()

    if (error) {
      console.error('Watchlist insert error:', error)
      return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Watchlist POST error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/watchlist
 * Remove item from watchlist
 * Requires authentication
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
    }

    // Delete from watchlist (ensure user owns it)
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', body.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Watchlist delete error:', error)
      return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Watchlist DELETE error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
