/** True when the user has asked the OS to minimise non-essential motion. */
function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Drives the labelled-token flow across the client -> oracle wire schematic.
 * The schematic is a STATIC diagram at rest; motion happens only when a real
 * homomorphic round-trip fires (triggerTransmission), so nothing loops idle.
 */
export class WireAnimator {
  private schematic: HTMLElement | null

  constructor() {
    this.schematic = document.querySelector('[data-wire-schematic]')
  }

  /** Retained no-op: the wire has no idle animation loop to start. */
  start(): void {}

  /**
   * Kick off the labelled-token flow across the wire.
   * @param direction 'out' = ct_a/ct_b/serverKey leaving the browser toward the
   *   Oracle; 'return' = ct_result coming back. The secret-key chip never moves.
   */
  triggerTransmission(direction: 'out' | 'return' = 'out'): void {
    const el = this.schematic
    if (!el || prefersReducedMotion()) {
      return
    }
    // Restart the CSS animation reliably by toggling the class off, forcing a
    // reflow, then on again -- so repeated compute clicks re-run the flow.
    el.classList.remove('wire-flow-out', 'wire-flow-return')
    void el.offsetWidth
    el.classList.add(direction === 'return' ? 'wire-flow-return' : 'wire-flow-out')
  }

  /** Clear any in-progress flow markers (used on reset). */
  clearTransmission(): void {
    this.schematic?.classList.remove('wire-flow-out', 'wire-flow-return')
  }
}

export function animateCountUp(targetEl: HTMLElement, value: number): Promise<void> {
  // Reduced motion: skip the tween and show the final value immediately.
  if (prefersReducedMotion()) {
    targetEl.textContent = String(value)
    return Promise.resolve()
  }

  const duration = 900
  const start = performance.now()

  return new Promise((resolve) => {
    const step = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / duration)
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      targetEl.textContent = String(Math.round(value * eased))

      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(step)
  })
}
