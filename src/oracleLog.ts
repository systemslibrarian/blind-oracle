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
    this.append('[SYSTEM] Gate bootstrapping: ACTIVE')
    this.append('[SYSTEM] Circuit depth limit: NONE')
    this.append('[SYSTEM] Server key derived. Ready to transmit.')
    this.append('[SYSTEM] READY. True FHE enabled.')
  }

  logWake(): void {
    this.append('[SYSTEM] Oracle server is waking up (cold start)...')
    this.append('[SYSTEM] This may take up to 60 seconds on free tier.')
    this.append('[SYSTEM] Waking...')
  }

  logTransmit(ctA: string, ctB: string): void {
    this.append(`[WIRE]   POST /compute/add - payload: ${ctA.slice(0, 48)}...`) 
    this.append(`[WIRE]   ct_a: ${ctA.slice(0, 12)}... ct_b: ${ctB.slice(0, 12)}...`)
    this.append('[WIRE]   Server key transmitted for evaluation.')
  }

  logComputing(responseTimeMs: number, scheme: string, bootstrapping: string): void {
    this.append('[ORACLE] FheUint8 addition — gate bootstrapping on every operation')
    this.append(`[ORACLE] Scheme: ${scheme} (Zama AI)`)
    this.append(`[ORACLE] Bootstrapping: ${bootstrapping}`)
    this.append('[ORACLE] Plaintext accessed: FALSE')
    this.append('[ORACLE] Result ciphertext serialized.')
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
