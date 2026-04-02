# Blind Oracle

**The server computed your data. It never saw a single bit.**

[Live Demo](https://systemslibrarian.github.io/blind-oracle/) · [Backend API](https://github.com/systemslibrarian/blind-oracle-api)

---

## What This Is

Blind Oracle is a live demonstration of **homomorphic encryption** — a branch of cryptography that allows a server to perform calculations on encrypted data without ever decrypting it.

You type two numbers. Your browser encrypts them into mathematical ciphertext blobs. Those blobs travel to a server. The server adds them together — using only the scrambled ciphertext, with no ability to read the underlying values. The encrypted result comes back. Your browser decrypts it.

The server computed the answer without knowing the question.

Open DevTools → Network tab while using the demo. You will see the actual ciphertext payloads over the wire. That is the proof.

---

## Why This Matters

Most encryption protects data *in transit* or *at rest*. The moment a server needs to compute on your data, it has to decrypt it first — exposing it to whoever runs that server.

Homomorphic encryption breaks that assumption entirely.

**The server can work on your data while it remains encrypted.** The computation happens in a mathematical space where the server is genuinely blind. This is not a trick of access control or key management — the server does not have the key. It mathematically cannot recover your values.

---

## Real-World Applications

This is not a theoretical curiosity. HE is already in production and active research across high-stakes domains:

**Healthcare**
Hospitals can run statistical analysis on patient records using cloud infrastructure without the cloud provider ever seeing a single patient's data. Genomic research companies are using HE to compute on DNA sequences while keeping the sequences private.

**Finance**
Banks can run fraud detection and credit scoring on encrypted transaction histories. The scoring model never learns your actual financial data — only the encrypted version passes through it.

**Artificial Intelligence**
Zama AI (the team behind TFHE-rs) is building encrypted machine learning inference. You send an encrypted image; the model classifies it; you receive an encrypted result. The model never sees your photo. This has profound implications for medical imaging, biometric authentication, and private search.

**Government and Defense**
DARPA has funded multiple fully homomorphic encryption programs specifically for computing on classified data using hardware that cannot be fully trusted. HE removes the need to trust the infrastructure.

**Cloud Computing**
The foundational promise of HE for cloud: use cloud compute on sensitive data without trusting the cloud provider. Google, Microsoft, and IBM all have active HE research divisions.

---

## What This Demo Does

```
BROWSER                              SERVER
───────                              ──────
Generates encryption key pair
Encrypts Value A              ──→
Encrypts Value B              ──→    Receives ciphertext blobs
                                     evaluator.add(ct_a, ct_b)
                                     Returns ct_result
Receives encrypted result     ←──    [cannot decrypt its own output]
Decrypts result locally
Displays the sum
```

The server holds an evaluation key — it can perform mathematical operations on ciphertexts but cannot recover plaintext. Every response includes `plaintextAccessed: false`. The server's log shows only the first 12 characters of each ciphertext blob it received.

---

## The Crypto

**Library:** Microsoft SEAL via [node-seal](https://github.com/s0l0ist/node-seal) v5.1.7  
**Scheme:** BFV (Brakerski/Fan-Vercauteren)  
**Security:** 128-bit (`tc128`)  
**Parameters:** `polyModulusDegree: 4096`, `plainModulusBitSize: 20`

This is **leveled homomorphic encryption** — real HE with a bounded circuit depth. It supports addition and multiplication on ciphertexts up to a noise budget limit. Each encrypted integer is approximately 100KB as a base64 blob. You can see these in the DevTools Network tab during the demo.

---

## Why Not Fully Homomorphic Encryption?

True FHE removes the circuit depth limit entirely through a process called **gate bootstrapping** — every operation automatically refreshes the noise budget, allowing unlimited computation depth on encrypted data.

[TFHE-rs by Zama AI](https://github.com/zama-ai/tfhe-rs) is the leading FHE library and does exactly this in Rust. However, as of this writing, the JavaScript/WASM bindings for TFHE-rs expose only key generation, encryption, and decryption — not server-side computation. The official docs confirm: *"The JS API does not support FHE computations."*

A server-side implementation would require native Rust, which is a meaningful architecture change. This project uses Microsoft SEAL instead because `node-seal` exposes `evaluator.add()` in JavaScript — making an honest, end-to-end browser demo possible today.

When Zama AI extends their JS bindings to include compute methods, this project will upgrade. The upgrade path is already documented in the codebase.

---

## Architecture

Two-repo deployment — one codebase:

| Component | Stack | Hosting |
|---|---|---|
| Frontend | Vite + TypeScript | GitHub Pages |
| Backend | Node.js + Express + node-seal | Render (free tier) |

The backend may take up to 30 seconds to wake from sleep on first request (Render free tier cold start). The UI shows a `WAKING THE ORACLE...` state during this.

---

## Local Setup

```bash
# Backend first (blind-oracle-api repo)
npm install
node index.js

# Frontend (this repo)
npm install
npm run dev
# Requires VITE_API_URL in .env.development → http://localhost:3001
```

---

## Credits

- [Microsoft SEAL](https://github.com/microsoft/SEAL) — Homomorphic encryption library
- [node-seal](https://github.com/s0l0ist/node-seal) — JavaScript bindings for SEAL
- [TFHE-rs](https://github.com/zama-ai/tfhe-rs) — Zama AI's FHE library (future upgrade path)
- [Vite](https://vitejs.dev) — Frontend build tooling

---

## License

MIT