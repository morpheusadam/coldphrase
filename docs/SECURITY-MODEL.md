# Security Model — Defenses in Depth

Each layer is independent; a failure in one does not collapse the others.

## 1. Memory-hard KDF
Argon2id (256 MiB, t=4) makes each password guess expensive in **RAM bandwidth**, not just
CPU cycles — the mechanism that defeats GPU/ASIC brute-force farms. See
[BENCHMARKS.md](BENCHMARKS.md).

## 2. Authenticated encryption with authenticated parameters
AES-256-GCM provides confidentiality **and** integrity. The KDF parameters, version, volume
index, and salt are bound into the GCM **AAD**, so downgrade/tamper attempts on the header
fail closed. A parameter clamp (`m ≤ 1 GiB`, `t ≤ 16`, `p ≤ 4`) rejects a malicious header
*before* the KDF runs, closing a memory-exhaustion DoS.

## 3. Network lockdown (Content-Security-Policy)
Two policies, matched to each page's job:

| Page | Policy | Rationale |
|---|---|---|
| **Viewer** (holds the decrypted secret) | `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'` | Fully closed: no network sink of any kind. The viewer never downloads, so nothing is relaxed. |
| **Builder** (must download the file) | Every fetch directive (`connect/img/media/font/object/frame/child/manifest/prefetch`) set to `'none'`, plus `form-action 'none'` — **without** `default-src`, so the in-memory Blob download still works. | Blocks exfiltration channels (fetch, XHR, WebSocket, beacon, tracking pixel, form GET, prefetch) while preserving the save-file action. |

**Honest limit:** CSP cannot constrain `window.location`/top-level navigation reliably
(`navigate-to` is effectively unshipped), and it does **not** apply to browser extensions. CSP
raises the ceiling; it is not an absolute "no data leaves." See
[THREAT-MODEL.md](THREAT-MODEL.md).

## 4. Runtime code integrity
Before the embedded Argon2 library executes, its bytes are SHA-256'd and compared to a pinned
constant; a mismatch aborts and warns. This catches accidental corruption and a lazy
tamperer. It is **self-referential** — a fully-replaced file could rewrite the constant — so
the authoritative anchor is the **whole-file SHA-256** printed at build time and published in
`dist/SHA256SUMS.txt`. Verify it out of band.

## 5. Secret hygiene in the UI
- Output is **masked (blurred)** until the user clicks to reveal.
- The clipboard is **auto-wiped 45 s** after a copy.
- Secrets are rendered with `textContent` / `createElement` only — never `innerHTML` — so a
  malicious phrase cannot inject markup or script.
- Password fields use `autocomplete="new-password"`; the phrase inputs disable spellcheck.

## 6. Randomness
All salts, IVs, passphrase words, and volume ordering come from `crypto.getRandomValues`
(CSPRNG). The passphrase generator uses rejection sampling to avoid modulo bias.

## Vendored components (pinned)

| Component | Purpose | SHA-256 |
|---|---|---|
| hash-wasm `argon2.umd.min.js` | Argon2id KDF (WASM) | `dcec617a2e1b700fa132d1583a186cb70611113395e869f2dd6cc82b415d3094` |
| BIP39 English wordlist | phrase validation / decoy | `2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda` |
| EFF Large wordlist | passphrase generator | `6d557f0693958fb5e650b68b5bee585eb82cf4da32965505c789e924743bc522` |

These hashes are asserted by `tests/build-verify.mjs` against the bytes embedded in the
built file, so a modified dependency fails the build.
