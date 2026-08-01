import type { AppState } from './stateMachine'

export class OracleLog {
  private host: HTMLElement

  constructor(host: HTMLElement) {
    this.host = host
  }

  append(line: string): void {
    const p = document.createElement('p')
    p.className = 'oracle-line'
    p.textContent = line
    this.host.appendChild(p)
    this.host.scrollTop = this.host.scrollHeight
  }

  clear(): void {
    this.host.innerHTML = ''
  }

  logBoot(keyGenTimeMs: number): void {
    const keyGenSec = (keyGenTimeMs / 1000).toFixed(1)
    this.append('[SYSTEM] TFHE-rs WebAssembly loading...')
    this.append(`[SYSTEM] Generating FHE key pair — please wait...`)
    this.append(`[SYSTEM] Key generation complete: ${keyGenSec}s`)
    this.append('[SYSTEM] Programmable bootstrapping: ACTIVE (noise refreshed per block op)')
    this.append('[SYSTEM] No fixed circuit-depth wall — but every block op pays a bootstrap cost.')
    this.append('[SYSTEM] Compressed server key derived (evaluation only, cannot decrypt).')
    this.append('[SYSTEM] READY. True FHE enabled.')
  }

  logWake(): void {
    this.append('[SYSTEM] Oracle server is waking up (cold start)...')
    this.append('[SYSTEM] This may take up to 60 seconds on free tier.')
    this.append('[SYSTEM] Waking...')
  }

  logTransmit(ctA: string, ctB: string, digestA: string, digestB: string): void {
    // Real trace: byte counts and per-ciphertext fingerprints derived from the
    // ACTUAL ciphertexts, so the log differs every run (probabilistic encryption).
    const bytesA = Math.round((ctA.length * 3) / 4)
    const bytesB = Math.round((ctB.length * 3) / 4)
    this.append(`[WIRE]   POST /compute/add — ct_a ${bytesA}B, ct_b ${bytesB}B`)
    this.append(`[WIRE]   ct_a fp:${digestA}  ct_b fp:${digestB}`)
    this.append('[WIRE]   Compressed server key attached (evaluation key, cannot decrypt).')
  }

  logComputing(
    responseTimeMs: number,
    scheme: string,
    bootstrapping: string,
    resultDigest: string
  ): void {
    this.append('[ORACLE] FheUint8 addition — programmable bootstrapping on every block op')
    this.append(`[ORACLE] Scheme: ${scheme} (Zama AI)`)
    this.append(`[ORACLE] Bootstrapping: ${bootstrapping}`)
    this.append('[ORACLE] Plaintext accessed: FALSE (no client key present)')
    this.append(`[ORACLE] Result ciphertext serialized. fp:${resultDigest}`)
    this.append(`[WIRE]   Response received in ${responseTimeMs}ms (cost of one homomorphic add)`)
  }

  logDecrypt(): void {
    this.append('[CLIENT] Decrypting result locally...')
    this.append('[CLIENT] Secret key never left this browser.')
  }

  logError(message: string): void {
    this.append(`[ERROR] ${message}`)
  }

  logState(state: AppState): void {
    if (state === 'WAKING_ORACLE') {
      this.logWake()
    }
  }
}
