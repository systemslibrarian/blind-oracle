import { API_URL } from './config'

export interface ComputeResult {
  ctResultBase64: string
  operation: string
  plaintextAccessed: boolean
  scheme: string
  bootstrapping: string
  responseTimeMs: number
}

export class OracleOfflineError extends Error {}
export class InvalidCiphertextError extends Error {}
export class OracleInitializingError extends Error {}
export class OracleTimeoutError extends Error {}

const DEFAULT_TIMEOUT_MS = 120000 // Increased for FHE computation

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
    const json = (await response.json()) as { fhe?: boolean; status?: string }
    return json.fhe === true || json.status === 'ok'
  } catch {
    return false
  }
}

export async function computeAdd(
  serverKeyB64: string,
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
        body: JSON.stringify({
          serverKey: serverKeyB64,
          ctA: ctABase64,
          ctB: ctBBase64
        })
      }),
      DEFAULT_TIMEOUT_MS
    )

    const elapsed = Math.round(performance.now() - started)

    if (!response.ok) {
      let errorMsg: string | undefined
      try {
        const errBody = (await response.json()) as { error?: string }
        errorMsg = errBody.error
      } catch {
        // Response body is not JSON (e.g. Render proxy HTML error page)
      }
      if (response.status === 503) {
        throw new OracleInitializingError(errorMsg ?? 'Oracle initializing')
      }
      if (response.status === 400) {
        throw new InvalidCiphertextError(errorMsg ?? 'Invalid ciphertext')
      }
      throw new OracleOfflineError(errorMsg ?? `Oracle unavailable (HTTP ${response.status})`)
    }

    const json = (await response.json()) as {
      ctResult?: string
      operation?: string
      plaintextAccessed?: boolean
      scheme?: string
      bootstrapping?: string
    }

    if (!json.ctResult || !json.operation) {
      throw new OracleOfflineError('Malformed compute response')
    }

    return {
      ctResultBase64: json.ctResult,
      operation: json.operation,
      plaintextAccessed: Boolean(json.plaintextAccessed),
      scheme: json.scheme ?? 'TFHE-rs',
      bootstrapping: json.bootstrapping ?? 'gate_bootstrapping_per_operation',
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
