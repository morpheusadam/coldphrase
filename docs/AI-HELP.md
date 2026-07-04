# AI-HELP — Machine-Readable Project Map

Orientation for an AI agent (or a new human) modifying ColdPhrase. Read this first.

## One-paragraph summary

ColdPhrase compiles modular source into **one offline HTML file** that encrypts a crypto seed
phrase with **Argon2id → HKDF-SHA512 → AES-256-GCM** (parameters authenticated as GCM AAD),
stores it as **two randomized volumes** (real + duress decoy), and embeds a self-verifying
viewer. Build with `node build/build.mjs`; test with `npm test`.

## File responsibilities

| File | Runs on | Responsibility | Safe to edit for… |
|---|---|---|---|
| `src/js/crypto.js` | both | KDF, HKDF, GCM, AAD, volumes, shuffle, BIP39 encode. **DOM-free.** | crypto changes (update tests + bump AAD version) |
| `src/js/lib-loader.js` | both | SHA-256-verify then `eval` the Argon2 lib | integrity logic |
| `src/js/theme.js` | both | light/dark toggle | UI |
| `src/js/snake.js` | viewer | Snake-game cover + secret-word trigger → reveal unlock | cover/disguise |
| `src/js/wordlist.js` | builder | Trust Wallet word grid, paste, validation | phrase-entry UX |
| `src/js/passphrase.js` | builder | EFF diceware generator (unbiased) | generator |
| `src/js/strength.js` | builder | conservative meter (heuristic) | meter tuning |
| `src/js/encryptor.js` | builder | build flow; holds the viewer template | builder UX / packaging |
| `src/js/viewer.js` | viewer | unlock, render, mask, copy/clear | viewer UX |
| `src/templates/*.html` | — | page shells + CSP + placeholders | markup, CSP |
| `src/styles/app.css` | — | components; **colors only via `var(--…)`** | styling |
| `design/design-tokens.json` | — | the palette/typography source of truth | design system |
| `build/tokens-to-css.mjs` | build | tokens → CSS variables | token mapping |
| `build/build.mjs` | build | bundle everything → single-file `dist/coldphrase.html` | build pipeline |
| `build/build-web.mjs` | build | emit thin multi-file builder → `web/` (external css/data/js) | build pipeline |
| `vendor/**` | — | pinned third-party assets (never edit; re-vendor + update hashes) | dependency bumps |
| `tests/**` | CI/dev | crypto, build, e2e suites | always update with code |

## Invariants (do not break)

1. **Output stays a single self-contained file.** No runtime network, no external assets.
2. **`crypto.js` stays DOM-free** so `tests/crypto.test.mjs` can run it under Node.
3. **Each build/runtime placeholder appears exactly once** in the source that gets injected
   (comments must not contain the literal token) — the build/runtime replace is single-pass.
4. **Pinned hashes must match** the embedded bytes: `LIB_SHA256` in `lib-loader.js`, and the
   hashes asserted in `tests/build-verify.mjs` and `LICENSE`. Bump all together.
5. **AAD/version:** changing the wire format means bumping `CP.VERSION` and the AAD string, and
   updating both test suites.
6. **Two CSPs are intentional** (viewer strict `default-src 'none'`; builder enumerated to keep
   the Blob download working). See `docs/SECURITY-MODEL.md`.
7. **Data comes from a global with a DOM fallback.** Modules read the library and wordlists via
   `window.CP_LIB` / `window.CP_BIP39` / `window.CP_EFF` (set by `web/data/*.js` in the
   multi-file build), falling back to inline `<script id="…" type="text/plain">` elements in
   the single-file build. Keep both paths working. Two build targets — `build.mjs` (single
   file) and `build-web.mjs` (multi-file `web/`) — share the same `src/`.

## Common tasks

- **Change Argon2 cost:** edit `CP.ARGON2` in `crypto.js`; rebuild; run `npm test`.
- **Restyle:** edit `design/design-tokens.json` (not CSS colors); rebuild.
- **Bump the Argon2 library:** replace `vendor/hash-wasm/argon2.umd.min.js`, then update
  `LIB_SHA256` (in `lib-loader.js`), the hash in `LICENSE`, and `LIB_SHA` in
  `tests/build-verify.mjs`. Rebuild + test.
- **Add a docs page:** add under `docs/`, link it from `README.md`.

## Verify your change

```bash
npm test      # crypto.test → build → build-verify → e2e ; all must pass
```

A green run means: the crypto round-trips (incl. duress + tamper rejection), the built file
embeds the exact vendored bytes with matching hashes and both CSPs, every hardened feature is
present, and a phrase encrypted by the builder decrypts through the real viewer.
