'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { useGlobeStore } from '@/store/useGlobeStore'

interface WatchlistButtonProps {
  eventId: string
}

export function WatchlistButton({ eventId }: WatchlistButtonProps) {
  const user = useGlobeStore((s) => s.user)
  const [isWatched, setIsWatched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login'
      return
    }

    setIsLoading(true)
    try {
      // API call will be implemented in Phase 7
      await new Promise((resolve) => setTimeout(resolve, 500))
      setIsWatched(!isWatched)
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
    >
      <Star className={`h-4 w-4 ${isWatched ? 'fill-current' : ''}`} />
      {isWatched ? 'Watching' : 'Watch'}
    </button>
  )
}
