# Blind Oracle

[![CI](https://github.com/systemslibrarian/crypto-lab-blind-oracle/actions/workflows/ci.yml/badge.svg)](https://github.com/systemslibrarian/crypto-lab-blind-oracle/actions/workflows/ci.yml)
[![Deploy](https://github.com/systemslibrarian/crypto-lab-blind-oracle/actions/workflows/deploy.yml/badge.svg)](https://github.com/systemslibrarian/crypto-lab-blind-oracle/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

[Live Demo](https://systemslibrarian.github.io/crypto-lab-blind-oracle/) · [Backend API](https://github.com/systemslibrarian/blind-oracle-api)

> Watch a server add two numbers it can never read. The math happens on ciphertext; only your browser holds the key to decrypt the answer.

## 1. What It Is

Blind Oracle is a browser-to-server demonstration of **Fully Homomorphic Encryption** using [TFHE-rs](https://github.com/zama-ai/tfhe-rs) and gate bootstrapping over encrypted `FheUint8` values. The client encrypts two inputs, the server performs homomorphic addition, and the client decrypts the encrypted result locally. This solves the problem of outsourcing computation while keeping plaintext hidden from the compute provider. The security model is asymmetric homomorphic encryption (public evaluation key on the server, secret decryption key kept client-side), with post-quantum lattice-based foundations through TFHE.

## 2. When to Use It

- Use it when you must run arithmetic on sensitive values in an untrusted cloud because TFHE-rs lets the server compute directly on ciphertexts.
- Use it for privacy-preserving analytics proofs of concept because the wire payloads and server responses stay encrypted end to end.
- Use it for zero-trust multi-tenant compute experiments because the server key enables evaluation but not plaintext recovery.
- Do not use it for low-latency, high-throughput production paths where plaintext processing is acceptable because bootstrapping and large ciphertexts add substantial performance overhead.

## 3. Live Demo

Live demo: https://systemslibrarian.github.io/crypto-lab-blind-oracle/

Enter two secret values in the 0–255 range, encrypt and transmit them, and trigger homomorphic addition on the oracle. The UI shows ciphertext previews, response time, the oracle log, and a modal showing exactly what the oracle received — without plaintext access. Controls: **SECRET VALUE A**, **SECRET VALUE B**, **ENCRYPT & TRANSMIT**, **COMPUTE (FHE ADD)**, **WHAT THE ORACLE SAW**, and **RESET**.

> First load generates an FHE key pair in your browser (~10–15s) — a boot overlay shows progress. On the free-tier backend, the oracle may also take a moment to wake from cold start.

## 4. How It Works

```
┌──────────────────────────┐         encrypted wire          ┌──────────────────────────┐
│        YOUR BROWSER       │   ── ct_a, ct_b, serverKey ──▶  │       THE BLIND ORACLE     │
│                          │                                  │                          │
│  client key (secret) ◀── never leaves the browser          │  server key (evaluation)  │
│  encrypt a, b → ct       │                                  │  ct_result = ct_a ⊞ ct_b  │
│  decrypt ct_result → sum │   ◀──────── ct_result ───────    │  plaintext never accessed │
└──────────────────────────┘                                  └──────────────────────────┘
```

1. **Key generation** — the browser builds a TFHE config and generates a client key (secret) plus a compressed server key (evaluation only).
2. **Encrypt** — values `a` and `b` are encrypted to `FheUint8` ciphertexts; only ciphertext (and the public server key) crosses the wire.
3. **Compute** — the server runs `ct_a + ct_b` homomorphically with gate bootstrapping on every operation, and returns `ct_result`.
4. **Decrypt** — the browser decrypts `ct_result` with the client key. The server never sees a plaintext.

### Source layout

| File                  | Responsibility                                                      |
| --------------------- | ------------------------------------------------------------------- |
| `src/main.ts`         | UI wiring, app state transitions, boot overlay, event handlers      |
| `src/clientFhe.ts`    | TFHE-rs WASM: key generation, encryption, decryption                |
| `src/apiClient.ts`    | Typed fetch client for the oracle, with timeouts and error taxonomy |
| `src/encoding.ts`     | Pure base64/hex helpers and FheUint8 range validation (unit-tested) |
| `src/stateMachine.ts` | Minimal observable state machine driving the UI (unit-tested)       |
| `src/animations.ts`   | Canvas "wire" effect and count-up, both reduced-motion aware        |
| `src/oracleLog.ts`    | Append-only activity log rendering                                  |

## 5. Run Locally

```bash
git clone https://github.com/systemslibrarian/crypto-lab-blind-oracle.git
cd crypto-lab-blind-oracle
npm install
npm run dev
```

In development, `/api` is proxied to the hosted backend via Vite (see `vite.config.ts`), so the demo works out of the box. To point at a different backend, set `VITE_API_URL` (for example in `.env.development`).

> TFHE-rs requires `SharedArrayBuffer`, which needs a cross-origin-isolated context. The bundled `coi-serviceworker` sets the required COOP/COEP headers automatically on GitHub Pages and `vite dev`.

### Scripts

| Script                 | What it does                              |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Start the Vite dev server                 |
| `npm run build`        | Type-check and build for production       |
| `npm run preview`      | Serve the production build locally        |
| `npm test`             | Run the Vitest unit suite                 |
| `npm run test:watch`   | Run tests in watch mode                   |
| `npm run typecheck`    | Type-check without emitting               |
| `npm run format`       | Format the codebase with Prettier         |
| `npm run format:check` | Verify formatting (used in CI)            |
| `npm run deploy`       | Build and publish `dist/` to GitHub Pages |

## 6. Security Notes

- **The client key never leaves the browser.** Only the _compressed server key_ (an evaluation key that cannot decrypt) and ciphertexts are transmitted.
- **Original plaintext values are never sent.** They are held in memory client-side purely so the UI can confirm the decrypted sum.
- The client asserts the oracle's `plaintextAccessed === false` policy flag on every response and surfaces an error otherwise.
- This is a teaching demo. It does not implement authentication, rate limiting, or key rotation, and should not be treated as a production cryptographic service.

## 7. Tech Stack

TypeScript · Vite · [TFHE-rs](https://github.com/zama-ai/tfhe-rs) (Zama) WebAssembly · Vitest · Prettier · GitHub Actions · GitHub Pages.

## 8. Part of the Crypto-Lab Suite

This demo is part of the broader Crypto-Lab collection at https://systemslibrarian.github.io/crypto-lab/.

## License

[MIT](./LICENSE)

---

Whether you eat or drink or whatever you do, do it all for the glory of God. — 1 Corinthians 10:31
