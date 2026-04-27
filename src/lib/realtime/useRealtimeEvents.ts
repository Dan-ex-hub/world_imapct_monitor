'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGlobeStore } from '@/store/useGlobeStore'
import type { GlobeEvent } from '@/store/types'

/**
 * Subscribe to real-time event inserts/updates from Supabase.
 * Automatically adds new events to the store.
 */
export function useRealtimeEvents() {
  const addEvent = useGlobeStore((s) => s.addEvent)
  const setConnected = useGlobeStore((s) => s.setConnected)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('globe-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          const event = payload.new as GlobeEvent
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
          const event = payload.new as GlobeEvent
          addEvent(event)
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [addEvent, setConnected])
}
