'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGlobeStore } from '@/store/useGlobeStore'
import type { GlobeEvent } from '@/store/types'
import type { Database } from '@/types/database.types'

type EventRow = Database['public']['Tables']['events']['Row']

/**
 * Hook to subscribe to realtime event updates from Supabase
 * Automatically updates the Zustand store when events are inserted, updated, or deleted
 */
export function useRealtimeEvents() {
  const setEvents = useGlobeStore((s) => s.setEvents)
  const addEvent = useGlobeStore((s) => s.addEvent)
  const removeEvent = useGlobeStore((s) => s.removeEvent)

  useEffect(() => {
    const supabase = createClient()

    // Fetch initial events
    const fetchInitialEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('published_at', { ascending: false })

      if (error) {
        console.error('[Realtime] Failed to fetch initial events:', error)
        return
      }

      if (data) {
        const events = data.map(mapEventRowToGlobeEvent)
        setEvents(events)
        console.log(`[Realtime] Loaded ${events.length} initial events`)
      }
    }

    fetchInitialEvents()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('events-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          console.log('[Realtime] New event inserted:', payload.new)
          const event = mapEventRowToGlobeEvent(payload.new as EventRow)
          addEvent(event)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          console.log('[Realtime] Event updated:', payload.new)
          const event = mapEventRowToGlobeEvent(payload.new as EventRow)
          addEvent(event) // addEvent replaces if ID exists
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          console.log('[Realtime] Event deleted:', payload.old)
          removeEvent((payload.old as EventRow).id)
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
      })

    // Cleanup on unmount
    return () => {
      console.log('[Realtime] Unsubscribing from events channel')
      supabase.removeChannel(channel)
    }
  }, [setEvents, addEvent, removeEvent])
}

/**
 * Map database row to GlobeEvent type
 */
function mapEventRowToGlobeEvent(row: EventRow): GlobeEvent {
  return {
    id: row.id,
    headline: row.headline,
    country: row.country,
    lat: Number(row.lat),
    lon: Number(row.lon),
    impactLevel: row.impact_level,
    category: row.category,
    summary: row.summary,
    sentiment: row.sentiment,
    forexImpacts: (row.forex_impacts as any) || [],
    confidenceScore: Number(row.confidence_score),
    isMarketMoving: row.is_market_moving,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    sourceUrl: row.source_url || undefined,
    createdBy: row.created_by,
  }
}
