'use client'

import { useGlobeStore } from '@/store/useGlobeStore'
import { FilterBar } from '@/components/ui/FilterBar'
import Link from 'next/link'

export default function TopBar() {
  const events = useGlobeStore((s) => s.events)
  const user = useGlobeStore((s) => s.user)

  return (
    <header className="relative z-40 flex h-16 items-center justify-between border-b border-border-subtle bg-bg-surface/80 px-6 backdrop-blur-sm">
      {/* Logo and live indicator */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <h1 className="font-display text-xl font-bold text-text-primary">
            Impact<span className="text-impact-critical">Globe</span>
          </h1>
        </Link>
        
        <div className="flex items-center gap-2 rounded-full bg-impact-critical/10 px-3 py-1">
          <div className="h-2 w-2 animate-pulse rounded-full bg-impact-critical" />
          <span className="text-xs font-medium uppercase tracking-wide text-impact-critical">
            Live
          </span>
        </div>
      </div>

      {/* Center - Filter bar */}
      <div className="flex-1 px-8">
        <FilterBar />
      </div>

      {/* Right side - Event count and auth */}
      <div className="flex items-center gap-6">
        {/* Event counter */}
        <div className="flex items-center gap-2 rounded-lg bg-bg-card px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-env-wind" />
          <span className="text-sm font-medium text-text-secondary">
            {events.length} EVENTS TRACKED
          </span>
        </div>

        {/* Auth buttons */}
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">{user.email}</span>
            <button
              onClick={() => useGlobeStore.getState().setUser(null)}
              className="rounded-lg bg-bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-elevated"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-impact-medium px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-impact-medium/80"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
