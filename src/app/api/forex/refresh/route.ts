import { NextRequest, NextResponse } from 'next/server'
import {
  MAJOR_PAIRS,
  getForexQuotesBatch,
  getForexTimeSeries,
  calculate24hChange,
  extractSparklineData,
} from '@/lib/forex/twelvedata'
import { updateForexPairsCacheBatch, isCacheStale } from '@/lib/forex/cache'

/**
 * GET /api/forex/refresh
 * Refresh forex data from Twelve Data API
 * Protected by CRON_SECRET for Vercel Cron Jobs
 * Can also be called manually with admin secret
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret or admin secret
    const cronSecret = request.headers.get('x-cron-secret')
    const adminSecret = request.headers.get('x-admin-secret')

    if (
      cronSecret !== process.env.CRON_SECRET &&
      adminSecret !== process.env.ADMIN_SECRET
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if cache is stale (avoid unnecessary API calls)
    const stale = await isCacheStale(5) // 5 minutes threshold

    if (!stale && !request.nextUrl.searchParams.get('force')) {
      return NextResponse.json({
        success: true,
        message: 'Cache is fresh, skipping refresh',
        cached: true,
      })
    }

    console.log('Refreshing forex data from Twelve Data API...')

    // Fetch quotes for all major pairs (batch request)
    const quotes = await getForexQuotesBatch(MAJOR_PAIRS)

    console.log(`Fetched ${Object.keys(quotes).length} forex quotes`)

    // Fetch time series for sparklines (sequential to respect rate limits)
    const pairsData = []

    for (const pair of MAJOR_PAIRS) {
      try {
        const quote = quotes[pair]

        if (!quote) {
          console.warn(`No quote data for ${pair}, skipping`)
          continue
        }

        // Fetch 24h time series for sparkline
        const timeSeries = await getForexTimeSeries(pair, '1h', 24)

        const { change, changePercent } = calculate24hChange(timeSeries.values)
        const sparklineData = extractSparklineData(timeSeries.values)

        pairsData.push({
          pair,
          currentPrice: parseFloat(quote.close),
          change24h: change,
          changePercent24h: changePercent,
          sparklineData,
        })

        // Small delay to respect rate limits (8 requests/minute = 7.5s between requests)
        await new Promise((resolve) => setTimeout(resolve, 8000))
      } catch (error) {
        console.error(`Failed to fetch time series for ${pair}:`, error)
        // Continue with other pairs even if one fails
      }
    }

    if (pairsData.length === 0) {
      return NextResponse.json(
        { error: 'No forex data could be fetched' },
        { status: 500 }
      )
    }

    // Update cache
    await updateForexPairsCacheBatch(pairsData)

    console.log(`Successfully updated ${pairsData.length} forex pairs in cache`)

    return NextResponse.json({
      success: true,
      message: `Updated ${pairsData.length} forex pairs`,
      pairs: pairsData.map((p) => ({
        pair: p.pair,
        currentPrice: p.currentPrice,
        changePercent24h: p.changePercent24h,
      })),
    })
  } catch (error) {
    console.error('Forex refresh error:', error)
    return NextResponse.json(
      {
        error: 'Forex refresh failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
