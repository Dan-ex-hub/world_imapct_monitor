import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * Get Gemini model instance
 * Using gemini-1.5-flash for fast, free analysis
 */
export function getGeminiModel() {
  return genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    },
  })
}

/**
 * Analyze text with Gemini
 */
export async function analyzeWithGemini(prompt: string): Promise<string> {
  const model = getGeminiModel()
  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text()
}
