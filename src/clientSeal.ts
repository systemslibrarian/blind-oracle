import { SEAL_PARAMS } from './sealParams'

export interface ClientSealContext {
  seal: any
  context: any
  encoder: any
  encryptor: any
  decryptor: any
  publicKeyB64: string
  ready: boolean
}

export interface EncryptedInt {
  base64: string
  hexPreview: string
  fullHex: string
  originalValue: number
}

function bufferToHex(value: string): string {
  return Array.from(value)
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
}

function validateValue(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 999999) {
    throw new Error('Value must be an integer between 0 and 999999')
  }
}

export async function initClientSeal(): Promise<ClientSealContext> {
  const nodeSealModule = (await import('node-seal/throws_wasm_web_es')) as Record<
    string,
    unknown
  >
  const sealFactoryCandidate =
    (nodeSealModule.default as unknown) ?? (nodeSealModule as unknown)

  if (typeof sealFactoryCandidate !== 'function') {
    const availableKeys = Object.keys(nodeSealModule).join(', ')
    throw new Error(`node-seal factory missing. exports: [${availableKeys}]`)
  }

  const seal = await (sealFactoryCandidate as () => Promise<any>)()

  const scheme =
    seal?.SchemeType?.[SEAL_PARAMS.scheme] ??
    seal?.SchemeType?.[String(SEAL_PARAMS.scheme).toLowerCase()] ??
    seal?.SchemeType?.[String(SEAL_PARAMS.scheme).toUpperCase()]
  const security =
    seal?.SecurityLevel?.[SEAL_PARAMS.securityLevel] ??
    seal?.SecurityLevel?.[String(SEAL_PARAMS.securityLevel).toLowerCase()] ??
    seal?.SecurityLevel?.[String(SEAL_PARAMS.securityLevel).toUpperCase()]

  if (!scheme) {
    throw new Error(`Unsupported scheme enum: ${SEAL_PARAMS.scheme}`)
  }
  if (!security) {
    throw new Error(`Unsupported security level enum: ${SEAL_PARAMS.securityLevel}`)
  }

  const parms = seal.EncryptionParameters(scheme)

  parms.setPolyModulusDegree(SEAL_PARAMS.polyModulusDegree)
  parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(SEAL_PARAMS.polyModulusDegree))
  parms.setPlainModulus(
    seal.PlainModulus.Batching(SEAL_PARAMS.polyModulusDegree, SEAL_PARAMS.plainModulusBitSize)
  )

  const context = seal.Context(parms, true, security)
  if (!context.parametersSet()) {
    throw new Error('Invalid SEAL parameters in client context')
  }

  const keygen = seal.KeyGenerator(context)
  const publicKey = keygen.createPublicKey()
  const privateMaterial = keygen.secretKey()

  const encryptor = seal.Encryptor(context, publicKey)
  const decryptor = seal.Decryptor(context, privateMaterial)
  const encoder = seal.BatchEncoder(context)

  console.log('[CLIENT SEAL] Keys generated. Secret key stays here.')

  return {
    seal,
    context,
    encoder,
    encryptor,
    decryptor,
    publicKeyB64: publicKey.save(),
    ready: true
  }
}

export async function encryptInteger(
  value: number,
  ctx: ClientSealContext
): Promise<EncryptedInt> {
  validateValue(value)

  const slotCount = ctx.encoder.slotCount
  const values = new Int32Array(slotCount)
  values[0] = value

  const plaintext = ctx.seal.PlainText()
  ctx.encoder.encode(values, plaintext)

  const ciphertext = ctx.seal.CipherText()
  ctx.encryptor.encrypt(plaintext, ciphertext)

  const base64 = ciphertext.save()
  const fullHex = bufferToHex(base64)

  return {
    base64,
    hexPreview: fullHex.slice(0, 64),
    fullHex,
    originalValue: value
  }
}

export async function decryptResult(base64: string, ctx: ClientSealContext): Promise<number> {
  const ciphertext = ctx.seal.CipherText()
  ciphertext.load(ctx.context, base64)

  const plaintext = ctx.seal.PlainText()
  ctx.decryptor.decrypt(ciphertext, plaintext)

  const decoded = ctx.encoder.decode(plaintext) as Int32Array
  return Number(decoded[0])
}
