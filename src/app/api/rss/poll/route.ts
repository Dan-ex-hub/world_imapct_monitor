import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  parseMultipleFeeds,
  filterNewItems,
  deduplicateItems,
} from "@/lib/rss/parser";
import { DEFAULT_RSS_SOURCES } from "@/lib/rss/sources";
import { analyzeWithGemini } from "@/lib/gemini/client";

/**
 * GET /api/rss/poll
 * Poll RSS feeds, analyze with Gemini AI, and create events.
 * Protected by CRON_SECRET or ADMIN_SECRET.
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret");
    const adminSecret = request.headers.get("x-admin-secret");

    if (
      cronSecret !== process.env.CRON_SECRET &&
      adminSecret !== process.env.ADMIN_SECRET
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();

    // ── 4-hour cache guard ─────────────────────────────────────────────────
    const fourHoursAgo = new Date(
      now.getTime() - 4 * 60 * 60 * 1000,
    ).toISOString();
    const { data: recent, count } = await supabase
      .from("events")
      .select("id, created_at", { count: "exact" })
      .gte("created_at", fourHoursAgo)
      .limit(1);

    if (count && count > 0 && recent?.[0]) {
      const ageMin = Math.round(
        (now.getTime() - new Date(recent[0].created_at).getTime()) / 60_000,
      );
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Events created ${ageMin}min ago — Gemini skipped (4h cache).`,
      });
    }

    // ── Fetch RSS sources ──────────────────────────────────────────────────
    const { data: dbSources } = await supabase
      .from("rss_sources")
      .select("*")
      .eq("is_active", true);

    const sources = dbSources?.length
      ? dbSources.map((s: any) => ({
          name: s.name,
          url: s.url,
          priority: s.priority || 3,
        }))
      : DEFAULT_RSS_SOURCES;

    const feeds = await parseMultipleFeeds(
      sources.map((s: { url: string }) => s.url),
    );
    let allItems = feeds.flatMap((f) => f.items);
    allItems = filterNewItems(
      allItems,
      new Date(now.getTime() - 6 * 60 * 60 * 1000),
    );
    allItems = deduplicateItems(allItems);

    if (allItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new items",
        stats: { created: 0 },
      });
    }

    // Top 12 most recent items
    const items = allItems
      .sort(
        (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
      )
      .slice(0, 12);

    // ── Build Gemini prompt ────────────────────────────────────────────────
    const headlines = items.map((it, i) => `${i + 1}. ${it.title}`).join("\n");

    const prompt = `You are a financial and geopolitical news analyst. Analyze these headlines and extract the 3-5 most market-moving global events.

HEADLINES:
${headlines}

Return ONLY a valid JSON array (no markdown, no explanation). Each element must have exactly these fields:
{
  "headline": "string — concise title",
  "country": "string — primary country affected",
  "lat": number,
  "lon": number,
  "impactLevel": "Critical" | "High" | "Medium" | "Low",
  "category": "Geopolitical" | "Central Bank" | "Macro" | "Political" | "Crisis" | "Sanctions" | "Earnings" | "Natural Disaster",
  "summary": "string — 2-3 sentence explanation of market impact",
  "sentiment": "string — one sentence on market sentiment",
  "isMarketMoving": boolean,
  "forexImpacts": [{ "pair": "EUR/USD", "direction": 1 or -1, "magnitude": "Large"|"Medium"|"Small", "movePercent": "string", "reasoning": "string" }]
}

Only include genuinely significant market-moving events. Return [] if none qualify.`;

    let analysisText = "";
    try {
      analysisText = await analyzeWithGemini(prompt);
    } catch (err) {
      console.error("[RSS Poll] Gemini error:", err);
      return NextResponse.json(
        { success: false, error: "AI analysis failed" },
        { status: 500 },
      );
    }

    // ── Parse JSON from Gemini response ───────────────────────────────────
    let events: any[] = [];
    try {
      // Strip markdown fences if present
      const clean = analysisText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      events = JSON.parse(clean);
      if (!Array.isArray(events)) events = [];
    } catch {
      console.error(
        "[RSS Poll] Failed to parse Gemini JSON:",
        analysisText.slice(0, 200),
      );
      return NextResponse.json(
        { success: false, error: "Failed to parse AI response" },
        { status: 500 },
      );
    }

    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No significant events found",
        stats: { created: 0 },
      });
    }

    // ── Deduplicate against existing 24h events ────────────────────────────
    const { data: existing } = await supabase
      .from("events")
      .select("headline")
      .gte(
        "published_at",
        new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      );

    const existingHeadlines = new Set(
      (existing || []).map((e: any) => e.headline.toLowerCase()),
    );
    const unique = events.filter(
      (e) => !existingHeadlines.has(e.headline?.toLowerCase()),
    );

    if (unique.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All events already exist",
        stats: { created: 0 },
      });
    }

    // ── Insert ─────────────────────────────────────────────────────────────
    const rows = unique.map((e) => ({
      headline: e.headline,
      country: e.country,
      lat: e.lat,
      lon: e.lon,
      impact_level: e.impactLevel,
      category: e.category,
      summary: e.summary,
      sentiment: e.sentiment,
      forex_impacts: e.forexImpacts || [],
      confidence_score: 0.85,
      is_market_moving: e.isMarketMoving || false,
      published_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      created_by: "ai-auto" as const,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("events")
      .insert(rows)
      .select();

    if (insertErr) {
      console.error("[RSS Poll] Insert error:", insertErr);
      return NextResponse.json(
        { error: "Failed to save events" },
        { status: 500 },
      );
    }

    console.log(`[RSS Poll] ✅ Created ${inserted.length} events`);
    return NextResponse.json({
      success: true,
      message: `Created ${inserted.length} events`,
      stats: {
        feeds: feeds.length,
        items: items.length,
        created: inserted.length,
      },
    });
  } catch (error) {
    console.error("[RSS Poll] Fatal error:", error);
    return NextResponse.json({ error: "RSS poll failed" }, { status: 500 });
  }
}
