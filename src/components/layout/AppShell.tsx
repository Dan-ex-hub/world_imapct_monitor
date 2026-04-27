'use client'

// App shell — main layout wrapper with globe, panels, ticker (Phase 2)
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-bg-primary">
      {children}
    </div>
  )
}
