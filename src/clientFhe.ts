/**
 * TFHE-rs WASM Client
 * 
 * Uses Zama AI's TFHE-rs library for true fully homomorphic encryption.
 * Gate bootstrapping occurs on every operation - no circuit depth limit.
 * 
 * CRITICAL: Client key NEVER leaves this browser.
 * Server receives only the compressed server key for evaluation.
 */

import initTfhe, {
  TfheConfigBuilder,
  TfheClientKey,
  TfheCompressedServerKey,
  FheUint8
} from 'tfhe'

export interface FheContext {
  clientKey: TfheClientKey    // Decryption only — never serialized, never leaves browser
  serverKeyB64: string        // Compressed server key — sent to server for evaluation
  ready: boolean
  keyGenTimeMs: number        // For display in oracle log
}

export interface EncryptedValue {
  base64: string              // Serialized FheUint8 → base64
  hexPreview: string          // First 64 hex chars for display
  fullHex: string             // Full hex for inspector modal
  originalValue: number       // Stored locally only — never transmitted
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function validateValue(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error('Value must be an integer between 0 and 255 (FheUint8 range)')
  }
}

/**
 * Initialize TFHE-rs WASM and generate key pair.
 * 
 * Key generation takes 10-15 seconds in browser due to gate bootstrapping
 * key material. This is the cost of true FHE — unlimited computation depth.
 */
export async function initFhe(): Promise<FheContext> {
  console.log('[FHE] TFHE-rs WebAssembly loading...')
  
  // Initialize WASM module
  await initTfhe()
  
  console.log('[FHE] Generating FHE key pair — please wait (10–15 seconds)...')
  const startTime = performance.now()
  
  // Create default config for FheUint8 operations
  const config = TfheConfigBuilder.default().build()
  
  // Generate client key (contains secret key — NEVER leaves browser)
  const clientKey = TfheClientKey.generate(config)
  
  // Derive compressed server key for evaluation (safe to transmit)
  const compressedServerKey = TfheCompressedServerKey.new(clientKey)
  
  // Serialize server key to bytes, then base64
  const serverKeyBytes = compressedServerKey.serialize()
  const serverKeyB64 = uint8ArrayToBase64(serverKeyBytes)
  
  const keyGenTimeMs = Math.round(performance.now() - startTime)
  
  console.log(`[FHE] TFHE-rs WASM ready. Key gen: ${(keyGenTimeMs / 1000).toFixed(1)}s. Gate bootstrapping: ACTIVE.`)
  console.log(`[FHE] Server key size: ${(serverKeyBytes.length / 1024 / 1024).toFixed(2)} MB`)
  
  return {
    clientKey,
    serverKeyB64,
    ready: true,
    keyGenTimeMs
  }
}

/**
 * Encrypt an integer value (0-255) using FheUint8.
 */
export async function encryptValue(
  value: number,
  ctx: FheContext
): Promise<EncryptedValue> {
  validateValue(value)
  
  // Encrypt with client key
  const encrypted = FheUint8.encrypt_with_client_key(value, ctx.clientKey)
  
  // Serialize to bytes
  const bytes = encrypted.serialize()
  const base64 = uint8ArrayToBase64(bytes)
  const fullHex = bytesToHex(bytes)
  
  return {
    base64,
    hexPreview: fullHex.slice(0, 64),
    fullHex,
    originalValue: value
  }
}

/**
 * Decrypt a result ciphertext received from the server.
 */
export async function decryptResult(
  ctBase64: string,
  ctx: FheContext
): Promise<number> {
  // Decode base64 to bytes
  const bytes = base64ToUint8Array(ctBase64)
  
  // Deserialize to FheUint8
  const ciphertext = FheUint8.deserialize(bytes)
  
  // Decrypt with client key
  const result = ciphertext.decrypt(ctx.clientKey)
  
  return result
}

/**
 * Check if SharedArrayBuffer is available (required for TFHE WASM).
 */
export function checkSharedArrayBuffer(): boolean {
  return typeof SharedArrayBuffer === 'function'
}
