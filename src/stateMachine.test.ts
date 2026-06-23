import { describe, it, expect, vi } from 'vitest'
import { StateMachine } from './stateMachine'

describe('StateMachine', () => {
  it('reports its initial state', () => {
    const sm = new StateMachine('BOOTING')
    expect(sm.getState()).toBe('BOOTING')
  })

  it('transitions and notifies listeners with (next, previous)', () => {
    const sm = new StateMachine('BOOTING')
    const listener = vi.fn()
    sm.onChange(listener)

    sm.setState('READY')

    expect(sm.getState()).toBe('READY')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith('READY', 'BOOTING')
  })

  it('does not notify when setting the same state', () => {
    const sm = new StateMachine('READY')
    const listener = vi.fn()
    sm.onChange(listener)

    sm.setState('READY')

    expect(listener).not.toHaveBeenCalled()
  })

  it('fans out to every registered listener', () => {
    const sm = new StateMachine('READY')
    const a = vi.fn()
    const b = vi.fn()
    sm.onChange(a)
    sm.onChange(b)

    sm.setState('ENCRYPTING')

    expect(a).toHaveBeenCalledOnce()
    expect(b).toHaveBeenCalledOnce()
  })

  it('supports multi-step sequences', () => {
    const sm = new StateMachine('READY')
    const seen: string[] = []
    sm.onChange((next) => seen.push(next))

    sm.setState('ENCRYPTING')
    sm.setState('TRANSMITTING')
    sm.setState('REVEALED')

    expect(seen).toEqual(['ENCRYPTING', 'TRANSMITTING', 'REVEALED'])
  })
})
