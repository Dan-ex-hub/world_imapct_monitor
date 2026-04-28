'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useGlobeStore } from '@/store/useGlobeStore'
import { FilterBar } from '@/components/ui/FilterBar'
import Link from 'next/link'
import { User, LogOut } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function TopBar() {
  const router = useRouter()
  const events = useGlobeStore((s) => s.events)
  const setStoreUser = useGlobeStore((s) => s.setUser)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Load user session
  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setStoreUser({
          id: session.user.id,
          email: session.user.email!,
          createdAt: session.user.created_at,
        })
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setStoreUser({
          id: session.user.id,
          email: session.user.email!,
          createdAt: session.user.created_at,
        })
      } else {
        setStoreUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setStoreUser])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setShowUserMenu(false)
    router.push('/')
    router.refresh()
  }

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
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-card"
            >
              <User className="h-4 w-4" />
              <span className="max-w-[120px] truncate">{user.email}</span>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                {/* Menu */}
                <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-in rounded-lg border border-border-subtle bg-bg-surface shadow-2xl">
                  <div className="border-b border-border-subtle p-3">
                    <p className="text-xs font-medium text-text-muted">Signed in as</p>
                    <p className="mt-1 truncate text-sm font-semibold text-text-primary">
                      {user.email}
                    </p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
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
