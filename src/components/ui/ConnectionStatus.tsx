'use client'

import { useGlobeStore } from '@/store/useGlobeStore'

// Real-time connection status indicator
export default function ConnectionStatus() {
  const isConnected = useGlobeStore((s) => s.isConnected)

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-env-sea animate-pulse' : 'bg-impact-critical'
        }`}
      />
      <span className="text-text-muted text-xs font-mono">
        {isConnected ? 'LIVE' : 'OFFLINE'}
      </span>
    </div>
  )
}
