# BLIND ORACLE — Validation Findings

Date: April 2, 2026

---

## Check 1 — `tfhe` npm package (browser WASM)

**Package exists:** Yes. Published by Zama AI (TFHE-rs compiled to WASM).

**Does `FheUint8` exist in the browser WASM build?**
Yes — verified in type definitions. `FheUint8`, `FheUint32`, `FheUint128`, `FheUint256` and signed variants exist.

**Exact method signature for encrypting an integer with a client key:**
Verified: `FheUint8.encrypt_with_client_key(value, clientKey)`

**Exact method signature for homomorphic addition server-side:**
**UNVERIFIED.** The retrieved TFHE-rs JS-on-WASM documentation explicitly states:
> "The JS API does not support FHE computations."

I could not find a verified JS binding for `FheUint8.add()` or equivalent arithmetic methods in the browser WASM package. The JS bindings expose key generation, encryption, decryption, and serialization — but not computation.

**Ciphertext serialization:**
Verified: `cipher.serialize()` returns bytes (Uint8Array). `Type.deserialize(bytes)` reconstructs.
Also: `cipher.safe_serialize(limit)` and `Type.safe_deserialize(bytes, limit)`.

**Working browser example:**
The official docs show key generation, encryption, and decryption examples in browser. I could not find a browser→server→browser FHE computation example.

---

## Check 2 — `node-tfhe` (server-side Node.js)

**Package exists:** Yes. Published by Zama AI.

**Does `node-tfhe` expose a server-side compute API for `FheUint8.add()`?**
**UNVERIFIED.** The documented Node.js APIs expose:
- `TfheClientKey.generate(config)`
- `TfheServerKey.new(clientKey)`
- `set_server_key(serverKey)`
- `FheUint8.encrypt_with_client_key(value, clientKey)`
- `cipher.decrypt(clientKey)`
- `cipher.serialize()` / `Type.deserialize(bytes)`

I could not verify an explicit JS method for `cipher.add(other)` or equivalent in the `node-tfhe` package. The Rust TFHE-rs library has full arithmetic, but the JS bindings appear to be for key management and encrypt/decrypt, not evaluation.

**Can it deserialize a client-generated server key and use it for computation?**
Server key serialization/deserialization is verified. Using it for computation is **unverified** due to missing arithmetic API.

**Working Node.js example:**
Examples exist for encrypt/decrypt round-trips. I could not find a documented server-side homomorphic computation example in JS.

**Primary purpose:**
Based on available evidence, `node-tfhe` appears designed for key generation, encryption, decryption, and serialization — not server-side FHE evaluation in JS.

---

## Check 3 — SharedArrayBuffer on GitHub Pages

**Documented approach:**
TFHE-rs docs recommend `coordinator.js` for hosts without cross-origin isolation headers:
- `register_cross_origin_coordinator("/coordinator.js")`
- `init_cross_origin_worker_pool("/coordinator.js", null)`

This is TFHE's own fallback mechanism, not `coi-serviceworker`.

For full performance, cross-origin isolation headers (COOP/COEP) are recommended, which GitHub Pages does not support natively.

**Verdict:** The documented path is `coordinator.js` from TFHE-rs, not `coi-serviceworker`.

---

## Check 4 — Overall FHE JS ecosystem maturity

**Is there a complete, documented, working path from browser encrypt → server compute → browser decrypt using TFHE-rs today?**
**NO.** The JS/WASM bindings do not expose computation methods. The Rust library is full FHE; the JS bindings are a subset focused on key/cipher management.

**Production or demo examples of this pattern?**
I could not find a browser→server→browser FHE demo using `tfhe`/`node-tfhe` JS packages.

**Biggest gap:**
The prompt assumed `FheUint8.add()` exists in JS. It does not appear to. The TFHE-rs docs explicitly state the JS API does not support FHE computations.

---

## Check 5 — node-seal leveled HE accuracy

**Is BFV via node-seal correctly described as leveled HE (not FHE)?**
Yes. BFV is a leveled homomorphic encryption scheme. It supports addition and multiplication up to a noise budget ceiling. Without bootstrapping, circuit depth is limited. Calling it "leveled HE" is accurate.

**Does the current demo actually perform homomorphic addition correctly?**
Yes. The server calls `evaluator.add(ct_a, ct_b, ct_result)` using the SEAL evaluator. This is real homomorphic addition on ciphertexts.

**Is the UI claim "Homomorphic Encryption" technically defensible?**
Yes. BFV is homomorphic encryption. The term "Homomorphic Encryption" without the "Fully" qualifier is accurate and defensible. The current UI also includes an explanation noting it is leveled HE (BFV), not FHE.

---

## PATH DECISION

**Chosen path:** PATH B — Polish the SEAL Demo

**Reasoning:**
1. Check 1 and Check 2 both have critical gaps: the JS/WASM bindings do not expose FHE computation methods.
2. The TFHE-rs docs explicitly state the JS API does not support FHE computations.
3. Without a verified `add()` method in the JS bindings, there is no complete browser→server→browser FHE path.
4. The current SEAL demo is technically accurate, genuinely performs homomorphic addition, and is correctly labeled as leveled HE.
5. Polishing an honest demo is better than shipping overclaimed code against unverified APIs.

**Proceeding with PATH B implementation.**
