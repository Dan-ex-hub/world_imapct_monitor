# World Impact Monitor

## Overview
World Impact Monitor is a real-time 3D and 2D geospatial visualization platform that tracks global events impacting financial markets, geopolitical stability, and the environment. It combines AI-driven news summarization with live environmental data layers to provide a holistic, unified view of the world's current state.

## Live Deployment
🌍 **[Live Deployment Link](https://world-imapct-monitor.vercel.app/)**



---

## Key Features
- **Interactive 3D Globe & 2D Map**: Seamlessly toggle between a highly immersive Three.js-powered 3D globe (with day/night shading and city lights) and a traditional Leaflet-based 2D map.
- **AI-Powered News Feed**: Automatically aggregates, sanitizes, and summarizes breaking geopolitical and macroeconomic news into actionable insights using LLMs (Groq/Gemini).
- **Live Environmental Overlays**: Heatmaps and discrete markers for real-time natural events:
  - Wind Speed & Direction (OpenMeteo)
  - Global Temperature Anomalies (OpenMeteo)
  - Sea Surface Temperatures
  - Global Air Quality Index & PM2.5 (OpenAQ)
  - Earthquakes (USGS)
  - Active Wildfires (NASA EONET)
  - Storms & Hurricanes (NASA EONET)
- **Real-Time Synchronization**: Leverages Supabase real-time WebSocket subscriptions to push new events and breaking news to connected clients instantly without polling.
- **Custom Filtering**: Granular filtering by event category, impact level (Critical, High, Medium, Low), and time range.

---

## Tech Stack
- **Framework**: Next.js (App Router, Server API Routes)
- **Visualization**: Three.js, React Three Fiber, Three-Globe, Leaflet
- **Styling**: Tailwind CSS, Lucide Icons
- **Database**: Supabase (PostgreSQL + Realtime WebSockets)
- **State Management**: Zustand
- **AI Processing**: Groq (Llama 3.3) / Google Gemini
- **Automation**: Vercel Cron Jobs

---

## Recommended Deployment Setup

Given the specific architecture of this project, **Vercel** is the most highly recommended frontend/backend deployment platform, natively paired with **Supabase** for the database layer.

### Why Vercel + Supabase?
1. **Cron Jobs are Native**: The project relies on periodic background tasks (`/api/cron/...` and `vercel.json`) to continuously poll APIs, fetch RSS feeds, perform AI summarization, and clean up expired data. Vercel automatically parses `vercel.json` and manages these schedules for free.
2. **Serverless APIs**: The heavy lifting of external data fetching is isolated in Next.js Serverless Functions, ensuring the client UI remains fast and lightweight without paying for a constantly running 24/7 Node.js server.
3. **Real-Time WebSockets**: Serverless platforms (like Vercel) are stateless and cannot hold persistent WebSocket connections. Supabase solves this natively by providing a persistent Postgres database with built-in real-time broadcasts that clients can subscribe to directly.

