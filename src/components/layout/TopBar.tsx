'use client'

// Top bar with logo, connection status, filters, auth (Phase 2)
export default function TopBar() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 glass px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-lg font-bold tracking-tight">
          Impact<span className="text-impact-critical">Globe</span>
        </h1>
      </div>
    </header>
  )
}
