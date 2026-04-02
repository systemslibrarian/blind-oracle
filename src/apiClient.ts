import { API_URL } from './config'

export interface ComputeResult {
  ctResultBase64: string
  operation: string
  plaintextAccessed: boolean
  responseTimeMs: number
}

export class OracleOfflineError extends Error {}
export class InvalidCiphertextError extends Error {}
export class OracleInitializingError extends Error {}
export class OracleTimeoutError extends Error {}

const DEFAULT_TIMEOUT_MS = 45000

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new OracleTimeoutError('Oracle request timed out'))
    }, timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeout)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeout)
        reject(error)
      })
  })
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await withTimeout(fetch(`${API_URL}/health`), 8000)
    if (!response.ok) {
      return false
    }
    const json = (await response.json()) as { seal?: string }
    return json.seal === 'ready'
  } catch {
    return false
  }
}

export async function computeAdd(
  ctABase64: string,
  ctBBase64: string,
  onWake?: () => void
): Promise<ComputeResult> {
  const started = performance.now()
  let wakeCalled = false

  const wakeTimer = window.setTimeout(() => {
    wakeCalled = true
    onWake?.()
  }, 5000)

  try {
    const response = await withTimeout(
      fetch(`${API_URL}/compute/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ctA: ctABase64, ctB: ctBBase64 })
      }),
      DEFAULT_TIMEOUT_MS
    )

    const elapsed = Math.round(performance.now() - started)
    const json = (await response.json()) as {
      ctResult?: string
      operation?: string
      plaintextAccessed?: boolean
      error?: string
    }

    if (!response.ok) {
      if (response.status === 503) {
        throw new OracleInitializingError(json.error ?? 'Oracle initializing')
      }
      if (response.status === 400) {
        throw new InvalidCiphertextError(json.error ?? 'Invalid ciphertext')
      }
      throw new OracleOfflineError(json.error ?? 'Oracle unavailable')
    }

    if (!json.ctResult || !json.operation) {
      throw new OracleOfflineError('Malformed compute response')
    }

    return {
      ctResultBase64: json.ctResult,
      operation: json.operation,
      plaintextAccessed: Boolean(json.plaintextAccessed),
      responseTimeMs: elapsed
    }
  } catch (error) {
    if (error instanceof OracleTimeoutError) {
      throw error
    }

    if (error instanceof InvalidCiphertextError || error instanceof OracleInitializingError) {
      throw error
    }

    if (error instanceof TypeError) {
      throw new OracleOfflineError('Network error while contacting Oracle')
    }

    throw error
  } finally {
    clearTimeout(wakeTimer)
    if (wakeCalled) {
      onWake?.()
    }
  }
}
