# ImpactGlobe Build State

## Current Phase: 8 — Historical Playback & Advanced Features (COMPLETE)

## Completed
- [x] Phase 0: Foundation, folder structure, types, utils, env setup
- [x] Phase 1: Three.js Globe Renderer + Environmental Layer System
- [x] Phase 2: UI Shell & All Interface Components
- [x] Phase 3: Database, Supabase & Realtime ✅
- [x] Phase 4: AI Pipeline & News Analysis ✅
- [x] Phase 5: Forex Data Integration ✅
- [x] Phase 6: Environmental Data Integration ✅
- [x] Phase 7: Auth, Watchlist & Push Notifications (FREE) ✅
- [x] Phase 8: Historical Playback & Advanced Features ✅

## Phase 8 Details (COMPLETE)
### Task 8.1: Historical Playback (FREE) ✅
- **usePlayback.ts hook**: Complete playback system
  - `enterPlayback()`: Fetches last 48h events including expired
  - `exitPlayback()`: Restores live events
  - `setSpeed(1|2|5|10)`: Playback speed control
  - `seekTo(date)`: Jump to specific time
  - Auto-advance with configurable speed
  - Pause/play controls
- **PlaybackControls.tsx**: Updated with full controls
  - Timeline scrubber with progress bar
  - Play/pause/restart buttons
  - Speed selector (1x, 2x, 5x, 10x)
  - Current time display
  - Exit playback button
- **Events API**: Added `include_expired=true` parameter support

### Task 8.2: CSV Export (FREE) ✅
- **API Route**: `/api/events/export`
  - Exports events as CSV with all fields
  - Respects current filters (category, impact, time range)
  - Proper CSV escaping for quotes
  - Filename includes current date
  - No authentication required (FREE)
- **FilterBar**: Added "Export CSV" button
  - Downloads CSV file directly
  - Shows loading state during export
  - Error handling

### Task 8.3: URL Param Filter Sync ✅
- **FilterBar.tsx**: Complete URL synchronization
  - Reads URL params on mount
  - Updates URL on filter changes (router.replace)
  - Shareable URLs: `/?category=Geopolitical&impact=Critical&timeRange=24h&q=Japan`
  - No history pollution (uses replace, not push)
  - Supports: category, impact, timeRange, search query

### Task 8.4: Clear Filters & Playback Button ✅
- **Clear filters button**: Appears when filters active
  - Resets all filters to defaults
  - Updates URL params
- **Playback button**: Added to FilterBar
  - Triggers `enterPlayback()` from store
  - FREE access (no ProGate)

### Task 8.5: Onboarding Flow ✅
- **OnboardingFlow.tsx**: 3-step welcome flow
  - Step 1: Welcome + globe interaction
  - Step 2: Filter bar explanation
  - Step 3: Sign up CTA
  - Progress dots indicator
  - Skip button + Escape key support
  - localStorage persistence (`hasSeenOnboarding`)
  - Backdrop blur effect
  - Animated transitions

### Task 8.6: SEO & Metadata ✅
- **layout.tsx**: Complete metadata
  - Title: "ImpactGlobe — Real-time Geopolitical Risk Monitor"
  - Description optimized for search
  - Keywords array
  - OpenGraph tags for social sharing
  - Twitter card metadata
  - Robots meta (index, follow)
  - Viewport configuration

## What Was REMOVED (per CLAUDE.md)
- ❌ ALL Stripe integration
- ❌ ALL ProGate components
- ❌ ALL plan tier checks
- ❌ `planTier`, `stripeCustomerId` from User type
- ✅ Everything is FREE — no paywalls, no billing

## Database Schema (Phase 3 + 7)
- `events` — News events with forex impacts
- `forex_cache` — Cached forex pair data
- `env_data_cache` — Environmental layer data cache
- `aqi_history` — AQI historical data for sparklines
- `users` — User accounts (email, created_at)
- `watchlist` — User watchlist items (country, forex_pair, event)
- `push_subscriptions` — Push notification subscriptions (endpoint, keys)

## Next Tasks
- Phase 9: Pre-Launch & Deployment
  - Vercel deployment
  - Production environment variables
  - Performance audit (Lighthouse)
  - Error monitoring (Sentry)
  - Pre-launch checklist

## Technical Notes
- **Next.js version:** 16.2.4
- **Tailwind version:** v4 (CSS-based config)
- **React version:** 19.2.4
- **Three.js version:** 0.184.0
- **Supabase Auth:** Email/password only (no OAuth yet)
- **Push Notifications:** Web Push API with VAPID keys
- **Build status:** Code complete, Google Fonts network issue (temporary)

## Last Updated
2026-04-28 (Phase 8 complete)
