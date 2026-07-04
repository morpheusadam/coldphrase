# Architecture

## Design decision: modular source, single-file output

The **output must be one self-contained file** — that is the product: double-click, works
offline, nothing to install, portable to a USB stick or air-gapped machine. But a single
2000-line HTML file is unmaintainable. So the **source is modular** and a small build collapses
it into one file.

Why not ship multiple runtime files (`index.html` + `app.js` + `app.css`)? Two reasons:
1. **ES modules do not load over `file://`** (CORS), and offline double-click use is `file://`.
2. A single portable artifact is the entire point.

So modularity lives at *build time*, not *runtime*.

## Repository layout

```
coldphrase/
├─ README.md                     front door (SEO, quick start, doc index)
├─ LICENSE                       MIT + third-party notices with pinned hashes
├─ package.json                  scripts: build, test (no install needed)
│
├─ design/
│  └─ design-tokens.json         SINGLE source of visual truth (Geist terminal system)
│
├─ src/
│  ├─ templates/
│  │  ├─ encryptor.html          builder shell + CSP + placeholders
│  │  └─ viewer.html             wallet-file shell + CSP + placeholders
│  ├─ styles/
│  │  └─ app.css                 components; colors only via var(--…)
│  └─ js/
│     ├─ lib-loader.js           runtime SHA-256 check → eval Argon2   (both pages)
│     ├─ crypto.js               DOM-free crypto core                  (both pages)
│     ├─ theme.js                light/dark toggle                     (both pages)
│     ├─ wordlist.js             Trust Wallet word grid                (builder)
│     ├─ passphrase.js           EFF diceware generator                (builder)
│     ├─ strength.js             conservative strength meter           (builder)
│     ├─ encryptor.js            build flow + embedded viewer template (builder)
│     └─ viewer.js               unlock + render flow                  (viewer)
│
├─ vendor/
│  ├─ hash-wasm/argon2.umd.min.js
│  └─ wordlists/{bip39-english.txt, eff-large.txt}
│
├─ build/
│  ├─ tokens-to-css.mjs          design-tokens.json → CSS custom properties
│  └─ build.mjs                  the bundler
│
├─ tests/
│  ├─ crypto.test.mjs            runs the real crypto core (round-trip, duress, tamper)
│  ├─ build-verify.mjs           static integrity + feature checks on dist
│  └─ e2e.test.mjs               build → encrypt → decrypt through shipped viewer
│
├─ dist/
│  ├─ coldphrase.html            the built builder app
│  └─ SHA256SUMS.txt             integrity anchor
└─ docs/                         this documentation set
```

## Build pipeline (`build/build.mjs`)

```
design-tokens.json ─▶ tokens-to-css ─▶ CSS variables ─┐
src/styles/app.css ───────────────────────────────────┤
                                                       ├─▶ CSS bundle
                                                       │
src/js/{lib-loader,crypto,theme,viewer}.js ─▶ viewer JS bundle ─┐
src/templates/viewer.html + CSS bundle ────────────────────────┤
   (keeps __ARGON2LIB_B64__ and __PAYLOAD__ as RUNTIME placeholders)
                                                                ├─▶ viewer HTML
                                                                │       │ escaped for a JS
                                                                │       ▼ template literal
src/js/{lib-loader,crypto,theme,wordlist,passphrase,strength,encryptor}.js
   with the escaped viewer injected into encryptor.js  ─▶ encryptor JS bundle
src/templates/encryptor.html + CSS bundle + argon2(base64) + wordlists + JS bundle
                                                                └─▶ dist/coldphrase.html
                                                                        └─▶ SHA256SUMS.txt
```

Two placeholder tiers:
- **Build-time** (`__STYLE__`, `__JS__`, `__ARGON2_B64__`, `__BIP39__`, `__EFF__`,
  `__VIEWER_TEMPLATE__`) — resolved by `build.mjs`. The build asserts none survive.
- **Runtime** (`__ARGON2LIB_B64__`, `__PAYLOAD__`) — left inside the viewer template and
  resolved by `encryptor.js` when a user encrypts a phrase, so the generated wallet file
  embeds its own verified library and ciphertext.

### Template-literal embedding

The viewer HTML is embedded in `encryptor.js` as a JS template literal. `build.mjs` escapes it
(`\` → `\\`, `` ` `` → `` \` ``, `${` → `\${`, `</script` → `<\/script`) so the outer `<script>`
never closes early and regexes/escapes survive one level of template-literal evaluation. All
placeholder substitutions use replacement **functions**, not strings, to avoid `$&`/`$1`
surprises — and each marker appears exactly once (the source comments deliberately avoid the
literal tokens) so a single-pass replace is unambiguous.

## Namespacing

All modules attach to a single global `CP` object (`var CP = (typeof CP !== 'undefined') ? CP :
{}`). Because the build concatenates modules into one `<script>`, this shares state cleanly in
the browser; in Node tests, the same file is run in a `vm` context and `CP` is read back out.
`crypto.js` is deliberately **DOM-free** so it runs unchanged under Node for unit testing.
