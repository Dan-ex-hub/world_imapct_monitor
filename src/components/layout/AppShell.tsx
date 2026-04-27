'use client'

import { ReactNode } from 'react'
import TopBar from './TopBar'
import { ConnectionStatus } from '@/components/ui/ConnectionStatus'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      {/* Top navigation bar */}
      <TopBar />

      {/* Main content area - globe and overlays */}
      <main className="relative h-[calc(100vh-64px)] w-full">
        {children}
      </main>

      {/* Connection status indicator - bottom right */}
      <div className="fixed bottom-4 right-4 z-50">
        <ConnectionStatus />
      </div>
    </div>
  )
}
