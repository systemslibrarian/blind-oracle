# Blind Oracle

[Live Demo](https://systemslibrarian.github.io/crypto-lab-blind-oracle/) · [Backend API](https://github.com/systemslibrarian/blind-oracle-api)

## 1. What It Is

Blind Oracle is a browser-to-server demonstration of Fully Homomorphic Encryption using TFHE-rs and gate bootstrapping over encrypted FheUint8 values. The client encrypts two inputs, the server performs homomorphic addition, and the client decrypts the encrypted result locally. This solves the problem of outsourcing computation while keeping plaintext hidden from the compute provider. The security model is asymmetric homomorphic encryption (public evaluation key on the server, secret decryption key kept client-side), with post-quantum lattice-based foundations through TFHE.

## 2. When to Use It

- Use it when you must run arithmetic on sensitive values in an untrusted cloud because TFHE-rs lets the server compute directly on ciphertexts.
- Use it for privacy-preserving analytics proofs of concept because the wire payloads and server responses stay encrypted end to end.
- Use it for zero-trust multi-tenant compute experiments because the server key enables evaluation but not plaintext recovery.
- Do not use it for low-latency, high-throughput production paths where plaintext processing is acceptable because bootstrapping and large ciphertexts add substantial performance overhead.

## 3. Live Demo

Live demo: https://systemslibrarian.github.io/crypto-lab-blind-oracle/

You can enter two secret values in the 0-255 range, encrypt and transmit them, and trigger homomorphic addition on the oracle. The UI shows ciphertext previews, response time, the oracle log, and a modal showing what the oracle received without plaintext access. Controls include SECRET VALUE A, SECRET VALUE B, ENCRYPT & TRANSMIT, COMPUTE (FHE ADD), WHAT THE ORACLE SAW, and RESET.

## 4. How to Run Locally

```bash
git clone https://github.com/systemslibrarian/crypto-lab-blind-oracle.git
cd crypto-lab-blind-oracle
npm install
npm run dev
```

Set `VITE_API_URL` (for example in `.env.development`) to the backend API URL if it is not running at the default expected endpoint.

## 5. Part of the Crypto-Lab Suite

This demo is part of the broader Crypto-Lab collection at https://systemslibrarian.github.io/crypto-lab/.

Whether you eat or drink or whatever you do, do it all for the glory of God. — 1 Corinthians 10:31