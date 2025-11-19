import OpenAI from 'openai'

// Use a placeholder key during build, validate at runtime
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder-for-build',
})

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'placeholder-for-build') {
    throw new Error('OPENAI_API_KEY is not set')
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw new Error('Failed to generate embedding')
  }
}
