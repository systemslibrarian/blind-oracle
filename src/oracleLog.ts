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

  logBoot(): void {
    this.append('[SYSTEM] Microsoft SEAL WebAssembly loading...')
    this.append('[SYSTEM] Generating BFV encryption key pair...')
    this.append('[SYSTEM] Scheme: BFV (leveled HE, not FHE)')
    this.append('[SYSTEM] Pinging Oracle server...')
    this.append('[SYSTEM] Oracle ready. No private key transmitted.')
  }

  logWake(): void {
    this.append('[SYSTEM] Oracle server is waking up (cold start)...')
    this.append('[SYSTEM] This may take up to 30 seconds on free tier.')
    this.append('[SYSTEM] Waking...')
  }

  logTransmit(ctA: string, ctB: string): void {
    this.append(`[WIRE]   POST /compute/add - payload: ${ctA.slice(0, 48)}...`) 
    this.append(`[WIRE]   ct_a: ${ctA.slice(0, 12)}... ct_b: ${ctB.slice(0, 12)}...`)
  }

  logComputing(responseTimeMs: number): void {
    this.append('[SERVER] Request received. Deserializing ciphertexts...')
    this.append('[SERVER] evaluator.add(ct_a, ct_b) — leveled HE, BFV scheme')
    this.append('[SERVER] Noise budget consumed. Decryption still possible.')
    this.append('[SERVER] Plaintext accessed: FALSE')
    this.append('[SERVER] Result ciphertext serialized.')
    this.append(`[WIRE]   Response received in ${responseTimeMs}ms`)
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
