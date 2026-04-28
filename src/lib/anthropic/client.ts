import Anthropic from '@anthropic-ai/sdk'

/**
 * Anthropic Claude client for AI-powered event analysis
 * Uses Claude Sonnet 4 for high-quality, fast responses
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

/**
 * Model to use for all requests
 * Claude Sonnet 4 (2025-05-14) - Latest model with best performance
 */
export const MODEL = 'claude-sonnet-4-20250514'

/**
 * Max tokens for responses
 */
export const MAX_TOKENS = 4096

/**
 * Helper to make Claude API calls with consistent settings
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number
    maxTokens?: number
  }
) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: options?.maxTokens || MAX_TOKENS,
    temperature: options?.temperature ?? 1.0,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  const textContent = response.content.find((block) => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  return textContent.text
}
