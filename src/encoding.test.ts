import { describe, it, expect } from 'vitest'
import {
  uint8ArrayToBase64,
  base64ToUint8Array,
  bytesToHex,
  base64ToHex,
  isValidFheUint8
} from './encoding'

describe('uint8ArrayToBase64 / base64ToUint8Array', () => {
  it('round-trips arbitrary bytes losslessly', () => {
    const original = new Uint8Array([0, 1, 2, 127, 128, 200, 254, 255])
    const restored = base64ToUint8Array(uint8ArrayToBase64(original))
    expect(Array.from(restored)).toEqual(Array.from(original))
  })

  it('encodes the empty array as an empty string', () => {
    expect(uint8ArrayToBase64(new Uint8Array([]))).toBe('')
    expect(base64ToUint8Array('').length).toBe(0)
  })

  it('matches a known base64 vector', () => {
    // "Hi" → bytes [72, 105] → "SGk="
    expect(uint8ArrayToBase64(new Uint8Array([72, 105]))).toBe('SGk=')
    expect(Array.from(base64ToUint8Array('SGk='))).toEqual([72, 105])
  })

  it('preserves high bytes that would corrupt under naive UTF-8 handling', () => {
    const bytes = new Uint8Array(256)
    for (let i = 0; i < 256; i++) bytes[i] = i
    const restored = base64ToUint8Array(uint8ArrayToBase64(bytes))
    expect(Array.from(restored)).toEqual(Array.from(bytes))
  })
})

describe('bytesToHex', () => {
  it('zero-pads each byte to two lowercase hex chars', () => {
    expect(bytesToHex(new Uint8Array([0, 15, 16, 255]))).toBe('000f10ff')
  })

  it('returns an empty string for no bytes', () => {
    expect(bytesToHex(new Uint8Array([]))).toBe('')
  })
})

describe('base64ToHex', () => {
  it('decodes base64 then hex-encodes the underlying bytes', () => {
    // "Hi" → [72, 105] → "4869"
    expect(base64ToHex('SGk=')).toBe('4869')
  })
})

describe('isValidFheUint8', () => {
  it('accepts the inclusive 0–255 integer range', () => {
    expect(isValidFheUint8(0)).toBe(true)
    expect(isValidFheUint8(255)).toBe(true)
    expect(isValidFheUint8(128)).toBe(true)
  })

  it('rejects out-of-range values', () => {
    expect(isValidFheUint8(-1)).toBe(false)
    expect(isValidFheUint8(256)).toBe(false)
  })

  it('rejects non-integers and non-finite numbers', () => {
    expect(isValidFheUint8(1.5)).toBe(false)
    expect(isValidFheUint8(NaN)).toBe(false)
    expect(isValidFheUint8(Infinity)).toBe(false)
  })
})
