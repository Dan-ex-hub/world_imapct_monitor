import { analyzeWithGemini } from '@/lib/gemini/client'
import {
  EVENT_ANALYSIS_SYSTEM_PROMPT,
  EVENT_ANALYSIS_USER_PROMPT,
  EVENT_DEDUP_SYSTEM_PROMPT,
  EVENT_DEDUP_USER_PROMPT,
} from '@/lib/anthropic/prompts'
import type { GlobeEvent } from '@/store/types'
import type { RSSItem } from '@/lib/rss/parser'

/**
 * AI-powered event generation from news articles
 * Uses Google Gemini (free tier) to analyze news and generate structured event data
 */

export interface EventAnalysisResult {
  shouldDisplay: boolean
  event?: Omit<GlobeEvent, 'id' | 'publishedAt' | 'expiresAt' | 'createdBy'>
  reason?: string
}

export interface DeduplicationResult {
  isDuplicate: boolean
  confidence: number
  reasoning: string
}

/**
 * Analyze a news item and generate an event if significant
 */
export async function analyzeNewsItem(item: RSSItem): Promise<EventAnalysisResult> {
  try {
    const userPrompt = EVENT_ANALYSIS_USER_PROMPT(
      item.title,
      item.contentSnippet || item.content,
      item.link
    )

    // Combine system and user prompts for Gemini
    const fullPrompt = `${EVENT_ANALYSIS_SYSTEM_PROMPT}\n\n${userPrompt}`

    const response = await analyzeWithGemini(fullPrompt)

    // Extract JSON from response (Gemini sometimes wraps it in markdown)
    let jsonText = response.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    // Parse JSON response
    const result = JSON.parse(jsonText) as EventAnalysisResult

    // Validate the response structure
    if (!result.shouldDisplay) {
      return { shouldDisplay: false, reason: result.reason }
    }

    if (!result.event) {
      throw new Error('Event data missing in response')
    }

    // Add source URL if not present
    if (!result.event.sourceUrl) {
      result.event.sourceUrl = item.link
    }

    return result
  } catch (error) {
    console.error('Failed to analyze news item:', error)
    throw new Error(`Event analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if a news headline is a duplicate of an existing event
 */
export async function checkDuplicate(
  newHeadline: string,
  existingHeadline: string
): Promise<DeduplicationResult> {
  try {
    const userPrompt = EVENT_DEDUP_USER_PROMPT(newHeadline, existingHeadline)
    
    // Combine system and user prompts for Gemini
    const fullPrompt = `${EVENT_DEDUP_SYSTEM_PROMPT}\n\n${userPrompt}`

    const response = await analyzeWithGemini(fullPrompt)

    // Extract JSON from response
    let jsonText = response.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    const result = JSON.parse(jsonText) as DeduplicationResult

    return result
  } catch (error) {
    console.error('Failed to check duplicate:', error)
    // On error, assume not duplicate to avoid losing events
    return {
      isDuplicate: false,
      confidence: 0,
      reasoning: 'Deduplication check failed',
    }
  }
}

/**
 * Batch analyze multiple news items
 * Returns only items that should be displayed
 */
export async function analyzeNewsItemsBatch(
  items: RSSItem[],
  maxConcurrent = 3
): Promise<EventAnalysisResult[]> {
  const results: EventAnalysisResult[] = []

  // Process in batches to avoid rate limiting
  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent)
    const batchResults = await Promise.allSettled(
      batch.map((item) => analyzeNewsItem(item))
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        console.error('Batch analysis error:', result.reason)
      }
    }

    // Small delay between batches to respect rate limits
    if (i + maxConcurrent < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results.filter((r) => r.shouldDisplay)
}

/**
 * Deduplicate events against existing events
 * Returns events that are not duplicates
 */
export async function deduplicateEvents(
  newEvents: EventAnalysisResult[],
  existingEvents: Pick<GlobeEvent, 'headline'>[]
): Promise<EventAnalysisResult[]> {
  const uniqueEvents: EventAnalysisResult[] = []

  for (const newEvent of newEvents) {
    if (!newEvent.event) continue

    let isDuplicate = false

    // Check against existing events
    for (const existingEvent of existingEvents) {
      const dedupResult = await checkDuplicate(
        newEvent.event.headline,
        existingEvent.headline
      )

      if (dedupResult.isDuplicate && dedupResult.confidence > 70) {
        isDuplicate = true
        console.log(
          `Duplicate detected: "${newEvent.event.headline}" matches "${existingEvent.headline}" (confidence: ${dedupResult.confidence}%)`
        )
        break
      }
    }

    if (!isDuplicate) {
      uniqueEvents.push(newEvent)
    }
  }

  return uniqueEvents
}
