'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WatchlistItem } from '@/store/types'

/**
 * Hook for managing user watchlist
 * Requires authentication
 */
export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch watchlist on mount
  useEffect(() => {
    fetchWatchlist()
  }, [])

  const fetchWatchlist = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/watchlist')
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - clear items
          setItems([])
          setIsLoading(false)
          return
        }
        throw new Error('Failed to fetch watchlist')
      }

      const data = await response.json()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const addToWatchlist = async (
    type: 'country' | 'forex_pair' | 'event',
    value: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add to watchlist')
      }

      const newItem = await response.json()
      setItems((prev) => [newItem, ...prev])
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    }
  }

  const removeFromWatchlist = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove from watchlist')
      }

      setItems((prev) => prev.filter((item) => item.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    }
  }

  const isInWatchlist = (type: string, value: string): boolean => {
    return items.some((item) => item.type === type && item.value === value)
  }

  const getWatchlistItem = (type: string, value: string): WatchlistItem | undefined => {
    return items.find((item) => item.type === type && item.value === value)
  }

  return {
    items,
    isLoading,
    error,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    getWatchlistItem,
    refresh: fetchWatchlist,
  }
}
