import GlobeWrapper from '@/components/globe/GlobeWrapper'

export default function Home() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-bg-primary">
      {/* 3D Globe */}
      <GlobeWrapper />

      {/* Gradient vignette overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(5,10,20,0.7) 100%)',
        }}
      />

      {/* Title overlay — will be replaced by TopBar in Phase 2 */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <h1 className="font-display text-xl font-bold tracking-tight">
          Impact<span className="text-impact-critical">Globe</span>
        </h1>
        <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-env-wind animate-pulse" />
          LIVE
        </div>
      </div>

      {/* Phase indicator — bottom center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-text-muted text-xs font-mono">
          <div className="w-2 h-2 rounded-full bg-impact-medium animate-pulse-slow" />
          PHASE 1 — GLOBE RENDERER ACTIVE
        </div>
      </div>
    </main>
  )
}
