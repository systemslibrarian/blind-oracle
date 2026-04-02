# Blind Oracle — Complete Project Summary

## Crypto Library & Scheme

- **Library:** Microsoft SEAL via `node-seal` v5.1.7 (JavaScript/WASM bindings)
- **Scheme:** BFV (Brakerski/Fan-Vercauteren) — **leveled homomorphic encryption**, not fully homomorphic
- **Parameters:**
  - `polyModulusDegree: 4096`
  - `plainModulusBitSize: 20`
  - `securityLevel: tc128` (128-bit security)
- **Supported operations:** Addition and multiplication on ciphertext (bounded circuit depth)

---

## User Journey (Step by Step)

1. **Page loads** → Browser initializes SEAL WASM, generates a key pair (public + secret key)
2. **User enters two integers** (0–999,999) in the "SECRET VALUE A" and "SECRET VALUE B" fields
3. **Click "ENCRYPT & TRANSMIT"** → Browser encrypts both values into BFV ciphertexts (~100KB base64 blobs), displays hex previews in the Oracle panel
4. **Click "COMPUTE (HE ADD)"** → Browser POSTs `{ ctA, ctB }` to the Render API
5. **Server performs** `evaluator.add(ct_a, ct_b)` on ciphertext — never decrypts
6. **Server returns** `{ ctResult, plaintextAccessed: false, serverKeyType: "evaluation_only" }`
7. **Browser decrypts** the result ciphertext locally using the secret key
8. **Result bar appears** showing the sum with the message: "THE ORACLE COMPUTED THIS WITHOUT EVER KNOWING EITHER VALUE"

---

## What the Server Holds vs. Doesn't Hold

| Server HAS | Server DOES NOT HAVE |
|------------|----------------------|
| SEAL evaluation context | Secret key (decryption key) |
| Evaluator object (for `add`) | Public key (not needed for eval) |
| Encoder (for batching compatibility) | Any plaintext values |

The server **cannot recover plaintext** — it only manipulates ciphertext mathematically.

---

## UI Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  THE QUESTIONER (green)    │   ENCRYPTED WIRE    │  THE BLIND ORACLE (orange)  │
│  • "How This Demo Works"   │   • Canvas animation│  • ct_a preview             │
│  • Value A input           │   • Scheme badge    │  • ct_b preview             │
│  • Value B input           │   • Response time   │  • COMPUTE button           │
│  • ENCRYPT & TRANSMIT btn  │   • [?] info modal  │  • Oracle log               │
│  • Key status indicator    │                     │                             │
└─────────────────────────────────────────────────────────────────┘
│                         RESULT BAR (appears after decrypt)                      │
│  "THE ORACLE COMPUTED THIS WITHOUT EVER KNOWING EITHER VALUE" → 300            │
│  [WHAT THE ORACLE SAW] [RESET]                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
│  DevTools panel (collapsible) — shows last request ciphertext previews          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Info modal:** Explains leveled HE vs FHE
- **Inspector modal:** Shows full hex dumps of ct_a, ct_b, ct_result

---

## Deployment Setup

### Frontend (GitHub Pages)

- **Repo:** `systemslibrarian/blind-oracle`
- **Workflow:** `.github/workflows/deploy.yml`
- **Trigger:** Push to `main` or manual dispatch
- **Build:** `npm ci && npm run build` (Vite)
- **Artifact:** `./dist` uploaded via `actions/upload-pages-artifact@v3`
- **Deploy:** `actions/deploy-pages@v4`
- **URL:** `https://systemslibrarian.github.io/blind-oracle/`

### Backend (Render)

- **Repo:** `systemslibrarian/blind-oracle-api`
- **Config:** `render.yaml` (Infrastructure as Code)
- **Build command:** `npm install`
- **Start command:** `node index.js`
- **URL:** `https://blind-oracle-api.onrender.com`
- **CORS:** Locked to `https://systemslibrarian.github.io`
- **Endpoints:** `GET /health`, `POST /compute/add`

---

## Known Limitations & Rough Edges

1. **Not true FHE** — BFV is leveled HE with bounded circuit depth. TFHE-rs JS bindings don't expose compute methods yet.

2. **Cold starts** — Render free tier sleeps after ~15 min inactivity. First request can take 30+ seconds. UI shows "WAKING_ORACLE" state during this.

3. **Large ciphertexts** — Each encrypted integer is ~100KB base64. Network tab shows real payloads.

4. **Integer range** — Limited to 0–999,999 (enforced client-side)

5. **Single operation** — Only addition implemented. Multiplication could be added but isn't exposed.

6. **No persistence** — Results aren't stored; fresh keys generated each page load.

7. **node-seal enum casing** — Required defensive lookup (`bfv` lowercase) due to v5 changes.

---

## Why Not Fully Homomorphic Encryption?

The Rust TFHE-rs library supports true FHE with gate bootstrapping, but its **JavaScript/WASM bindings don't expose computation methods**. The JS API only provides:

- Key generation (`TfheClientKey`, `TfheServerKey`)
- Encryption/decryption (`FheUint8.encrypt_with_client_key()`, `decrypt()`)
- Serialization

The official TFHE-rs docs explicitly state: *"The JS API does not support FHE computations."*

There's no JS method like `cipher.add(other)` to compute on ciphertexts. The server would need to run native Rust, which breaks the pure TypeScript/Node.js constraint of this demo.

**Microsoft SEAL via node-seal** does expose `evaluator.add()` in JavaScript — so this demo uses BFV (leveled HE) instead. It's real homomorphic encryption with a circuit depth limit rather than unlimited bootstrapping.

When Zama AI expands their JS bindings to include compute methods, this project will upgrade to true FHE.

---

The demo is honest about what it is: **real homomorphic encryption** where the server genuinely cannot see your values, just with the constraint of finite circuit depth rather than unlimited bootstrapping.
