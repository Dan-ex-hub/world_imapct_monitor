'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
        return
      }

      // Success - redirect to home
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-impact-critical/30 bg-impact-critical/10 p-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-impact-critical" />
          <p className="text-sm text-text-primary">{error}</p>
        </div>
      )}

      {/* Email field */}
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-text-secondary">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="w-full rounded-lg border border-border-default bg-bg-elevated py-2.5 pl-10 pr-4 text-text-primary placeholder-text-muted transition-colors focus:border-impact-medium focus:outline-none focus:ring-2 focus:ring-impact-medium/20 disabled:opacity-50"
            placeholder="you@example.com"
          />
        </div>
      </div>

      {/* Password field */}
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-text-secondary">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="w-full rounded-lg border border-border-default bg-bg-elevated py-2.5 pl-10 pr-4 text-text-primary placeholder-text-muted transition-colors focus:border-impact-medium focus:outline-none focus:ring-2 focus:ring-impact-medium/20 disabled:opacity-50"
            placeholder="••••••••"
          />
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-impact-medium py-2.5 font-semibold text-white transition-colors hover:bg-impact-medium/90 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Sign up link */}
      <p className="text-center text-sm text-text-muted">
        Don't have an account?{' '}
        <a href="/signup" className="font-medium text-impact-medium hover:underline">
          Sign up
        </a>
      </p>
    </form>
  )
}
