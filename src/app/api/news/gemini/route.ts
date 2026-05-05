import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

import { SEED_EVENTS } from '@/lib/news/seedData'

// ── Category sanitizer — DB enforces strict check constraint ─────────────────
const VALID_CATEGORIES = new Set([
  'Geopolitical', 'Central Bank', 'Macro', 'Political',
  'Crisis', 'Sanctions', 'Earnings', 'Natural Disaster',
])

function sanitizeCategory(raw: string): string {
  if (VALID_CATEGORIES.has(raw)) return raw
  const r = (raw || '').toLowerCase()
  if (r.includes('bank') || r.includes('monetary') || r.includes('rate') || r.includes('fed') || r.includes('ecb') || r.includes('boj')) return 'Central Bank'
  if (r.includes('war') || r.includes('military') || r.includes('conflict') || r.includes('geo') || r.includes('terror') || r.includes('nuclear')) return 'Geopolitical'
  if (r.includes('sanction') || r.includes('embargo') || r.includes('tariff') || r.includes('trade')) return 'Sanctions'
  if (r.includes('disaster') || r.includes('earthquake') || r.includes('flood') || r.includes('hurricane') || r.includes('natural')) return 'Natural Disaster'
  if (r.includes('crisis') || r.includes('emergency') || r.includes('collapse')) return 'Crisis'
  if (r.includes('politic') || r.includes('election') || r.includes('government') || r.includes('diplomatic')) return 'Political'
  if (r.includes('earn') || r.includes('profit') || r.includes('corporate') || r.includes('stock')) return 'Earnings'
  return 'Macro' // safe fallback
}

let lastAttemptMs = 0
let lastSuccessMs = 0
let failureStreak = 0

const RETRY_GAP_MS   = 2 * 60 * 1000
const REFRESH_GAP_MS = 4 * 60 * 60 * 1000
const TARGET_EVENTS  = 20

export async function GET(request: NextRequest) {
  const cronSecret  = request.headers.get('x-cron-secret')
  const adminSecret = request.headers.get('x-admin-secret')
  const isDev       = process.env.NODE_ENV === 'development'
  const isForced    = request.nextUrl.searchParams.get('force') === '1'

  if (!isDev && cronSecret !== process.env.CRON_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const nowMs    = Date.now()
  const now      = new Date(nowMs)

  // ── Guard 1: 4-hour success cadence ──────────────────────────────────────
  if (!isForced && lastSuccessMs > 0 && nowMs - lastSuccessMs < REFRESH_GAP_MS) {
    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('expires_at', now.toISOString())

    if ((count ?? 0) >= TARGET_EVENTS) {
      const nextIn = Math.round((REFRESH_GAP_MS - (nowMs - lastSuccessMs)) / 60_000)
      return NextResponse.json({ success: true, skipped: true, message: `${count} events live. Next refresh in ~${nextIn}min` })
    }
  }

  // ── Guard 2: 2-minute retry gap (rate-limit safety) ───────────────────────
  if (!isForced && lastAttemptMs > 0 && nowMs - lastAttemptMs < RETRY_GAP_MS) {
    const waitSec = Math.round((RETRY_GAP_MS - (nowMs - lastAttemptMs)) / 1000)
    return NextResponse.json({ success: true, skipped: true, message: `Rate guard — retry in ${waitSec}s (streak: ${failureStreak})` })
  }

  // ── Build prompt ──────────────────────────────────────────────────────────
  const prompt = `You are a real-time geopolitical and financial markets intelligence analyst. Today is ${now.toUTCString()}.

Generate exactly 20 current global news events from the last 48 hours that significantly impact financial markets and geopolitical stability.

EXACTLY 5 events per impact tier — no more, no less:
• Critical (5): Active armed conflicts, financial system shocks, mass-casualty events
• High (5): Central bank decisions, major geopolitical escalations, large natural disasters
• Medium (5): Sanctions, significant political crises, major economic data releases
• Low (5): Diplomatic meetings, minor market moves, routine policy announcements

For EACH event, produce this EXACT JSON object with ALL fields populated:
{
  "headline": "Specific, informative headline describing exactly what happened — aim for 60-90 characters",
  "country": "Primary affected country full name",
  "lat": 48.8566,
  "lon": 2.3522,
  "impactLevel": "Critical",
  "category": "Geopolitical",
  "summary": "2-3 sentences: what happened, why it matters for markets, and what traders should watch. Be specific with numbers/percentages where possible. Max 300 chars.",
  "sentiment": "Negative market sentiment",
  "forexImpacts": [
    { "pair": "EUR/USD", "direction": -1, "magnitude": "Large", "movePercent": "-0.8%", "reasoning": "Risk-off flight from euro assets" },
    { "pair": "USD/JPY", "direction": -1, "magnitude": "Medium", "movePercent": "-0.5%", "reasoning": "Yen safe-haven demand" }
  ]
}

CRITICAL RULES — violations will make the data useless:
1. headline: NEVER use generic phrases like 'Ukraine War Escalates' or 'Fed Rate Hike'. Write the SPECIFIC event: e.g. 'Ukraine Strikes Russian Black Sea Fleet HQ in Sevastopol' or 'Fed Holds Rates at 5.5% Amid Cooling Jobs Data'
2. lat/lon: CITY-level coordinates where the event is physically happening. Never use 0,0.
3. forexImpacts: Critical/High events MUST have 2-3 forex pairs. Medium events: 1-2 pairs. Low events: 0-1 pairs. direction: 1 = pair price goes UP, -1 = goes DOWN
4. Geographic spread: events must span at least 5 different continents/regions
5. No two events at the same location
6. Use REAL ongoing situations: Russia-Ukraine war, Israel-Gaza conflict, India-Pakistan tensions, Fed/ECB/BOJ policy, China-Taiwan, Trump tariffs, OPEC cuts, commodity prices, EM currency crises

Return ONLY a raw JSON array of exactly 20 objects. No markdown fences, no explanation, no preamble.`

  // Record attempt BEFORE API calls
  lastAttemptMs = nowMs
  let responseText = ''
  let modelUsed    = ''

  // ── 1. Try Groq (primary — 14,400 RPD, no IP restrictions) ───────────────
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    const groqModels = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768']
    for (const model of groqModels) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 4096 }),
          signal: AbortSignal.timeout(30_000),
        })
        if (!res.ok) { console.warn(`[Groq] ${model} HTTP ${res.status}`); continue }
        const data = await res.json()
        responseText = data?.choices?.[0]?.message?.content || ''
        if (responseText) { modelUsed = `groq:${model}`; console.log(`[Groq] ✅ ${model} (${responseText.length} chars)`); break }
      } catch (e: any) { console.warn(`[Groq] ${model} error: ${e?.message?.slice(0, 80)}`) }
    }
  }

  // ── 2. Try Gemini (fallback) ───────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY
  if (!responseText && geminiKey) {
    const geminiModels = ['gemini-2.0-flash-lite', 'gemini-2.0-flash']
    for (const model of geminiModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`
        const res = await fetch(url, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 4096 } }),
          signal: AbortSignal.timeout(25_000),
        })
        if (!res.ok) { console.warn(`[Gemini] ${model} HTTP ${res.status}`); continue }
        const data = await res.json()
        responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (responseText) { modelUsed = `gemini:${model}`; console.log(`[Gemini] ✅ ${model} (${responseText.length} chars)`); break }
      } catch (e: any) { console.warn(`[Gemini] ${model} error: ${e?.message?.slice(0, 80)}`) }
    }
  }

  // ── 3. Seed fallback — globe is never empty ────────────────────────────────
  if (!responseText) {
    failureStreak++
    console.warn(`[News] All AI providers failed (streak: ${failureStreak}). Inserting seed events.`)
    await supabase.from('events').delete().eq('created_by', 'ai-auto')
    const seedRows = SEED_EVENTS.map(e => ({
      headline: e.headline, country: e.country, lat: e.lat, lon: e.lon,
      impact_level: e.impactLevel, category: e.category, summary: e.summary,
      sentiment: e.sentiment, forex_impacts: e.forexImpacts,
      confidence_score: e.impactLevel === 'Critical' ? 90 : e.impactLevel === 'High' ? 80 : 70,
      is_market_moving: e.impactLevel === 'Critical' || e.impactLevel === 'High',
      published_at: now.toISOString(),
      expires_at:   new Date(nowMs + 48 * 3_600_000).toISOString(),
      source_url: null, created_by: 'ai-auto' as const,
    }))
    const { data: seeded } = await supabase.from('events').insert(seedRows).select('id')
    console.log(`[News] 🌱 Seeded ${seeded?.length ?? 0} fallback events`)
    return NextResponse.json({ success: true, seeded: seeded?.length ?? 0, failureStreak, retryInSec: Math.round(RETRY_GAP_MS / 1000) })
  }

  // ── Parse JSON ────────────────────────────────────────────────────────────
  let rawEvents: any[] = []
  try {
    const clean = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) rawEvents = JSON.parse(match[0])
    if (!Array.isArray(rawEvents)) rawEvents = []
  } catch {
    failureStreak++
    return NextResponse.json({ error: 'JSON parse failed', raw: responseText.slice(0, 200) }, { status: 500 })
  }

  // ── Enforce 5 per tier ────────────────────────────────────────────────────
  const TIERS = ['Critical', 'High', 'Medium', 'Low'] as const
  const buckets: Record<string, any[]> = { Critical: [], High: [], Medium: [], Low: [] }
  for (const e of rawEvents) {
    const t = e.impactLevel as string
    if (!buckets[t] || buckets[t].length >= 5) continue
    if (!e.headline || !e.country || typeof e.lat !== 'number' || typeof e.lon !== 'number') continue
    if (Math.abs(e.lat) < 0.01 && Math.abs(e.lon) < 0.01) continue
    buckets[t].push(e)
  }
  const validated = TIERS.flatMap(t => buckets[t])
  console.log(`[News] Parsed ${validated.length} events via ${modelUsed} (C:${buckets.Critical.length} H:${buckets.High.length} M:${buckets.Medium.length} L:${buckets.Low.length})`)

  if (validated.length === 0) {
    failureStreak++
    return NextResponse.json({ error: 'No valid events parsed', raw: responseText.slice(0, 200) }, { status: 500 })
  }

  // ── Replace DB events ─────────────────────────────────────────────────────
  await supabase.from('events').delete().eq('created_by', 'ai-auto')
  const rows = validated.map(e => ({
    headline: String(e.headline).slice(0, 100), country: String(e.country).slice(0, 100),
    lat: Number(e.lat), lon: Number(e.lon), impact_level: e.impactLevel,
    category: sanitizeCategory(e.category || 'Geopolitical'), summary: String(e.summary || '').slice(0, 500),
    sentiment: String(e.sentiment || 'Neutral market sentiment'),
    forex_impacts: Array.isArray(e.forexImpacts) ? e.forexImpacts : [],
    confidence_score: e.impactLevel === 'Critical' ? 90 : e.impactLevel === 'High' ? 80 : 70,
    is_market_moving: e.impactLevel === 'Critical' || e.impactLevel === 'High',
    published_at: now.toISOString(), expires_at: new Date(nowMs + 48 * 3_600_000).toISOString(),
    source_url: null, created_by: 'ai-auto' as const,
  }))

  const { data: inserted, error: insertErr } = await supabase.from('events').insert(rows).select('id, headline, impact_level, country, lat, lon')
  if (insertErr) { failureStreak++; return NextResponse.json({ error: insertErr.message }, { status: 500 }) }

  lastSuccessMs = Date.now()
  failureStreak = 0
  console.log(`[News] ✅ Inserted ${inserted?.length ?? 0} AI events via ${modelUsed}. Next refresh in 4h.`)

  return NextResponse.json({
    success: true, model: modelUsed, created: inserted?.length ?? 0, nextRefreshIn: '4 hours',
    tiers: { Critical: buckets.Critical.length, High: buckets.High.length, Medium: buckets.Medium.length, Low: buckets.Low.length },
    events: inserted?.map((e: any) => ({ id: e.id, headline: e.headline, impactLevel: e.impact_level, country: e.country, lat: e.lat, lon: e.lon })),
  })
}
