import { NextResponse } from 'next/server'
import { getCachedForexPairs, getTopMovers } from '@/lib/forex/cache'

/**
 * GET /api/forex/pairs
 * Fetch forex pairs data (cached)
 * Query params:
 *   - top: number (optional) - Get top N movers only
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const topParam = searchParams.get('top')

    let pairs

    if (topParam) {
      const limit = parseInt(topParam, 10)
      if (isNaN(limit) || limit < 1 || limit > 20) {
        return NextResponse.json(
          { error: 'Invalid top parameter (must be 1-20)' },
          { status: 400 }
        )
      }
      pairs = await getTopMovers(limit)
    } else {
      pairs = await getCachedForexPairs()
    }

    return NextResponse.json(pairs, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Forex pairs API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch forex pairs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
