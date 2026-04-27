'use client'

import useSWR from 'swr'
import { useGlobeStore } from '@/store/useGlobeStore'
import type { GlobeEvent } from '@/store/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/** Fetch events and sync to Zustand store */
export function useEvents() {
  const setEvents = useGlobeStore((s) => s.setEvents)
  const filters = useGlobeStore((s) => s.filters)

  const params = new URLSearchParams()
  if (filters.timeRange) params.set('timeRange', filters.timeRange)
  if (filters.searchQuery) params.set('q', filters.searchQuery)

  const { data, error, isLoading, mutate } = useSWR<GlobeEvent[]>(
    `/api/events?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 30_000, // 30 seconds
      revalidateOnFocus: false,
      onSuccess: (events) => setEvents(events),
    }
  )

  return { events: data ?? [], error, isLoading, refresh: mutate }
}
