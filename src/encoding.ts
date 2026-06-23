/**
 * Pure byte/string encoding helpers shared across the FHE client.
 *
 * Kept free of any WASM/DOM dependency so they can be unit-tested in isolation
 * and reused by both the crypto layer and the UI (e.g. ciphertext previews).
 */

/** Encode raw bytes as a base64 string. */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/** Decode a base64 string back into raw bytes. */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** Render bytes as a lowercase hex string (two chars per byte). */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Convenience: decode a base64 ciphertext directly to its hex representation. */
export function base64ToHex(base64: string): string {
  return bytesToHex(base64ToUint8Array(base64))
}

/** True when `value` is an integer within the inclusive FheUint8 range (0–255). */
export function isValidFheUint8(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 255
}
