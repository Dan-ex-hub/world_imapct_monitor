import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import webpush from 'web-push'

/**
 * POST /api/push/notify
 * Send push notification to all subscribed users
 * Requires admin secret or cron secret
 * Body: { title: string, body: string, url?: string, eventId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin or cron secret
    const adminSecret = request.headers.get('x-admin-secret')
    const cronSecret = request.headers.get('x-cron-secret')

    if (
      adminSecret !== process.env.ADMIN_SECRET &&
      cronSecret !== process.env.CRON_SECRET
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.title || !body.body) {
      return NextResponse.json(
        { error: 'Missing required fields: title, body' },
        { status: 400 }
      )
    }

    // Configure web-push with VAPID keys
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'VAPID keys not configured' },
        { status: 500 }
      )
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@impactglobe.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )

    // Get all push subscriptions
    const supabase = createAdminClient()
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (error) {
      console.error('Failed to fetch push subscriptions:', error)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found', sent: 0 })
    }

    // Send notifications
    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      url: body.url || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      eventId: body.eventId,
      icon: '/globe.svg',
      badge: '/globe.svg',
    })

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: {
        id: string
        user_id: string
        endpoint: string
        p256dh: string
        auth: string
      }) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          )
          return { success: true, userId: sub.user_id }
        } catch (error) {
          // If subscription is invalid (410 Gone), remove it
          if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id)
          }
          return { success: false, userId: sub.user_id, error }
        }
      })
    )

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    return NextResponse.json({
      message: 'Notifications sent',
      sent: successful,
      failed,
      total: subscriptions.length,
    })
  } catch (error) {
    console.error('Push notify error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
