export type AppState =
  | 'BOOTING'
  | 'CHECKING_SERVER'
  | 'WAKING_ORACLE'
  | 'READY'
  | 'ENCRYPTING'
  | 'TRANSMITTING'
  | 'ORACLE_COMPUTING'
  | 'RECEIVING'
  | 'DECRYPTING'
  | 'REVEALED'
  | 'ERROR'

type Listener = (next: AppState, previous: AppState) => void

export class StateMachine {
  private current: AppState
  private listeners: Listener[] = []

  constructor(initial: AppState) {
    this.current = initial
  }

  setState(next: AppState): void {
    if (next === this.current) {
      return
    }
    const previous = this.current
    this.current = next
    for (const listener of this.listeners) {
      listener(next, previous)
    }
  }

  getState(): AppState {
    return this.current
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener)
  }
}
