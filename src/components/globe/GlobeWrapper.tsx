'use client'

import dynamic from 'next/dynamic'

// Dynamically import GlobeRenderer with no SSR — Three.js requires browser APIs
const GlobeRenderer = dynamic(() => import('./GlobeRenderer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border border-border-default animate-pulse-slow" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-impact-critical/10 to-env-wind/10 animate-spin-slow" />
        </div>
        <span className="text-text-muted text-xs font-mono tracking-wider">
          INITIALIZING GLOBE...
        </span>
      </div>
    </div>
  ),
})

export default function GlobeWrapper() {
  return (
    <div className="absolute inset-0 z-0">
      <GlobeRenderer />
    </div>
  )
}
