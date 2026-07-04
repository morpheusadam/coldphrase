# Changelog

ColdPhrase began as a single hand-written HTML file and was hardened across several iterations
in response to adversarial review. This log records the security-relevant evolution.

## v6.0.0 — modular, published release

**Architecture**
- Split the monolith into modular source (`src/{js,styles,templates}`) compiled by
  `build/build.mjs` into one self-contained `dist/coldphrase.html`.
- Design driven entirely by `design/design-tokens.json` (Geist terminal-minimal system);
  full English UI; light/dark theming.
- Test suites: real-crypto unit tests, build-integrity checks, and a full end-to-end
  build→encrypt→decrypt test through the shipped viewer.

**Cryptography / hardening**
- **Real duress deniability.** A separate duress password reveals a *user-chosen* decoy.
  Files always carry **two volumes in randomized order**; unlock derives keys for **all**
  volumes (constant time), removing the timing oracle. No self-incriminating locked volume in
  the no-duress case. (Replaces the old localStorage attempt-counter trick.)
- **Simplified, stronger cipher path.** Dropped the theatrical double-AES + separate HMAC for a
  single **AES-256-GCM** with all parameters bound as **AAD** (authenticated).
- **Stronger CSP.** Viewer is fully closed (`default-src 'none'`); builder enumerates every
  fetch directive to `'none'` (blocking img/beacon/form/prefetch exfiltration) while keeping the
  Blob download working.
- **Passphrase generator** upgraded to the **EFF 7776 diceware** list (~78 bits, unbiased via
  rejection sampling).
- Removed the `fw` word-count metadata field; conservative pattern-aware strength meter;
  whole-file SHA-256 reported at build.

## v5 — Trust Wallet UX
- Numbered two-column word grid with smart paste and live BIP39 validation; masked (blurred)
  output revealed on click.

## v4 — decoy mechanism (superseded)
- First deniability attempt: after two wrong passwords, showed a checksum-valid but random
  BIP39 phrase. Retired in v6 for the volume-based design (the counter was client-side and
  bypassable; the timing differed).

## v3 — Argon2id + offline integrity
- Switched KDF from PBKDF2 to **Argon2id** (memory-hard) via embedded hash-wasm; runtime
  library SHA-256 check; fully offline (library base64-inlined).

## v2 — layered WebCrypto
- PBKDF2 (1,000,000 iterations) + AES-256-GCM, native WebCrypto only, no third-party code.

## v1 — proof of concept
- Single AES-256-GCM with PBKDF2; self-decrypting HTML.

### Hardening credits
The v6 duress redesign, CSP tightening, parameter-authentication, DoS clamp, NFKC
normalization, and the honest scoping of deniability all came from adversarial security
reviews — see `docs/THREAT-MODEL.md` and `docs/DENIABILITY.md`.
