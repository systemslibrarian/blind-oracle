# Blind Oracle

**The server computed your data. It never saw a single bit.**

[Live Demo](https://systemslibrarian.github.io/blind-oracle/) · [Backend API](https://github.com/systemslibrarian/blind-oracle-api)

---

## What This Is

Blind Oracle is a live demonstration of **Fully Homomorphic Encryption (FHE)** — a branch of cryptography that allows a server to perform calculations on encrypted data without ever decrypting it.

**The simple version:** Imagine handing someone a locked safe containing two number tiles. They shake the safe in a specific way that rearranges the tiles to show their sum — without ever opening it. When you unlock it, the answer is inside. They did the math. They never saw the numbers.

You type two numbers. Your browser encrypts them using TFHE-rs WASM. Those encrypted blobs travel to a server running native TFHE-rs. The server adds them together — using only the scrambled ciphertext, with no ability to read the underlying values. The encrypted result comes back. Your browser decrypts it.

The server computed the answer without knowing the question.

Open DevTools → Network tab while using the demo. You will see the actual ciphertext payloads over the wire. That is the proof.

---

## True FHE via Gate Bootstrapping

This demo uses **TFHE-rs** by Zama AI — a true Fully Homomorphic Encryption library. Unlike leveled HE schemes (BFV, CKKS), TFHE-rs performs **gate bootstrapping** on every operation.

What does this mean?

- **No circuit depth limit**: Every operation refreshes the noise budget automatically. You can chain unlimited operations on encrypted data.
- **Client-side WASM**: Key generation and encryption/decryption happen in your browser using TFHE-rs compiled to WebAssembly.
- **Server-side native Rust**: The server runs TFHE-rs natively for maximum performance during homomorphic computation.
- **Cross-platform serialization**: Ciphertexts serialize identically between JS/WASM and Rust, enabling true end-to-end FHE.

The tradeoff: key generation takes 10-15 seconds in the browser. This is the cost of generating the bootstrapping keys that enable unlimited computation depth. It's worth it.

---

## Why This Matters

Most encryption protects data *in transit* or *at rest*. The moment a server needs to compute on your data, it has to decrypt it first — exposing it to whoever runs that server.

Fully Homomorphic Encryption breaks that assumption entirely.

**The server can work on your data while it remains encrypted.** The computation happens in a mathematical space where the server is genuinely blind. This is not a trick of access control or key management — the server does not have the key. It mathematically cannot recover your values.

---

## Real-World Applications

This is not a theoretical curiosity. FHE is already in production and active research across high-stakes domains:

**Healthcare**
Hospitals can run statistical analysis on patient records using cloud infrastructure without the cloud provider ever seeing a single patient's data. Genomic research companies are using FHE to compute on DNA sequences while keeping the sequences private.

**Finance**
Banks can run fraud detection and credit scoring on encrypted transaction histories. The scoring model never learns your actual financial data — only the encrypted version passes through it.

**Artificial Intelligence**
Zama AI (the team behind TFHE-rs) is building encrypted machine learning inference. You send an encrypted image; the model classifies it; you receive an encrypted result. The model never sees your photo. This has profound implications for medical imaging, biometric authentication, and private search.

**Government and Defense**
DARPA has funded multiple fully homomorphic encryption programs specifically for computing on classified data using hardware that cannot be fully trusted. FHE removes the need to trust the infrastructure.

**Cloud Computing**
The foundational promise of FHE for cloud: use cloud compute on sensitive data without trusting the cloud provider. Google, Microsoft, and IBM all have active FHE research divisions.

---

## What This Demo Does

```
BROWSER                              SERVER
───────                              ──────
Generates FHE key pair (10-15s)
  → Client key (stays here)
  → Server key (for evaluation)
Encrypts Value A              ──→
Encrypts Value B              ──→    Receives ciphertext blobs + server key
                                     fhe_add(ct_a, ct_b) with gate bootstrapping
                                     Returns ct_result
Receives encrypted result     ←──    [cannot decrypt its own output]
Decrypts result locally
Displays the sum
```

The server receives a **compressed server key** — it can perform FHE operations on ciphertexts but cannot recover plaintext. Every response includes `plaintextAccessed: false`. The client key (secret key) never leaves your browser.

---

## The Crypto

**Library:** [TFHE-rs](https://github.com/zama-ai/tfhe-rs) by Zama AI  
**Client:** TFHE-rs WASM (tfhe npm package)  
**Server:** TFHE-rs native Rust  
**Type:** FheUint8 (0-255 range)  
**Bootstrapping:** Gate bootstrapping on every operation  
**Circuit Depth:** Unlimited

This is **Fully Homomorphic Encryption** — real FHE with no circuit depth limit. Each encrypted integer is approximately 10-50KB as a base64 blob. The server key is larger (~5-10MB) and is transmitted once per session. You can see these in the DevTools Network tab during the demo.

Key generation takes 10-15 seconds in the browser. This is normal — TFHE-rs generates bootstrapping key material that enables unlimited computation depth. The tradeoff is worth it.

---

## Architecture

Two-repo deployment — full FHE stack:

| Component | Stack | Hosting |
|---|---|---|
| Frontend | Vite + TypeScript + TFHE-rs WASM | GitHub Pages |
| Backend | Rust + Axum + TFHE-rs native | Render |

---

## API Reference

The backend exposes a single endpoint:

### `POST /compute/add`

Adds two encrypted FheUint8 values homomorphically.

**Request:**
```json
{
  "serverKey": "<base64 compressed server key ~5-10MB>",
  "ctA": "<base64 FheUint8 ciphertext>",
  "ctB": "<base64 FheUint8 ciphertext>"
}
```

**Response:**
```json
{
  "ctResult": "<base64 FheUint8 ciphertext>",
  "operation": "tfhe_fhe_add",
  "plaintextAccessed": false,
  "scheme": "TFHE-rs",
  "bootstrapping": "gate_bootstrapping_per_operation"
}
```

The `plaintextAccessed: false` field confirms the server never decrypted your data.

---

## Local Setup

```bash
# Backend first (blind-oracle-api repo - Rust)
cargo run

# Frontend (this repo)
npm install
npm run dev
# Requires VITE_API_URL in .env.development → http://localhost:3001
```

**Note:** SharedArrayBuffer is required for TFHE-rs WASM. The `coi-serviceworker` package enables this automatically on GitHub Pages. For local development, Vite serves with the necessary headers.

---

## Credits

- [TFHE-rs](https://github.com/zama-ai/tfhe-rs) — Zama AI's Fully Homomorphic Encryption library
- [tfhe npm package](https://www.npmjs.com/package/tfhe) — TFHE-rs WebAssembly bindings
- [coi-serviceworker](https://github.com/nickvdyck/coi-serviceworker) — Cross-Origin Isolation for SharedArrayBuffer
- [Vite](https://vitejs.dev) — Frontend build tooling

---

## License

MIT