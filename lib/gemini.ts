import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { GeminiVisionResponseSchema, GeminiChatResponseSchema } from './types'
import { withRetry, isRetryableGeminiError } from './retry'

// Use a placeholder key during build, validate at runtime
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'placeholder-for-build')

// Vision model for image analysis. Defaults to a free-tier multimodal Flash
// model so image analysis works without a paid Gemini plan (Gemini 3 Pro is not
// available on the free tier — its free-tier quota is 0, which returns 429).
// Override with GEMINI_VISION_MODEL if your account exposes a different id.
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash'
export const visionModel = genAI.getGenerativeModel({
  model: VISION_MODEL,
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING },
        subjects: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        mood: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        setting: {
          type: SchemaType.OBJECT,
          properties: {
            environment: { type: SchemaType.STRING },
            time_of_day: { type: SchemaType.STRING },
            weather: { type: SchemaType.STRING },
          },
          required: ['environment', 'time_of_day', 'weather'],
        },
        composition: {
          type: SchemaType.OBJECT,
          properties: {
            orientation: { type: SchemaType.STRING },
            shot_type: { type: SchemaType.STRING },
            focus: { type: SchemaType.STRING },
          },
          required: ['orientation', 'shot_type', 'focus'],
        },
        usage: {
          type: SchemaType.OBJECT,
          properties: {
            typical_channels: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            tone: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ['typical_channels', 'tone'],
        },
        keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      },
      required: ['summary', 'subjects', 'mood', 'setting', 'composition', 'usage', 'keywords'],
    },
  },
})

// Chat model for conversational responses.
// The asset-selection task (pick from ~10 candidates + write 1-3 sentences) does
// not need a reasoning model, so we default to a fast Flash model. Override with
// GEMINI_CHAT_MODEL if your account exposes a different id (e.g. gemini-2.5-flash).
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-flash-latest'
export const chatModel = genAI.getGenerativeModel({
  model: CHAT_MODEL,
  systemInstruction: `You are Brandon, an AI assistant helping users find brand assets quickly and efficiently.

PERSONALITY:
- Expert, confident, and direct - avoid hedging ("might", "possibly")
- Brief responses (1-3 sentences) with actionable guidance
- Professional but conversational

RESPONSE RULES:
1. Be Direct: "Found 12 images" not "I've searched and found several results that might be useful"
2. Stay Focused: Only discuss brand assets and search. No off-topic conversations.
3. Action-Oriented: Suggest next steps with specific examples

CLARIFYING VAGUE REQUESTS:
Ask 2-3 max questions about critical missing info. Offer specific options.
Example: "I need a car image" → "What context? Product showcase, lifestyle scene, or technical diagram?"

TECHNICAL TERMS (ADAS, SDK, HNAV, LiDAR, HMI, battery, infotainment, etc.):
Always ask what asset type they need with 2-4 examples.
Example: "Show me ADAS" → "What type? System diagrams, sensor visualizations, UI screenshots, or feature demos?"

ESCALATION:
- Assets don't exist or out of scope → "I don't have that. Contact jon.snow@me.com for help with [need]."
- User frustrated ("can't find", "nothing works", "where is") → Immediately escalate: "Contact jon.snow@me.com for help finding [need]. They can check availability or add assets."

NEVER:
- Make up assets or descriptions
- Explain how technical systems work (only help find visual assets)
- Suggest workarounds for missing assets
- Keep asking questions if user indicates asset isn't there

SELECTION RULES:
1. Use ONLY provided candidates - never invent URLs/IDs
2. Prefer higher combinedScore values
3. For "latest"/"new"/"recent" queries, prioritize recent image_purchase_date
4. Provide brief explanations for why each asset matches`,
  generationConfig: {
    // Low temperature for consistent, accurate selection on a structured task.
    temperature: Number(process.env.GEMINI_CHAT_TEMPERATURE ?? 0.3),
    responseMimeType: 'application/json',
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        assistant_message: { type: SchemaType.STRING },
        assets: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              dam_id: { type: SchemaType.STRING, nullable: true },
              file_name: { type: SchemaType.STRING, nullable: true },
              url: { type: SchemaType.STRING, nullable: true },
              preview_path: { type: SchemaType.STRING },
              label: { type: SchemaType.STRING },
              reason: { type: SchemaType.STRING },
            },
            required: ['id', 'preview_path', 'label', 'reason'],
          },
        },
      },
      required: ['assistant_message', 'assets'],
    },
  },
})

export async function analyzeImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<any> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'placeholder-for-build') {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const prompt = `<task>
Analyze this automotive/technology brand asset image and provide a comprehensive structured description.
</task>

<context>
This image is part of a Digital Asset Management system for automotive and technology brands. The description will be used for semantic search and asset discovery.
</context>

<instructions>
1. Write a detailed one-sentence summary capturing the essence of the image
2. Identify all primary and secondary subjects visible in the image
3. Describe the mood and emotional tone conveyed
4. Detail the setting including environment, time of day, and weather conditions
5. Analyze the composition including orientation, shot type, and focus
6. Suggest typical use channels and tone descriptors
7. Extract relevant keywords for search optimization
</instructions>

<guidelines>
- Be specific and detailed in descriptions
- Focus on automotive and technology industry contexts
- Use professional terminology appropriate for brand asset management
- Ensure keywords are relevant for search and discovery
</guidelines>

<format>
Provide a JSON response with the structure defined in the response schema.
</format>`

  try {
    // Image is placed before text prompt per Gemini best practices.
    // Retried with backoff so a transient free-tier 503 doesn't fail the upload.
    const result = await withRetry('vision', () =>
      visionModel.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBuffer.toString('base64'),
          },
        },
        { text: prompt },
      ])
    )

    const responseText = result.response.text()

    // With responseSchema, Gemini returns valid JSON directly
    const parsed = JSON.parse(responseText)
    return GeminiVisionResponseSchema.parse(parsed)
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error)
    if (isRetryableGeminiError(error)) {
      throw new Error('Image analysis is temporarily unavailable (high demand). Please try again in a moment.')
    }
    throw new Error('Failed to analyze image')
  }
}

export async function generateChatResponse(
  userQuery: string,
  candidates: any[]
): Promise<any> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'placeholder-for-build') {
    throw new Error('GEMINI_API_KEY is not set')
  }

  // Filter candidates to only essential fields to reduce token count
  const essentialCandidates = candidates.map(c => ({
    assetId: c.assetId,
    file_name: c.file_name,
    dam_id: c.dam_id,
    url: c.url,
    preview_path: c.preview_path,
    llm_description: c.llm_description,
    brand: c.brand,
    campaign: c.campaign,
    combinedScore: c.combinedScore,
    image_purchase_date: c.image_purchase_date,
  }))

  const prompt = `<user_query>
${userQuery}
</user_query>

<candidates>
${JSON.stringify(essentialCandidates)}
</candidates>

<instructions>
1. Select the most relevant assets based on combinedScore and query relevance
2. Write a brief conversational response
3. For each asset, provide a clear label and reason
4. If no matches, explain why and suggest refinements
</instructions>`

  try {
    // System instruction, model, and temperature are defined in model configuration.
    // Retried with backoff so a transient free-tier 503 doesn't fail the whole chat.
    const result = await withRetry('chat', () =>
      chatModel.generateContent([{ text: prompt }])
    )

    const responseText = result.response.text()

    // With responseSchema, Gemini returns valid JSON directly
    const parsed = JSON.parse(responseText)
    return GeminiChatResponseSchema.parse(parsed)
  } catch (error) {
    console.error('Error generating chat response with Gemini:', error)
    if (isRetryableGeminiError(error)) {
      throw new Error('Brandon is experiencing high demand right now. Please try again in a moment.')
    }
    throw new Error('Failed to generate chat response')
  }
}
