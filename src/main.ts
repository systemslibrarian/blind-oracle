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
import { base64ToHex } from './encoding'
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
const resultAnnounceEl = document.querySelector('[data-result-announce]') as HTMLElement
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
const bootOverlay = document.querySelector('[data-boot-overlay]') as HTMLElement
const bootDetailEl = document.querySelector('[data-boot-detail]') as HTMLElement
const bootRetryBtn = document.querySelector('[data-boot-retry]') as HTMLButtonElement

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
  themeToggleBtn.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  )
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

function setBootDetail(message: string): void {
  bootDetailEl.textContent = message
}

function hideBootOverlay(): void {
  bootOverlay.classList.add('boot-overlay--hidden')
}

function showBootError(message: string): void {
  bootOverlay.classList.remove('boot-overlay--hidden')
  bootOverlay.classList.add('boot-overlay--error')
  setBootDetail(message)
  bootRetryBtn.hidden = false
}

/** Disable the action controls while an async operation is in flight. */
function lockControls(): void {
  encryptButton.disabled = true
  computeButton.disabled = true
  resetBtn.disabled = true
}

/** Re-enable controls after work finishes. Compute requires a live ciphertext. */
function unlockControls(): void {
  encryptButton.disabled = false
  resetBtn.disabled = false
  computeButton.disabled = !(cipherA && cipherB)
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
  bootRetryBtn.hidden = true
  bootOverlay.classList.remove('boot-overlay--error', 'boot-overlay--hidden')
  state.setState('BOOTING')
  // Keep the action controls disabled (and out of keyboard reach behind the
  // overlay) until boot reaches READY, so they can't race the boot flow.
  lockControls()

  // Check SharedArrayBuffer availability (required for TFHE WASM)
  if (!checkSharedArrayBuffer()) {
    const msg = 'SharedArrayBuffer not available. Ensure the site is cross-origin isolated.'
    showBootError(msg)
    setError(msg)
    return
  }

  // Skip key generation on retry — keys persist across boot attempts, so a
  // failed oracle wake-up shouldn't cost another ~15s of key gen.
  if (!fheCtx || !fheCtx.ready) {
    try {
      setBootDetail('Generating FHE key pair in your browser (~10–15s)…')
      fheCtx = await initFhe()
      oracleLog.logBoot(fheCtx.keyGenTimeMs)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown initialization error'
      console.error('[FHE] Boot failure:', error)
      showBootError(`Failed to initialize FHE runtime: ${detail}`)
      setError(`Failed to initialize FHE runtime: ${detail}`)
      return
    }
  }

  state.setState('CHECKING_SERVER')
  setBootDetail('Keys ready. Contacting the Oracle…')
  const healthy = await checkHealth()

  if (healthy) {
    hideBootOverlay()
    unlockControls()
    state.setState('READY')
    return
  }

  state.setState('WAKING_ORACLE')
  const wakeDeadline = Date.now() + 45000

  while (Date.now() < wakeDeadline) {
    const secondsLeft = Math.ceil((wakeDeadline - Date.now()) / 1000)
    setBootDetail(`Waking the Oracle from cold start… (${secondsLeft}s remaining)`)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const ok = await checkHealth()
    if (ok) {
      hideBootOverlay()
      unlockControls()
      state.setState('READY')
      return
    }
  }

  showBootError('Oracle did not wake in time (free-tier cold start). Please retry.')
  setError('Oracle did not wake in time. Please retry.')
}

bootRetryBtn.addEventListener('click', () => {
  void boot()
})

function requireReadyContext(): FheContext {
  if (!fheCtx || !fheCtx.ready) {
    throw new Error('FHE context unavailable')
  }
  return fheCtx
}

/** A valid operand is an integer byte in [0, 255]. */
function isValidByte(raw: string): boolean {
  if (raw === '') {
    return false
  }
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 && n <= 255
}

function readInputValues(): [number, number] {
  const rawA = inputA.value.trim()
  const rawB = inputB.value.trim()
  const aValid = isValidByte(rawA)
  const bValid = isValidByte(rawB)

  // Mark fields for assistive tech so the offending input is identifiable.
  inputA.setAttribute('aria-invalid', String(!aValid))
  inputB.setAttribute('aria-invalid', String(!bValid))

  if (!aValid || !bValid) {
    throw new Error('Inputs must be integers in the range 0 to 255 (FheUint8)')
  }
  return [Number(rawA), Number(rawB)]
}

encryptButton.addEventListener('click', async () => {
  clearError()
  lockControls()

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

    state.setState('READY')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Encryption failed'
    setError(message)
  } finally {
    unlockControls()
  }
})

computeButton.addEventListener('click', async () => {
  clearError()

  if (!cipherA || !cipherB) {
    setError('Encrypt both values before compute')
    return
  }

  lockControls()

  try {
    const ctx = requireReadyContext()

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
    // Decode the base64 ciphertext to its true bytes before hex (matches ct_a/ct_b).
    modalCtR.textContent = base64ToHex(lastResultCt)

    state.setState('DECRYPTING')
    oracleLog.logDecrypt()
    const resultValue = await decryptResult(result.ctResultBase64, ctx)

    state.setState('REVEALED')
    resultBar.classList.add('revealed')
    await animateCountUp(resultValueEl, resultValue)
    // Announce the final total once, after the visual count-up settles, so
    // screen readers aren't flooded with the intermediate tween values.
    resultAnnounceEl.textContent = `The Oracle computed on ciphertext only. Decrypted locally, the sum is ${resultValue}.`
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
  } finally {
    unlockControls()
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

// Close the inspector when clicking the backdrop (parity with the info modal).
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.close()
  }
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
  resultAnnounceEl.textContent = ''
  inputA.setAttribute('aria-invalid', 'false')
  inputB.setAttribute('aria-invalid', 'false')
  modalCtA.textContent = ''
  modalCtB.textContent = ''
  modalCtR.textContent = ''
  if (lastRequestEl && reqPreviewEl) {
    lastRequestEl.hidden = true
    reqPreviewEl.textContent = ''
  }
  resultBar.classList.remove('revealed')
  computeButton.disabled = true
  clearError()
  state.setState('READY')
})

void boot()
