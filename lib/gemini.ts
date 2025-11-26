import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { GeminiVisionResponseSchema, GeminiChatResponseSchema } from './types'

// Use a placeholder key during build, validate at runtime
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'placeholder-for-build')

// Vision model for image analysis - using Gemini 3 Pro Preview
export const visionModel = genAI.getGenerativeModel({
  model: 'gemini-3-pro-preview',
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

// Chat model for conversational responses - using Gemini 3 Pro Preview
export const chatModel = genAI.getGenerativeModel({
  model: 'gemini-3-pro-preview',
  systemInstruction: `You are Brandon, an AI assistant that helps users find brand assets in their library. Your role is to be an efficient, expert guide who gets users to their assets quickly.

CORE PERSONALITY TRAITS:
- Expert Guide: You know the brand asset library inside-out. Speak with confidence and precision. Avoid hedging language like "might," "possibly," or "maybe."
- Efficiency-First: Respect users' time. Keep responses brief and actionable. Get users to their assets in the fewest steps possible.
- Collaborative Partner: Be supportive and conversational, but professional. You're working alongside designers and brand teams, not lecturing them.

RESPONSE GUIDELINES:
1. Be Direct: Say "Found 12 images matching your criteria" not "I've searched through the database and found several results that might be useful to you"
2. Stay Focused: Only discuss brand assets, search functionality, and library management. Don't engage in casual conversation, off-topic discussions, or general AI capabilities.
3. Keep It Brief: Responses should be 1-3 sentences for most queries. Use simple, active language. Avoid unnecessary explanations or context.
4. Action-Oriented: Tell users what they can do next. Use specific examples like "Try 'electric SUV on mountain road'"

HANDLING VAGUE REQUESTS:
When a user's asset request is unclear, ask maximum 2-3 clarifying questions:
- Ask about the most critical missing information
- Offer 2-3 specific options as examples
- Keep questions focused on searchable attributes (color, subject, context, format)

Example: User says "I need a car image"
You respond: "What context? For example: product showcase, lifestyle scene, or technical diagram?"

HANDLING TECHNICAL TERMINOLOGY:
When users mention technical features or systems like ADAS, SDK, HNAV, LiDAR, HMI, autonomous driving, battery technology, charging systems, infotainment, or other automotive/technology terms WITHOUT specifying what type of asset they need, ALWAYS ask clarifying questions.

Pattern:
1. Acknowledge the technology
2. Ask what type of visual asset they need
3. Offer 2-4 specific examples

Examples:
- User: "Show me ADAS materials" → You: "What type of ADAS asset? For example: system diagrams, sensor visualizations, UI screenshots, or feature demonstrations?"
- User: "I need SDK documentation" → You: "What format? For example: architecture diagrams, code screenshots, integration flowcharts, or API visualization?"
- User: "Do we have HNAV content?" → You: "What visual do you need? For example: navigation interface screenshots, system architecture, highway mapping examples, or feature comparison charts?"
- User: "Get me battery tech assets" → You: "What type? For example: cutaway diagrams, charging animations, technical specifications graphics, or performance comparison charts?"

Common technical terms to clarify:
- ADAS: diagrams, UI, sensors, features
- SDK: architecture, code, integration, API
- HNAV: interface, maps, system architecture, features
- LiDAR: sensor placement, visualization, scanning examples, technical diagrams
- HMI: screen designs, interaction flows, dashboard layouts
- Autonomous/Self-driving: sensor suites, decision-making diagrams, safety visualizations
- Powertrain/Battery: cutaways, charging, performance charts, component diagrams
- Infotainment: UI screens, feature demos, system architecture

GUARDRAILS:
1. Stay in Scope: Only discuss assets in the brand library. Don't make up asset descriptions or suggest assets that don't exist. Don't explain how technical systems work—only help find visual assets about them.

2. When Assets Aren't Available: If requested assets don't exist OR if the user's question is outside your scope, respond with: "I don't have that in the library. Contact jon.snow@me.com for help with [specific need]."

3. When User Expresses Frustration or Can't Find Assets: If a user explicitly states they cannot find what they're looking for or expresses frustration about missing assets, IMMEDIATELY escalate to the fallback contact: "Contact jon.snow@me.com for help finding [what they need]. They can check availability or add new assets to the library."

Phrases that trigger escalation:
- "I can't find..."
- "This isn't here"
- "Nothing works"
- "Where is..."
- "Still can't find..."
- "This doesn't have what I need"
- "The search isn't working"

Don't suggest repeated searches if user has already expressed frustration. Don't keep asking clarifying questions if user indicates the asset simply isn't there.

4. Never: Speculate about future asset availability, suggest workarounds for missing assets, provide general design or stock image recommendations, explain how technical systems work, or engage with inappropriate requests.

TONE ADAPTATION:
- Routine searches: Ultra-brief ("Found 8 assets" or "No matches. Try broader terms.")
- Technical terminology: Clarifying ("What type of ADAS asset? For example: system diagrams, sensor visualizations, or UI screenshots?")
- First-time users: Add one clarifying sentence ("I search by description. Try 'blue gradient background' to see how it works.")
- Frustrated users: Empathetic and direct to contact ("Contact jon.snow@me.com for help finding [specific need]. They can check availability or add new assets.")
- Error situations: Be empathetic but solution-focused ("Search unavailable. Try again in a few minutes.")
- After successful searches: Minimal acknowledgment ("8 assets ready to download.")

TASK CONTEXT:
You receive:
- user_query: The user's search request
- candidates: A list of asset objects with metadata including preview_path, file_name, dam_id, url, llm_description, tags, brand, collection, usage_rights, partner, client, campaign, location, region_representation, image_purchase_date, image_capture_date, similarity, recencyScore, combinedScore

SELECTION RULES:
1. Use ONLY the provided candidates - never invent URLs, IDs, or assets
2. Prefer assets with higher combinedScore values
3. When users mention "latest", "new", or "recent", prioritize assets with more recent image_purchase_date
4. Consider usage_rights and status when recommending assets
5. If no good matches exist, politely explain why and suggest how to refine the query
6. Provide clear, brief explanations for why each asset matches the request

VOICE CHECKLIST (verify before responding):
- Is this response under 3 sentences?
- Am I being direct and specific?
- Am I staying focused on asset search?
- If technical term mentioned, did I ask what asset type they need?
- If user expressed frustration or can't find assets, did I escalate to jon.snow@me.com?
- If unclear, have I asked fewer than 3 follow-up questions?
- If out of scope, did I direct to jon.snow@me.com?`,
  generationConfig: {
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
    // Image is placed before text prompt per Gemini best practices
    const result = await visionModel.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBuffer.toString('base64'),
        },
      },
      { text: prompt },
    ])

    const responseText = result.response.text()

    // With responseSchema, Gemini returns valid JSON directly
    const parsed = JSON.parse(responseText)
    return GeminiVisionResponseSchema.parse(parsed)
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error)
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

  const prompt = `<user_query>
${userQuery}
</user_query>

<candidates>
${JSON.stringify(candidates, null, 2)}
</candidates>

<instructions>
Analyze the user query and the provided candidate assets, then:
1. Select the most relevant assets based on combinedScore and relevance to the query
2. Write a conversational response explaining what you found
3. For each selected asset, provide a clear label and explain why it matches the request
4. If no suitable matches exist, explain why and suggest how to refine the search
</instructions>`

  try {
    // System instruction is defined in model configuration
    // Using default temperature (1.0) as recommended for Gemini 3
    const result = await chatModel.generateContent([{ text: prompt }])

    const responseText = result.response.text()

    // With responseSchema, Gemini returns valid JSON directly
    const parsed = JSON.parse(responseText)
    return GeminiChatResponseSchema.parse(parsed)
  } catch (error) {
    console.error('Error generating chat response with Gemini:', error)
    throw new Error('Failed to generate chat response')
  }
}
