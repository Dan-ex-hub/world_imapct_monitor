import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-text-primary">
            🌍 ImpactGlobe
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Real-time global events on an interactive 3D globe
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-border-subtle bg-bg-surface/80 p-8 backdrop-blur-sm">
          <h2 className="mb-6 font-display text-2xl font-semibold text-text-primary">
            Sign In
          </h2>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
