'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, AlertCircle, Loader2, CheckCircle } from 'lucide-react'

export default function SignupForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setIsLoading(false)
        return
      }

      // Success - show confirmation message
      setSuccess(true)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-impact-medium/30 bg-impact-medium/10 p-4">
          <CheckCircle className="h-6 w-6 flex-shrink-0 text-impact-medium" />
          <div>
            <h3 className="font-semibold text-text-primary">Check your email</h3>
            <p className="mt-1 text-sm text-text-secondary">
              We've sent you a confirmation link to <strong>{email}</strong>. Click the link to
              verify your account and start using ImpactGlobe.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="w-full rounded-lg border border-border-default bg-bg-elevated py-2.5 font-semibold text-text-primary transition-colors hover:bg-bg-card"
        >
          Go to Sign In
        </button>
      </div>
    )
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
        <p className="mt-1 text-xs text-text-muted">Must be at least 8 characters</p>
      </div>

      {/* Confirm password field */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-medium text-text-secondary"
        >
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </button>

      {/* Sign in link */}
      <p className="text-center text-sm text-text-muted">
        Already have an account?{' '}
        <a href="/login" className="font-medium text-impact-medium hover:underline">
          Sign in
        </a>
      </p>

      {/* Free notice */}
      <p className="text-center text-xs text-text-muted">
        ImpactGlobe is 100% free. No credit card required.
      </p>
    </form>
  )
}
