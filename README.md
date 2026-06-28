# crypto-lab-blind-oracle

## What It Is

Blind Oracle is a browser-to-server demonstration of **Fully Homomorphic Encryption** using [TFHE-rs](https://github.com/zama-ai/tfhe-rs) and gate bootstrapping over encrypted `FheUint8` values. The client encrypts two inputs, the server performs homomorphic addition, and the client decrypts the encrypted result locally. This solves the problem of outsourcing computation while keeping plaintext hidden from the compute provider. The security model is asymmetric homomorphic encryption (public evaluation key on the server, secret decryption key kept client-side), with post-quantum lattice-based foundations through TFHE.

## When to Use It

- Use it when you must run arithmetic on sensitive values in an untrusted cloud because TFHE-rs lets the server compute directly on ciphertexts.
- Use it for privacy-preserving analytics proofs of concept because the wire payloads and server responses stay encrypted end to end.
- Use it for zero-trust multi-tenant compute experiments because the server key enables evaluation but not plaintext recovery.
- Do not use it for low-latency, high-throughput production paths where plaintext processing is acceptable because bootstrapping and large ciphertexts add substantial performance overhead.
- Do NOT treat this as a production cryptographic service — it is a teaching demo with no authentication, rate limiting, or key rotation.

## Live Demo

**[systemslibrarian.github.io/crypto-lab-blind-oracle](https://systemslibrarian.github.io/crypto-lab-blind-oracle/)**

Watch a server add two numbers it can never read: the math happens on ciphertext, and only your browser holds the key to decrypt the answer. Enter two secret values in the 0–255 range, encrypt and transmit them, and trigger homomorphic addition on the oracle. The UI shows ciphertext previews, response time, the oracle log, and a modal showing exactly what the oracle received — without plaintext access. Controls: **SECRET VALUE A**, **SECRET VALUE B**, **ENCRYPT & TRANSMIT**, **COMPUTE (FHE ADD)**, **WHAT THE ORACLE SAW**, and **RESET**.

> First load generates an FHE key pair in your browser (~10–15s) — a boot overlay shows progress. On the free-tier backend, the oracle may also take a moment to wake from cold start.

Backend API source: <https://github.com/systemslibrarian/blind-oracle-api>

## What Can Go Wrong

- **Performance overhead:** FHE ciphertexts are large and bootstrapping is slow, so throughput and latency are far worse than plaintext computation.
- **Limited operations:** practical FHE supports a constrained set of operations and bit-widths (here, addition over `FheUint8`); arbitrary programs are expensive or infeasible.
- **No result integrity:** homomorphic evaluation hides inputs but does not by itself prove the server computed the right function — a malicious server could return a wrong-but-valid ciphertext.
- **Metadata still leaks:** request timing, ciphertext sizes, and access patterns remain visible to the server even though plaintext does not.
- **Client-side key management:** security depends entirely on the client key never leaking — lose it and the data is unrecoverable, expose it and confidentiality is gone.

## Real-World Usage

- FHE targets privacy-preserving cloud computation, where a provider processes data it can never read.
- Use cases include encrypted machine-learning inference and private analytics over sensitive records.
- Private database and set queries can be served without revealing the query or contents to the server.
- TFHE-rs (Zama) is an actively developed library bringing FHE to practical experimentation, though real deployments remain early and specialized.

## How to Run Locally

```bash
git clone https://github.com/systemslibrarian/crypto-lab-blind-oracle
cd crypto-lab-blind-oracle
npm install
npm run dev
```

In development, `/api` is proxied to the hosted backend via Vite (see `vite.config.ts`), so the demo works out of the box. To point at a different backend, set `VITE_API_URL` (for example in `.env.development`). TFHE-rs requires `SharedArrayBuffer`, which needs a cross-origin-isolated context; the bundled `coi-serviceworker` sets the required COOP/COEP headers automatically on GitHub Pages and `vite dev`.

## Related Demos

- [crypto-lab-ckks-lab](https://systemslibrarian.github.io/crypto-lab-ckks-lab/) — CKKS approximate FHE for encrypted inference.
- [crypto-lab-fhe-arena](https://systemslibrarian.github.io/crypto-lab-fhe-arena/) — BGV/BFV with noise budget and SIMD batching.
- [crypto-lab-paillier-gate](https://systemslibrarian.github.io/crypto-lab-paillier-gate/) — additively homomorphic encryption for private aggregation.
- [crypto-lab-elgamal-plain](https://systemslibrarian.github.io/crypto-lab-elgamal-plain/) — ElGamal homomorphism and re-randomization.

## How It Works

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

## Scripts

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

## Security Notes

- **The client key never leaves the browser.** Only the _compressed server key_ (an evaluation key that cannot decrypt) and ciphertexts are transmitted.
- **Original plaintext values are never sent.** They are held in memory client-side purely so the UI can confirm the decrypted sum.
- The client asserts the oracle's `plaintextAccessed === false` policy flag on every response and surfaces an error otherwise.
- This is a teaching demo. It does not implement authentication, rate limiting, or key rotation, and should not be treated as a production cryptographic service.

## Tech Stack

TypeScript · Vite · [TFHE-rs](https://github.com/zama-ai/tfhe-rs) (Zama) WebAssembly · Vitest · Prettier · GitHub Actions · GitHub Pages.

## License

[MIT](./LICENSE)

---

*One of 60+ browser demos in the [Crypto Lab](https://crypto-lab.systemslibrarian.dev/) suite.*

*"So whether you eat or drink or whatever you do, do it all for the glory of God." — 1 Corinthians 10:31*
