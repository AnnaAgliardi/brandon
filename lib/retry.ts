// Resilience helpers for transient upstream (Gemini) failures.
//
// Google's free-tier Gemini endpoints intermittently return 503 "model is
// currently experiencing high demand" (and occasionally 429/500) under load.
// A single un-retried call surfaces to the user as a hard "Failed to generate
// chat response" error, so we retry transient failures with exponential backoff.

// Status codes worth retrying. 404 is deliberately excluded: it means the model
// name is wrong or retired (e.g. gemini-3-pro-preview was removed), and retrying
// only delays surfacing the real, non-transient problem. 401/403/400 are
// likewise non-transient (auth / bad request).
const RETRYABLE_STATUS = new Set([429, 500, 503])

export function isRetryableGeminiError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status
  return typeof status === 'number' && RETRYABLE_STATUS.has(status)
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export interface RetryOptions {
  /** Total attempts including the first. Default 3. */
  tries?: number
  /** Base delay in ms; backoff is baseDelayMs * 2**attempt plus jitter. Default 500. */
  baseDelayMs?: number
}

/**
 * Run `fn`, retrying only on transient Gemini errors with exponential backoff
 * and jitter. Non-retryable errors (and the final attempt) propagate immediately.
 */
export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  { tries = 3, baseDelayMs = 500 }: RetryOptions = {}
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isRetryableGeminiError(error) || attempt === tries - 1) {
        throw error
      }
      const status = (error as { status?: number }).status
      const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250)
      console.warn(
        `${label}: transient Gemini ${status}, retrying in ${delay}ms (attempt ${attempt + 1}/${tries})`
      )
      await sleep(delay)
    }
  }
  // Unreachable (the loop either returns or throws), but satisfies the type checker.
  throw lastError
}
