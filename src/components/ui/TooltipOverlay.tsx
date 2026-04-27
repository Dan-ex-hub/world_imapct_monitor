'use client'

import { useGlobeStore } from '@/store/useGlobeStore'
import { ImpactBadge } from './ImpactBadge'
import { CategoryBadge } from './CategoryBadge'
import { formatDistanceToNow } from 'date-fns'

export function TooltipOverlay() {
  const hoveredEventId = useGlobeStore((s) => s.hoveredEventId)
  const tooltipPosition = useGlobeStore((s) => s.tooltipPosition)
  const events = useGlobeStore((s) => s.events)

  const event = events.find((e) => e.id === hoveredEventId)

  if (!event || !tooltipPosition) return null

  return (
    <div
      className="pointer-events-none fixed z-50 animate-fade-in"
      style={{
        left: tooltipPosition.x + 16,
        top: tooltipPosition.y + 16,
      }}
    >
      <div className="max-w-sm rounded-lg border border-border-default bg-bg-card/95 p-4 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="font-display text-sm font-semibold leading-tight text-text-primary">
            {event.headline}
          </h3>
          <ImpactBadge level={event.impactLevel} size="sm" />
        </div>

        {/* Metadata */}
        <div className="mb-3 flex items-center gap-2">
          <CategoryBadge category={event.category} size="sm" />
          <span className="text-xs text-text-muted">
            {formatDistanceToNow(new Date(event.publishedAt), { addSuffix: true })}
          </span>
        </div>

        {/* Summary */}
        <p className="mb-3 text-xs leading-relaxed text-text-secondary">
          {event.summary.slice(0, 150)}
          {event.summary.length > 150 ? '...' : ''}
        </p>

        {/* Country */}
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="font-medium">📍</span>
          <span>{event.country}</span>
        </div>

        {/* Click hint */}
        <div className="mt-3 border-t border-border-subtle pt-2 text-xs text-text-muted">
          Click for full analysis
        </div>
      </div>
    </div>
  )
}
