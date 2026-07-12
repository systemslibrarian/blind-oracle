/**
 * The blind-oracle demo is fully static — no motion anywhere in the UI.
 * WireAnimator's methods are retained as no-ops so existing call sites keep
 * working without animating anything.
 */
export class WireAnimator {
  start(): void {}

  triggerTransmission(direction: 'out' | 'return' = 'out'): void {
    void direction
  }

  clearTransmission(): void {}
}

/** Set the final value immediately — no count-up animation. */
export function animateCountUp(targetEl: HTMLElement, value: number): Promise<void> {
  targetEl.textContent = String(value)
  return Promise.resolve()
}
