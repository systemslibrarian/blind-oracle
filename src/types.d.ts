declare module '*.css' {
  const value: string
  export default value
}

declare module 'tfhe' {
  export default function initTfhe(): Promise<void>
  
  export class TfheConfigBuilder {
    static default(): TfheConfigBuilder
    build(): TfheConfig
  }
  
  export class TfheConfig {}
  
  export class TfheClientKey {
    static generate(config: TfheConfig): TfheClientKey
  }
  
  export class TfheCompressedServerKey {
    static new(clientKey: TfheClientKey): TfheCompressedServerKey
    serialize(): Uint8Array
  }
  
  export class FheUint8 {
    static encrypt_with_client_key(value: number, clientKey: TfheClientKey): FheUint8
    static deserialize(bytes: Uint8Array): FheUint8
    serialize(): Uint8Array
    decrypt(clientKey: TfheClientKey): number
  }
}
