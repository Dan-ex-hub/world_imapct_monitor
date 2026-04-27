import type { Metadata } from 'next'
import { Inter, Space_Grotesk, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
})

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ImpactGlobe — Real-time Geopolitical Risk Monitor',
  description:
    'Interactive 3D globe tracking impactful global news, forex market movements, and live environmental data. Real-time geopolitical risk monitoring with AI-powered analysis.',
  keywords: [
    'geopolitical risk',
    'forex impact',
    'global events',
    '3D globe',
    'real-time news',
    'environmental data',
    'air quality',
    'earthquakes',
    'wildfires',
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ background: '#050a14', color: '#f1f0e8', margin: 0 }}
      >
        {children}
      </body>
    </html>
  )
}
