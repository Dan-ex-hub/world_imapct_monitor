'use client'

import { useEffect, useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { useGlobeStore } from '@/store/useGlobeStore'
import { useWatchlist } from '@/hooks/useWatchlist'

interface WatchlistButtonProps {
  eventId: string
}

export function WatchlistButton({ eventId }: WatchlistButtonProps) {
  const user = useGlobeStore((s) => s.user)
  const { isInWatchlist, getWatchlistItem, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const [isLoading, setIsLoading] = useState(false)

  const isWatched = isInWatchlist('event', eventId)
  const watchlistItem = getWatchlistItem('event', eventId)

  const handleToggle = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login'
      return
    }

    setIsLoading(true)
    try {
      if (isWatched && watchlistItem) {
        await removeFromWatchlist(watchlistItem.id)
      } else {
        await addToWatchlist('event', eventId)
      }
    } catch (error) {
      console.error('Failed to toggle watchlist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isWatched
          ? 'bg-impact-high/10 text-impact-high hover:bg-impact-high/20'
          : 'bg-bg-elevated text-text-secondary hover:bg-bg-card hover:text-text-primary'
      } disabled:opacity-50`}
      title={user ? (isWatched ? 'Remove from watchlist' : 'Add to watchlist') : 'Sign in to add to watchlist'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Star className={`h-4 w-4 ${isWatched ? 'fill-current' : ''}`} />
      )}
      {isWatched ? 'Watching' : 'Watch'}
    </button>
  )
}
