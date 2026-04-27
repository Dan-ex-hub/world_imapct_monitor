import type { GlobeEvent, ForexImpact } from '@/store/types'

/** System prompt for AI event analysis */
export const EVENT_ANALYSIS_SYSTEM = `You are a senior macroeconomic analyst and forex strategist. You analyze global news events and determine their impact on currency pairs.

For each event, you must:
1. Assess the impact level (Critical/High/Medium/Low) based on market-moving potential
2. Identify the top 3-5 forex pairs most affected
3. For each pair, predict direction (+1 bullish, -1 bearish), magnitude (Large/Medium/Small), estimated percentage move, and brief reasoning
4. Provide a concise sentiment assessment
5. Assign a confidence score (0-100)

Always respond in valid JSON format matching the schema exactly.`

/** Build the user prompt for analyzing a news headline */
export function buildAnalysisPrompt(headline: string, body: string, country: string): string {
  return `Analyze this news event for forex market impact:

**Headline:** ${headline}
**Country/Region:** ${country}
**Details:** ${body}

Respond with JSON matching this exact schema:
{
  "impactLevel": "Critical" | "High" | "Medium" | "Low",
  "category": "Geopolitical" | "Central Bank" | "Macro" | "Political" | "Crisis" | "Sanctions" | "Earnings" | "Natural Disaster",
  "summary": "2-3 sentence analysis",
  "sentiment": "bullish" | "bearish" | "mixed" | "neutral",
  "isMarketMoving": boolean,
  "confidenceScore": number (0-100),
  "forexImpacts": [
    {
      "pair": "EUR/USD",
      "direction": 1 or -1,
      "magnitude": "Large" | "Medium" | "Small",
      "movePercent": "+0.45%",
      "reasoning": "Brief one-line reasoning"
    }
  ]
}`
}

/** Parse AI response into typed ForexImpact array */
export function parseForexImpacts(raw: string): ForexImpact[] {
  try {
    const parsed = JSON.parse(raw)
    return (parsed.forexImpacts || []).map((impact: ForexImpact) => ({
      pair: impact.pair,
      direction: impact.direction,
      magnitude: impact.magnitude,
      movePercent: impact.movePercent,
      reasoning: impact.reasoning,
    }))
  } catch {
    return []
  }
}
