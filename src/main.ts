import './style.css'
import {
  checkHealth,
  computeAdd,
  InvalidCiphertextError,
  OracleInitializingError,
  OracleOfflineError,
  OracleTimeoutError
} from './apiClient'
import { animateCountUp, WireAnimator } from './animations'
import {
  decryptResult,
  encryptValue,
  initFhe,
  checkSharedArrayBuffer,
  type FheContext,
  type EncryptedValue
} from './clientFhe'
import { OracleLog } from './oracleLog'
import { StateMachine } from './stateMachine'

const state = new StateMachine('BOOTING')

let fheCtx: FheContext | null = null
let cipherA: EncryptedValue | null = null
let cipherB: EncryptedValue | null = null
let lastResultCt = ''

const statusEl = document.querySelector('[data-state]') as HTMLElement
const responseTimeEl = document.querySelector('[data-response-time]') as HTMLElement
const logEl = document.querySelector('[data-oracle-log]') as HTMLElement
const inputA = document.querySelector('[data-input-a]') as HTMLInputElement
const inputB = document.querySelector('[data-input-b]') as HTMLInputElement
const encryptButton = document.querySelector('[data-encrypt]') as HTMLButtonElement
const computeButton = document.querySelector('[data-compute]') as HTMLButtonElement
const resultBar = document.querySelector('[data-result-bar]') as HTMLElement
const resultValueEl = document.querySelector('[data-result-value]') as HTMLElement
const errorEl = document.querySelector('[data-error]') as HTMLElement
const ctAPreviewEl = document.querySelector('[data-ct-a-preview]') as HTMLElement
const ctBPreviewEl = document.querySelector('[data-ct-b-preview]') as HTMLElement
const modal = document.querySelector('[data-inspector-modal]') as HTMLDialogElement
const modalOpenBtn = document.querySelector('[data-open-inspector]') as HTMLButtonElement
const modalCloseBtn = document.querySelector('[data-close-inspector]') as HTMLButtonElement
const modalCtA = document.querySelector('[data-modal-ct-a]') as HTMLElement
const modalCtB = document.querySelector('[data-modal-ct-b]') as HTMLElement
const modalCtR = document.querySelector('[data-modal-ct-r]') as HTMLElement
const resetBtn = document.querySelector('[data-reset]') as HTMLButtonElement
const wireCanvas = document.querySelector('#wire-canvas') as HTMLCanvasElement
const infoModal = document.querySelector('[data-info-modal]') as HTMLDialogElement
const infoOpenBtn = document.querySelector('[data-open-info]') as HTMLButtonElement
const infoCloseBtn = document.querySelector('[data-close-info]') as HTMLButtonElement
const lastRequestEl = document.querySelector('[data-last-request]') as HTMLElement
const reqPreviewEl = document.querySelector('[data-req-preview]') as HTMLElement
const themeToggleBtn = document.querySelector('[data-theme-toggle]') as HTMLButtonElement | null

const oracleLog = new OracleLog(logEl)
const animator = new WireAnimator(wireCanvas)
animator.start()

function getCurrentTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

function syncThemeToggle(theme: 'dark' | 'light'): void {
  if (!themeToggleBtn) {
    return
  }

  themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️'
  themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
}

function setTheme(theme: 'dark' | 'light'): void {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
  syncThemeToggle(theme)
}

function setError(message: string): void {
  state.setState('ERROR')
  errorEl.textContent = message
  errorEl.hidden = false
  oracleLog.logError(message)
}

function clearError(): void {
  errorEl.hidden = true
  errorEl.textContent = ''
}

syncThemeToggle(getCurrentTheme())
themeToggleBtn?.addEventListener('click', () => {
  const nextTheme = getCurrentTheme() === 'dark' ? 'light' : 'dark'
  setTheme(nextTheme)
})

state.onChange((next) => {
  statusEl.textContent = next
  if (next === 'WAKING_ORACLE') {
    oracleLog.logState(next)
  }
})

async function boot(): Promise<void> {
  clearError()
  state.setState('BOOTING')

  // Check SharedArrayBuffer availability (required for TFHE WASM)
  if (!checkSharedArrayBuffer()) {
    setError('SharedArrayBuffer not available. Ensure site is cross-origin isolated.')
    return
  }

  try {
    fheCtx = await initFhe()
    oracleLog.logBoot(fheCtx.keyGenTimeMs)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown initialization error'
    console.error('[FHE] Boot failure:', error)
    setError(`Failed to initialize FHE runtime: ${detail}`)
    return
  }

  state.setState('CHECKING_SERVER')
  const healthy = await checkHealth()

  if (healthy) {
    state.setState('READY')
    return
  }

  state.setState('WAKING_ORACLE')
  const wakeDeadline = Date.now() + 45000

  while (Date.now() < wakeDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const ok = await checkHealth()
    if (ok) {
      state.setState('READY')
      return
    }
  }

  setError('Oracle did not wake in time. Please retry.')
}

function requireReadyContext(): FheContext {
  if (!fheCtx || !fheCtx.ready) {
    throw new Error('FHE context unavailable')
  }
  return fheCtx
}

function readInputValues(): [number, number] {
  const a = Number(inputA.value)
  const b = Number(inputB.value)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || a > 255 || b < 0 || b > 255) {
    throw new Error('Inputs must be integers in the range 0 to 255 (FheUint8)')
  }
  return [a, b]
}

encryptButton.addEventListener('click', async () => {
  clearError()

  try {
    const [a, b] = readInputValues()
    const ctx = requireReadyContext()

    state.setState('ENCRYPTING')
    cipherA = await encryptValue(a, ctx)
    cipherB = await encryptValue(b, ctx)

    ctAPreviewEl.textContent = `${cipherA.base64.slice(0, 80)}...`
    ctBPreviewEl.textContent = `${cipherB.base64.slice(0, 80)}...`

    modalCtA.textContent = cipherA.fullHex
    modalCtB.textContent = cipherB.fullHex

    state.setState('TRANSMITTING')
    animator.triggerTransmission()
    oracleLog.logTransmit(cipherA.base64, cipherB.base64)

    computeButton.disabled = false
    state.setState('READY')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Encryption failed'
    setError(message)
  }
})

computeButton.addEventListener('click', async () => {
  clearError()

  if (!cipherA || !cipherB) {
    setError('Encrypt both values before compute')
    return
  }

  const ctx = requireReadyContext()

  try {
    state.setState('TRANSMITTING')
    animator.triggerTransmission()

    const result = await computeAdd(ctx.serverKeyB64, cipherA.base64, cipherB.base64, () => {
      if (state.getState() !== 'WAKING_ORACLE') {
        state.setState('WAKING_ORACLE')
      }
    })

    state.setState('ORACLE_COMPUTING')
    oracleLog.logComputing(result.responseTimeMs, result.scheme, result.bootstrapping)

    // Update devtools panel with last request preview
    if (lastRequestEl && reqPreviewEl && cipherA && cipherB) {
      lastRequestEl.hidden = false
      reqPreviewEl.textContent = `ct_a: ${cipherA.base64.slice(0, 32)}...\nct_b: ${cipherB.base64.slice(0, 32)}...\nct_result: ${result.ctResultBase64.slice(0, 32)}...`
    }

    if (result.plaintextAccessed !== false) {
      setError('Oracle response violated plaintextAccessed policy')
      return
    }

    state.setState('RECEIVING')
    responseTimeEl.textContent = `${result.responseTimeMs}ms`
    lastResultCt = result.ctResultBase64
    modalCtR.textContent = Array.from(lastResultCt)
      .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')

    state.setState('DECRYPTING')
    oracleLog.logDecrypt()
    const resultValue = await decryptResult(result.ctResultBase64, ctx)

    state.setState('REVEALED')
    resultBar.classList.add('revealed')
    await animateCountUp(resultValueEl, resultValue)
  } catch (error) {
    if (error instanceof OracleTimeoutError) {
      setError('Oracle timed out after 45s. Use retry.')
      return
    }
    if (error instanceof OracleOfflineError) {
      setError('Oracle is offline. Check API deployment.')
      return
    }
    if (error instanceof InvalidCiphertextError) {
      setError('Oracle rejected ciphertext payload.')
      return
    }
    if (error instanceof OracleInitializingError) {
      setError('Oracle still initializing. Retry in a few seconds.')
      return
    }

    setError(error instanceof Error ? error.message : 'Compute failed')
  }
})

modalOpenBtn.addEventListener('click', () => {
  if (typeof modal.showModal === 'function') {
    modal.showModal()
  }
})

modalCloseBtn.addEventListener('click', () => {
  modal.close()
})

infoOpenBtn?.addEventListener('click', () => {
  if (infoModal && typeof infoModal.showModal === 'function') {
    infoModal.showModal()
  }
})

infoCloseBtn?.addEventListener('click', () => {
  infoModal?.close()
})

infoModal?.addEventListener('click', (e) => {
  if (e.target === infoModal) {
    infoModal.close()
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    infoModal?.close()
  }
})

resetBtn.addEventListener('click', () => {
  cipherA = null
  cipherB = null
  lastResultCt = ''
  ctAPreviewEl.textContent = 'awaiting ciphertext A...'
  ctBPreviewEl.textContent = 'awaiting ciphertext B...'
  responseTimeEl.textContent = '--ms'
  resultValueEl.textContent = '0'
  modalCtA.textContent = ''
  modalCtB.textContent = ''
  modalCtR.textContent = ''
  resultBar.classList.remove('revealed')
  computeButton.disabled = true
  clearError()
  state.setState('READY')
})

void boot()
