import Anthropic from '@anthropic-ai/sdk'

/** Shared Anthropic client instance for server-side usage */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
