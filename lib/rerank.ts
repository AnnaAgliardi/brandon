/**
 * Reranking abstraction that sits between Pinecone retrieval and the final
 * LLM selection step.
 *
 * The default implementation is INTERNAL: it blends semantic similarity with a
 * query-aware recency signal. An external provider can be dropped in later via
 * the `RERANKER` env var (the `cognee` slot is reserved for a future
 * https://docs.cognee.ai integration) without touching the chat route.
 */

const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000

// A Pinecone match: { score, metadata: {...} }
export interface PineconeMatch {
  score?: number
  metadata?: Record<string, any>
}

// A ranked candidate: all metadata fields spread, plus scoring fields.
export interface RankedCandidate {
  [key: string]: any
  similarity: number
  recencyScore: number
  combinedScore: number
}

// Words that signal the user actually cares about recency.
const RECENCY_TERMS =
  /\b(latest|newest|new|recent|recently|current|currently|up[\s-]?to[\s-]?date|this (week|month|year)|last (week|month|year))\b/i

/** Whether a query implies the user wants recent assets. */
export function queryImpliesRecency(query: string): boolean {
  return RECENCY_TERMS.test(query)
}

/**
 * Internal reranker. Semantic similarity dominates by default; recency only
 * blends in meaningfully when the query asks for it. Assets with a missing
 * purchase date get a neutral (0) recency score so they rank on similarity
 * alone instead of being wrongly floated to the top.
 */
export function internalRerank(query: string, matches: PineconeMatch[]): RankedCandidate[] {
  const now = Date.now()
  const recencyMatters = queryImpliesRecency(query)
  // High alpha = semantic-dominant. Only lean on recency for temporal queries.
  const alpha = recencyMatters ? Number(process.env.RERANK_ALPHA ?? 0.7) : 0.95

  const ranked: RankedCandidate[] = matches.map((match) => {
    const metadata = match.metadata ?? {}
    const similarity = match.score ?? 0

    const purchaseDateMs =
      typeof metadata.image_purchase_date === 'number' ? metadata.image_purchase_date : null
    const recencyScore =
      purchaseDateMs === null ? 0 : Math.max(0, 1 - (now - purchaseDateMs) / THREE_YEARS_MS)

    const combinedScore = alpha * similarity + (1 - alpha) * recencyScore

    return { ...metadata, similarity, recencyScore, combinedScore }
  })

  ranked.sort((a, b) => b.combinedScore - a.combinedScore)
  return ranked
}

/**
 * Future external reranker slot (Cognee). Not implemented yet — falls back to
 * the internal reranker so behaviour is unchanged until the adapter is built.
 */
async function cogneeRerank(query: string, matches: PineconeMatch[]): Promise<RankedCandidate[]> {
  console.warn('Cognee reranker is not implemented yet; using internal reranker.')
  return internalRerank(query, matches)
}

/** Rerank retrieved candidates using the configured provider. */
export async function rerankCandidates(
  query: string,
  matches: PineconeMatch[]
): Promise<RankedCandidate[]> {
  const provider = (process.env.RERANKER ?? 'internal').toLowerCase()

  switch (provider) {
    case 'cognee':
      return cogneeRerank(query, matches)
    case 'internal':
    default:
      return internalRerank(query, matches)
  }
}
