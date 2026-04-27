'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { WatchlistItem } from '@/store/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/** Manage user watchlist items */
export function useWatchlist() {
  const { data, error, isLoading, mutate } = useSWR<WatchlistItem[]>(
    '/api/watchlist',
    fetcher,
    { revalidateOnFocus: false }
  )

  async function addToWatchlist(type: WatchlistItem['type'], value: string) {
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value }),
    })
    mutate()
  }

  async function removeFromWatchlist(id: string) {
    await fetch('/api/watchlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    mutate()
  }

  function isWatched(type: WatchlistItem['type'], value: string): boolean {
    return (data ?? []).some((item) => item.type === type && item.value === value)
  }

  return {
    items: data ?? [],
    isLoading,
    error,
    addToWatchlist,
    removeFromWatchlist,
    isWatched,
  }
}
