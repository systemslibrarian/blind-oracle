export class WireAnimator {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width = 0
  private height = 0
  private drops: number[] = []
  private running = false
  private burstUntil = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('2D canvas context unavailable')
    }
    this.ctx = context
    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  private resize(): void {
    this.width = this.canvas.clientWidth
    this.height = this.canvas.clientHeight
    this.canvas.width = Math.max(1, this.width * window.devicePixelRatio)
    this.canvas.height = Math.max(1, this.height * window.devicePixelRatio)
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)

    const columns = Math.floor(this.width / 18)
    this.drops = Array.from({ length: columns }, () => Math.random() * this.height)
  }

  start(): void {
    if (this.running) {
      return
    }
    this.running = true
    const tick = () => {
      if (!this.running) {
        return
      }
      this.drawFrame()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  triggerTransmission(): void {
    this.burstUntil = performance.now() + 1200
  }

  private drawFrame(): void {
    this.ctx.fillStyle = 'rgba(7, 7, 15, 0.14)'
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.ctx.font = '14px "Share Tech Mono"'
    const now = performance.now()
    const burst = now < this.burstUntil
    const color = burst ? '#ff7a45' : '#00ffb3'
    this.ctx.fillStyle = color

    for (let i = 0; i < this.drops.length; i += 1) {
      const x = i * 18
      const y = this.drops[i]
      const glyph = Math.floor(Math.random() * 16).toString(16).toUpperCase()
      this.ctx.fillText(glyph, x, y)
      this.drops[i] = y > this.height + 20 ? 0 : y + (burst ? 7 : 4)
    }
  }
}

export function animateCountUp(targetEl: HTMLElement, value: number): Promise<void> {
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
