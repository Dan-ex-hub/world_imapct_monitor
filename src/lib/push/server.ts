/**
 * Server-side push notification utilities
 * Uses web-push library to send notifications to subscribed users
 */

import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

// Configure VAPID details only if all required env vars are present
const hasVapidConfig = !!(
  process.env.VAPID_SUBJECT &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
)

if (hasVapidConfig) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )
  } catch (error) {
    console.warn('Failed to configure VAPID details:', error)
  }
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
  tag?: string
}

/**
 * Send push notification to a specific user
 * Fetches all subscriptions for the user and sends to each
 */
export async function notifyUser(userId: string, payload: PushPayload): Promise<{
  sent: number
  failed: number
  expired: number
}> {
  if (!hasVapidConfig) {
    console.warn('Push notifications not configured (missing VAPID keys)')
    return { sent: 0, failed: 0, expired: 0 }
  }

  const supabase = await createClient()

  // Fetch all push subscriptions for this user
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error || !subscriptions || subscriptions.length === 0) {
    console.log(`No push subscriptions found for user ${userId}`)
    return { sent: 0, failed: 0, expired: 0 }
  }

  let sent = 0
  let failed = 0
  let expired = 0

  // Send to each subscription
  for (const sub of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url || process.env.NEXT_PUBLIC_APP_URL || 'https://impactglobe.com',
          icon: payload.icon || '/globe.svg',
          badge: payload.badge || '/globe.svg',
          tag: payload.tag || 'impactglobe-notification',
        })
      )

      sent++
      console.log(`Push notification sent to user ${userId} (endpoint: ${sub.endpoint.slice(0, 50)}...)`)
    } catch (error: any) {
      // Handle expired subscriptions (410 Gone)
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`Subscription expired for user ${userId}, removing from database`)
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', sub.id)
        expired++
      } else {
        console.error(`Failed to send push notification to user ${userId}:`, error)
        failed++
      }
    }
  }

  return { sent, failed, expired }
}

/**
 * Send push notification to multiple users
 */
export async function notifyUsers(userIds: string[], payload: PushPayload): Promise<{
  totalSent: number
  totalFailed: number
  totalExpired: number
}> {
  let totalSent = 0
  let totalFailed = 0
  let totalExpired = 0

  for (const userId of userIds) {
    const result = await notifyUser(userId, payload)
    totalSent += result.sent
    totalFailed += result.failed
    totalExpired += result.expired
  }

  return { totalSent, totalFailed, totalExpired }
}

/**
 * Notify users who are watching a specific country
 */
export async function notifyWatchingCountry(country: string, payload: PushPayload): Promise<void> {
  const supabase = await createClient()

  // Find all users watching this country
  const { data: watchlistItems } = await supabase
    .from('watchlist')
    .select('user_id')
    .eq('type', 'country')
    .eq('value', country)

  if (!watchlistItems || watchlistItems.length === 0) {
    console.log(`No users watching country: ${country}`)
    return
  }

  const userIds = [...new Set(watchlistItems.map((item) => item.user_id))]
  console.log(`Notifying ${userIds.length} users watching ${country}`)

  await notifyUsers(userIds, payload)
}

/**
 * Notify users who are watching a specific forex pair
 */
export async function notifyWatchingForexPair(pair: string, payload: PushPayload): Promise<void> {
  const supabase = await createClient()

  // Find all users watching this forex pair
  const { data: watchlistItems } = await supabase
    .from('watchlist')
    .select('user_id')
    .eq('type', 'forex_pair')
    .eq('value', pair)

  if (!watchlistItems || watchlistItems.length === 0) {
    console.log(`No users watching forex pair: ${pair}`)
    return
  }

  const userIds = [...new Set(watchlistItems.map((item) => item.user_id))]
  console.log(`Notifying ${userIds.length} users watching ${pair}`)

  await notifyUsers(userIds, payload)
}

/**
 * Notify users watching a country or any affected forex pairs
 * Called after a new event is published
 */
export async function notifyEventWatchers(event: {
  country: string
  headline: string
  forexImpacts?: Array<{ pair: string }>
}): Promise<void> {
  if (!hasVapidConfig) {
    console.warn('Push notifications not configured, skipping notifications')
    return
  }

  // Notify country watchers
  await notifyWatchingCountry(event.country, {
    title: `New Event: ${event.country}`,
    body: event.headline,
    tag: `event-${event.country}`,
  })

  // Notify forex pair watchers
  if (event.forexImpacts && event.forexImpacts.length > 0) {
    for (const impact of event.forexImpacts) {
      await notifyWatchingForexPair(impact.pair, {
        title: `${impact.pair} Impact`,
        body: event.headline,
        tag: `forex-${impact.pair}`,
      })
    }
  }
}
