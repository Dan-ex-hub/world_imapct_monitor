'use client'

import { useGlobeStore } from '@/store/useGlobeStore'
import { ImpactBadge } from './ImpactBadge'

export function NewsTicker() {
  const events = useGlobeStore((s) => s.events)

  // Sort by publishedAt descending (most recent first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )

  // Duplicate events for seamless loop
  const tickerEvents = [...sortedEvents, ...sortedEvents]

  if (events.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-subtle bg-bg-surface/90 backdrop-blur-sm">
      <div className="relative h-12 overflow-hidden">
        {/* Ticker content */}
        <div className="absolute flex h-full items-center gap-8 animate-ticker">
          {tickerEvents.map((event, index) => (
            <div key={`${event.id}-${index}`} className="flex items-center gap-3 whitespace-nowrap">
              <ImpactBadge level={event.impactLevel} size="sm" />
              <span className="text-sm font-medium text-text-primary">{event.headline}</span>
              <span className="text-xs text-text-muted">•</span>
              <span className="text-xs text-text-muted">{event.country}</span>
              {/* Spacer */}
              <span className="inline-block w-8" />
            </div>
          ))}
        </div>

        {/* Gradient fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-bg-surface/90 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-bg-surface/90 to-transparent" />
      </div>
    </div>
  )
}
