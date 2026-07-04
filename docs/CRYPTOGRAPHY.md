# Cryptography

ColdPhrase uses only standard, audited primitives, executed by the browser's native
**WebCrypto** implementation and the **hash-wasm** Argon2 build. No hand-rolled ciphers.

## Overview

```
                 ┌─────────────────────── per volume ───────────────────────┐
password ─NFKC─▶ Argon2id ─▶ 32-byte IKM ─▶ HKDF-SHA512 ─▶ AES-256-GCM key ─▶ AES-256-GCM ─▶ ciphertext
                 (salt,m,t,p)                (info label)                       ▲
                                                                                │
             version | m | t | p | index | salt  ─────────────────────────────┘  (GCM AAD)
```

## 1. Key derivation — Argon2id

| Parameter | Value | Reason |
|---|---|---|
| Algorithm | Argon2id | Hybrid: resists both GPU (data-independent) and side-channel (data-dependent) attacks. Winner of the Password Hashing Competition; RFC 9106. |
| Memory `m` | 262 144 KiB (256 MiB) | Memory-hardness is the point: every guess costs 256 MiB, which collapses GPU/ASIC parallelism. 8× the OWASP minimum. |
| Passes `t` | 4 | Time cost on top of memory cost. |
| Lanes `p` | 1 | Single-threaded; deterministic across devices. |
| Output | 32 bytes | Feeds HKDF. |

The password is normalized with **Unicode NFKC** before hashing so the same phrase typed on
a different OS/keyboard yields the same bytes (prevents permanent lockout — see
[FAQ](FAQ.md)).

**Parameter clamp (DoS guard).** Before running Argon2 on decrypt, ColdPhrase rejects any
`m > 1 GiB`, `t > 16`, or `p > 4`. Without this, a tampered header could set `m` absurdly high
and make the victim's browser exhaust memory during unlock.

## 2. Key separation — HKDF-SHA-512

The 32-byte Argon2 output is expanded through **HKDF-SHA-512** (RFC 5869) with a fixed `info`
label (`coldphrase-v6-aeskey`) and the volume salt, producing the AES-256 key. HKDF gives
clean domain separation between "what Argon2 produces" and "the key a cipher uses," and lets
future versions derive additional independent keys without re-running the expensive KDF.

## 3. Encryption — AES-256-GCM with authenticated parameters

Each volume is sealed with **AES-256-GCM**: a 96-bit random IV, a 128-bit authentication tag,
and — critically — **Additional Authenticated Data (AAD)** equal to the canonical header:

```
coldphrase|v6|<m>|<t>|<p>|<index>|<salt-base64>
```

Because GCM authenticates the AAD, **any** change to the version, cost parameters, volume
index, or salt causes decryption to fail. This single mechanism replaces the redundant
"double AES + separate HMAC" of earlier drafts: one authenticated cipher, with the metadata
folded into its integrity guarantee. Swapping two volumes also fails, since each volume's AAD
pins its index.

Randomness (salt, IV) comes from `crypto.getRandomValues` (CSPRNG). A fresh 256-bit salt and
96-bit IV are generated **per volume**, so no nonce is ever reused.

## 4. Volumes & tagging

A file always contains **exactly two volumes**, stored in cryptographically-random order.
Each plaintext is prefixed with a one-byte tag: `P` (primary secret) or `D` (decoy). On
unlock, ColdPhrase derives a key and attempts decryption for **every** volume — with no early
exit — then reveals the `P` plaintext if one decrypted, else the `D`. Deriving all keys
regardless of the password removes the timing oracle that would otherwise reveal *which*
password was entered. See [DENIABILITY.md](DENIABILITY.md).

## 5. Wordlists

- **BIP39 English (2048 words)** — used to validate the entered recovery phrase and to
  synthesize a checksum-valid throwaway decoy when duress mode is off.
- **EFF Large (7776 words)** — used only by the passphrase generator (below).

Both are the official published lists, pinned by SHA-256 (see [LICENSE](../LICENSE)).

## 6. Passphrase generator

The generator draws 6 words from the EFF list using **rejection sampling** on 16-bit CSPRNG
draws, which eliminates modulo bias. Entropy is exact:

```
H = words × log2(7776) = 6 × 12.925 ≈ 77.5 bits
```

Unlike the strength meter (a heuristic), the generator's entropy is a guarantee, because the
words are chosen uniformly at random. This is the recommended way to pick a password.

## Test vectors

`tests/crypto.test.mjs` runs the real `src/js/crypto.js` and checks: round-trip for the real
and duress passwords, rejection of wrong passwords, randomized volume order, parameter- and
ciphertext-tamper rejection, the DoS clamp, and the BIP39 checksum encoder against the
official zero-entropy vector. `tests/e2e.test.mjs` decrypts through the fully-built viewer.
