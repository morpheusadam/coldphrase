/* encryptor.js — wires the builder UI: word grid, duress panel, passphrase
 * generator, strength meter, and the "encrypt & download" flow. It embeds the
 * viewer template (below), injects the verified library + the encrypted payload,
 * and hands back a single self-contained wallet file plus its whole-file SHA-256.
 * The viewer-template placeholder on the CP.VIEWER line below is the ONLY marker
 * occurrence, so the build's single-pass replace targets it (never a comment). */
var CP = (typeof CP !== 'undefined') ? CP : {};

CP.LIB_B64 = CP.libB64();
CP.VIEWER = `<!doctype html>
<!-- Snake — a small offline browser game. -->
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Snake</title>
<style>/* Generated from Cipher Tool Design System v1.0.0 — do not edit; edit the tokens. */
:root {
  --bg: #000000;
  --bg-2: #0a0a0a;
  --bg-3: #111111;
  --hover: #141414;
  --fg: #ededed;
  --fg-2: #a1a1a1;
  --fg-3: #7d7d7d;
  --fg-inverse: #000000;
  --border: #262626;
  --border-input: #333333;
  --border-input-hover: #525252;
  --focus: #52a8ff;
  --accent: #52a8ff;
  --success: #3dd68c;
  --success-bg: #0a1f14;
  --warning: #f5a623;
  --warning-bg: #231a0a;
  --error: #ff6166;
  --error-bg: #2a0e0f;
  --font-mono: 'Geist Mono', 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
  --font-sans: 'Geist', 'Inter', -apple-system, 'Segoe UI', sans-serif;
  --radius: 6px;
  --radius-sm: 4px;
  --radius-full: 9999px;
  --space: 4px;
}
[data-theme="light"] {
  --bg: #ffffff;
  --bg-2: #fafafa;
  --bg-3: #f2f2f2;
  --hover: #f5f5f5;
  --fg: #000000;
  --fg-2: #666666;
  --fg-3: #999999;
  --fg-inverse: #ffffff;
  --border: #eaeaea;
  --border-input: #d4d4d4;
  --border-input-hover: #a1a1a1;
  --focus: #0068d6;
  --accent: #0068d6;
  --success: #0f7b3d;
  --success-bg: #eafaf1;
  --warning: #a35200;
  --warning-bg: #fff4e5;
  --error: #e5484d;
  --error-bg: #fdecec;
}
/* app.css — component styles for ColdPhrase. All colors come from CSS variables
 * generated out of design/design-tokens.json (see build/tokens-to-css.mjs), so
 * this file never hardcodes a palette. Aesthetic: Geist terminal-minimal —
 * monospace-first, flat, 1px hairline borders, no shadows, small radii. */

* { box-sizing: border-box; margin: 0; }

/* The \`hidden\` attribute must win over component display rules
   (.grid/.actions set display, which would otherwise override it). */
[hidden] { display: none !important; }

body {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.6;
  padding: 48px 24px;
  -webkit-font-smoothing: antialiased;
}

.wrap { width: 100%; max-width: 560px; }

.topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.brand { font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--fg-2); }
.brand b { color: var(--fg); }

.hero {
  font-family: var(--font-mono);
  white-space: pre;
  text-align: center;
  color: var(--fg);
  font-size: clamp(6px, 1.5vw, 11px);
  line-height: 1.1;
  user-select: none;
  margin-bottom: 8px;
}
.tagline { text-align: center; color: var(--fg-2); font-size: 12px; margin-bottom: 28px; }

.card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
}

h1 { font-size: 20px; font-weight: 600; letter-spacing: -0.01em; margin-bottom: 6px; }
p.sub { color: var(--fg-2); font-size: 13px; line-height: 1.7; margin-bottom: 4px; }
ul.layers { margin: 10px 0 4px; padding-inline-start: 18px; color: var(--fg-2); font-size: 12px; line-height: 1.9; }

label {
  display: block; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--fg-2); margin: 18px 0 8px;
}
.row-label { display: flex; align-items: center; justify-content: space-between; }

/* tabs */
.tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); margin: 8px 0 14px; }
.tabs button {
  border: 0; background: transparent; color: var(--fg-2); font-family: var(--font-mono);
  font-size: 12px; padding: 8px 10px; cursor: pointer; border-bottom: 2px solid transparent;
  transition: color 120ms;
}
.tabs button:hover { color: var(--fg); }
.tabs button.active { color: var(--fg); border-bottom-color: var(--fg); }

/* word grid — Trust Wallet structure, terminal skin */
.grid { display: grid; grid-template-columns: 1fr 1fr; grid-auto-flow: column; gap: 8px; direction: ltr; }
.chip {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-2); border: 1px solid var(--border-input); border-radius: var(--radius);
  padding: 8px 10px; transition: border-color 120ms;
}
.chip:focus-within { border-color: var(--focus); box-shadow: 0 0 0 2px var(--focus); }
.chip.invalid { border-color: var(--error); }
.chip-n { color: var(--fg-3); font-size: 11px; min-width: 16px; text-align: center; user-select: none; }
.chip input, .chip-w {
  flex: 1; width: 100%; min-width: 0; background: transparent; border: 0; outline: 0;
  color: var(--fg); font-family: var(--font-mono); font-size: 13px; direction: ltr; text-align: left;
  text-transform: lowercase;
}

textarea, input.pwd {
  width: 100%; background: var(--bg); color: var(--fg);
  border: 1px solid var(--border-input); border-radius: var(--radius);
  padding: 10px 12px; font-family: var(--font-mono); font-size: 14px; outline: 0;
  transition: border-color 120ms;
}
textarea { min-height: 90px; resize: vertical; direction: ltr; text-align: left; }
textarea:hover, input.pwd:hover { border-color: var(--border-input-hover); }
textarea:focus, input.pwd:focus { border-color: var(--focus); box-shadow: 0 0 0 2px var(--focus); }

/* buttons */
.btn {
  font-family: var(--font-mono); font-weight: 500; cursor: pointer; border-radius: var(--radius);
  transition: background-color 120ms, border-color 120ms, color 120ms;
}
.btn-primary {
  margin-top: 20px; width: 100%; padding: 13px; font-size: 14px;
  background: var(--fg); color: var(--bg); border: 1px solid var(--fg);
}
.btn-primary:hover { background: transparent; color: var(--fg); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; background: var(--fg); color: var(--bg); }
.btn-ghost {
  background: transparent; color: var(--fg-2); border: 1px solid transparent;
  padding: 5px 10px; font-size: 12px;
}
.btn-ghost:hover { color: var(--fg); background: var(--hover); }
.btn-secondary {
  background: transparent; color: var(--fg); border: 1px solid var(--border-input);
  padding: 11px; font-size: 13px;
}
.btn-secondary:hover { border-color: var(--border-input-hover); background: var(--hover); }

/* duress panel */
.duress { margin-top: 18px; border: 1px dashed var(--border-input); border-radius: var(--radius); padding: 14px; }
.duress .head { display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--fg-2); font-size: 12px; }
.duress .head:hover { color: var(--fg); }
.duress .body { margin-top: 8px; }

/* strength meter */
#meter { height: 3px; border-radius: var(--radius-full, 9999px); background: var(--bg-3); margin-top: 8px; overflow: hidden; }
#meter div { height: 100%; width: 0; transition: width 180ms, background-color 180ms; background: var(--fg-3); }
#meter div.lvl-weak { background: var(--error); }
#meter div.lvl-medium { background: var(--warning); }
#meter div.lvl-strong { background: var(--success); }
#meterLabel { font-size: 11px; margin-top: 6px; color: var(--fg-2); min-height: 16px; }

/* status + callout */
.status { margin-top: 14px; font-size: 12px; line-height: 1.7; min-height: 18px; word-break: break-word; color: var(--fg-2); }
.status.ok { color: var(--success); }
.status.err { color: var(--error); }
code {
  background: var(--bg-3); border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 1px 5px; font-family: var(--font-mono); font-size: 11px; direction: ltr; display: inline-block;
  color: var(--fg); word-break: break-all;
}
.callout {
  margin-top: 18px; padding: 12px 14px; background: var(--warning-bg);
  border: 1px solid var(--warning); border-radius: var(--radius);
  font-size: 12px; color: var(--warning); line-height: 1.9;
}

/* snake cover */
.gamecard { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.gamehud { display: flex; justify-content: space-between; align-items: baseline; width: 100%; font-size: 12px; color: var(--fg-2); }
.gamehud #score { color: var(--fg); letter-spacing: 0.04em; }
.gamehud .hint { color: var(--fg-3); }
#board { width: 100%; max-width: 480px; height: auto; aspect-ratio: 1 / 1; image-rendering: pixelated; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); }
#gameover { font-size: 13px; color: var(--warning); letter-spacing: 0.02em; }

/* viewer output */
#secretWrap { margin-top: 18px; cursor: pointer; }
#secretWrap.masked .content { filter: blur(9px); }
.chip-w { text-transform: none; }
pre#out {
  padding: 12px; background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius);
  white-space: pre-wrap; word-break: break-word; font-family: var(--font-mono); font-size: 14px;
  direction: ltr; text-align: left; color: var(--fg);
}
#revealHint { text-align: center; color: var(--fg-2); font-size: 11px; margin-top: 10px; user-select: none; }
.actions { display: flex; gap: 8px; margin-top: 14px; }
.actions button { flex: 1; }
</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">
    <span class="brand" id="brand">▌ <b>SNAKE</b></span>
    <button type="button" class="btn btn-ghost" id="themeToggle">[ light ]</button>
  </div>

  <!-- cover: a real, playable Snake game -->
  <div id="game">
    <div class="card gamecard">
      <div class="gamehud"><span id="score">score 0</span><span class="hint">arrow keys &middot; space to restart</span></div>
      <canvas id="board" width="480" height="480"></canvas>
      <div id="gameover" hidden>game over &mdash; press space</div>
    </div>
  </div>

  <!-- revealed only when the secret word is typed -->
  <div id="vault" hidden>
    <div class="card">
      <h1>Recover</h1>
      <p class="sub">Enter your password. Everything runs offline, in memory only; the network is blocked and nothing is written to disk.</p>
      <label>Password</label>
      <input type="password" id="pw" class="pwd" autocomplete="off">
      <button id="open" class="btn btn-primary">Unlock</button>
      <div id="status" class="status"></div>
      <div id="secretWrap" hidden>
        <div class="content">
          <div class="grid" id="outGrid" hidden></div>
          <pre id="out" hidden></pre>
        </div>
        <div id="revealHint"></div>
      </div>
      <div class="actions" id="actions" hidden>
        <button id="copy" class="btn btn-secondary">Copy</button>
        <button id="hide" class="btn btn-secondary">Hide</button>
      </div>
    </div>
  </div>
</div>

<script id="argon2b64" type="text/plain">__ARGON2LIB_B64__<\/script>
<script>/*
 * lib-loader.js — verifies the embedded Argon2 (hash-wasm) library at runtime,
 * then evaluates it. The SHA-256 is pinned as a constant; if the embedded bytes
 * do not match, the library is NOT executed and the app refuses to run.
 *
 * Honest scope: this catches accidental corruption and a lazy tamperer. It does
 * NOT defend against a fully-replaced HTML file (an attacker would also rewrite
 * this constant). The only real integrity anchor is comparing the WHOLE-FILE
 * SHA-256 against the value published in the repository, out of band.
 */
var CP = (typeof CP !== 'undefined') ? CP : {};

CP.LIB_SHA256 = 'dcec617a2e1b700fa132d1583a186cb70611113395e869f2dd6cc82b415d3094';

CP.b64ToBytes = function (b64) {
  var bin = atob(b64);
  var a = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
};

CP.sha256hex = async function (bytes) {
  var d = await crypto.subtle.digest('SHA-256', bytes);
  var a = new Uint8Array(d), s = '';
  for (var i = 0; i < a.length; i++) s += a[i].toString(16).padStart(2, '0');
  return s;
};

// Source the base64 either from an external data file (window.CP_LIB, multi-file
// build) or an inline <script id="argon2b64"> element (single-file build).
CP.libB64 = function () {
  if (typeof window !== 'undefined' && window.CP_LIB) return window.CP_LIB.trim();
  return document.getElementById('argon2b64').textContent.trim();
};

// Verify-then-eval. Exposed as a promise every entry point awaits before using hashwasm.
CP.LIB_READY = (async function () {
  var bytes = CP.b64ToBytes(CP.libB64());
  var h = await CP.sha256hex(bytes);
  if (h !== CP.LIB_SHA256) throw new Error('lib-hash-mismatch');
  (0, eval)(new TextDecoder().decode(bytes)); // defines global \`hashwasm\`
})();

/*
 * crypto.js — the cryptographic core. DOM-free and environment-agnostic, so it
 * runs unchanged in the browser and under Node for the test suite.
 *
 * Scheme (per volume):
 *   Argon2id(pw, salt, m,t,p) -> HKDF-SHA512 -> AES-256-GCM
 *   All public header fields (version, m, t, p, volume index, salt) are bound
 *   into the GCM Additional Authenticated Data (AAD), so tampering with any
 *   parameter — or swapping two volumes — breaks authentication.
 *
 * A vault file always contains exactly TWO volumes in randomized order. Each
 * plaintext carries a 1-byte tag: 'P' = primary secret, 'D' = decoy/placeholder.
 * Unlock derives keys for ALL volumes (constant time regardless of which
 * password was entered), then reveals the primary if present, else the decoy.
 */
var CP = (typeof CP !== 'undefined') ? CP : {};

CP.VERSION = 6;
CP.ARGON2 = { m: 262144, t: 4, p: 1 };          // 256 MiB, 4 passes, 1 lane
CP.M_MAX = 1048576; CP.T_MAX = 16; CP.P_MAX = 4; // clamp: refuse absurd params before running the KDF
CP.TAG_PRIMARY = 'P';
CP.TAG_DECOY = 'D';
CP.te = new TextEncoder();

CP.b64buf = function (buf) {
  var a = new Uint8Array(buf), s = '';
  for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
};
CP.b64 = function (s) {
  var bin = atob(s);
  var a = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
};
CP.concatBytes = function (list) {
  var len = 0; list.forEach(function (a) { len += a.length; });
  var out = new Uint8Array(len), off = 0;
  list.forEach(function (a) { out.set(a, off); off += a.length; });
  return out;
};

// AAD binds every public header field so params/index/salt are authenticated.
CP.aad = function (m, t, p, i, saltB64) {
  return CP.te.encode('coldphrase|v6|' + m + '|' + t + '|' + p + '|' + i + '|' + saltB64);
};

CP.aesKey = async function (pw, salt, params, usage) {
  if (!(params.m <= CP.M_MAX && params.t <= CP.T_MAX && params.p <= CP.P_MAX &&
        params.m > 0 && params.t > 0 && params.p > 0)) {
    throw new Error('param-out-of-range');
  }
  var ikm = await hashwasm.argon2id({
    password: pw.normalize('NFKC'), salt: salt,
    parallelism: params.p, iterations: params.t, memorySize: params.m,
    hashLength: 32, outputType: 'binary'
  });
  var hk = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-512', salt: salt, info: CP.te.encode('coldphrase-v6-aeskey') },
    hk, { name: 'AES-GCM', length: 256 }, false, [usage]);
};

// Encrypt one tagged plaintext into a volume at position \`index\`.
CP.encVolume = async function (pw, taggedPlaintext, params, index) {
  var salt = crypto.getRandomValues(new Uint8Array(32));
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var key = await CP.aesKey(pw, salt, params, 'encrypt');
  var sB = CP.b64buf(salt);
  var ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv, additionalData: CP.aad(params.m, params.t, params.p, index, sB) },
    key, CP.te.encode(taggedPlaintext));
  return { salt: sB, iv: CP.b64buf(iv), ct: CP.b64buf(new Uint8Array(ct)) };
};

// Attempt to decrypt volume at position \`index\`. Throws on wrong key/tamper.
CP.tryVolume = async function (pw, vol, params, index) {
  var salt = CP.b64(vol.salt);
  var key = await CP.aesKey(pw, salt, params, 'decrypt');
  var pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: CP.b64(vol.iv), additionalData: CP.aad(params.m, params.t, params.p, index, vol.salt) },
    key, CP.b64(vol.ct));
  return new TextDecoder().decode(pt);
};

// Try EVERY volume (no early exit => constant number of Argon2 runs => no timing
// oracle for which password was entered). Returns the primary if any volume
// decrypts to a 'P' tag, else the decoy 'D', else null.
CP.openVault = async function (pw, payload) {
  var results = [];
  for (var i = 0; i < payload.vols.length; i++) {
    try { results.push(await CP.tryVolume(pw, payload.vols[i], payload, i)); }
    catch (e) { results.push(null); }
  }
  var primary = null, decoy = null;
  for (var j = 0; j < results.length; j++) {
    var r = results[j];
    if (r === null) continue;
    if (r.charAt(0) === CP.TAG_PRIMARY && primary === null) primary = r.slice(1);
    else if (r.charAt(0) === CP.TAG_DECOY && decoy === null) decoy = r.slice(1);
  }
  return primary !== null ? primary : decoy;
};

// Cryptographically-seeded Fisher–Yates shuffle (randomizes volume order so the
// real secret is not always in slot 0).
CP.shuffle = function (arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var r = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    var t = arr[i]; arr[i] = arr[r]; arr[r] = t;
  }
  return arr;
};

// Build a complete 2-volume payload.
//   realPw/realSecret     : always present (tagged 'P')
//   duress=true           : second volume is decoyText under duressPw (tagged 'D')
//   duress=false          : second volume is an innocuous note under the SAME realPw
//                           (tagged 'D') so there is never an un-openable volume to
//                           incriminate the user.
CP.buildPayload = async function (opts) {
  var params = CP.ARGON2;
  var plan = [
    { pw: opts.realPw, text: CP.TAG_PRIMARY + opts.realSecret }
  ];
  if (opts.duress) {
    plan.push({ pw: opts.duressPw, text: CP.TAG_DECOY + opts.decoyText });
  } else {
    plan.push({ pw: opts.realPw, text: CP.TAG_DECOY + (opts.placeholder || 'No decoy configured for this vault.') });
  }
  CP.shuffle(plan);
  var vols = [];
  for (var i = 0; i < plan.length; i++) {
    vols.push(await CP.encVolume(plan[i].pw, plan[i].text, params, i));
  }
  var payload = { v: CP.VERSION, kdf: 'argon2id', m: params.m, t: params.t, p: params.p, vols: vols };
  if (opts.triggerHex) payload.trig = opts.triggerHex; // Snake-game disguise: reveal on secret word
  return payload;
};

// BIP39-valid mnemonic from raw entropy (used for throwaway decoys; deterministic checksum).
CP.phraseFromEntropy = async function (entBytes, wordlist) {
  var ent = new Uint8Array(entBytes);
  var digest = new Uint8Array(await crypto.subtle.digest('SHA-256', ent));
  var bits = '';
  for (var i = 0; i < ent.length; i++) bits += ent[i].toString(2).padStart(8, '0');
  var csBits = ent.length * 8 / 32, dBits = '';
  for (var j = 0; j < Math.ceil(csBits / 8); j++) dBits += digest[j].toString(2).padStart(8, '0');
  bits += dBits.slice(0, csBits);
  var n = bits.length / 11, out = [];
  for (var k = 0; k < n; k++) out.push(wordlist[parseInt(bits.slice(k * 11, k * 11 + 11), 2)]);
  return out.join(' ');
};

// ---- cover trigger (Snake-game disguise) ----
// The wallet file can masquerade as a Snake game; typing a secret word reveals
// the unlock screen. We store only SHA-256(lowercased word) so the word itself
// is not written into the file. Case-insensitive by construction.
CP.TRIG_MIN = 3;
CP.TRIG_MAX = 16;
CP.sha256hex = async function (bytes) {
  var d = await crypto.subtle.digest('SHA-256', bytes);
  var a = new Uint8Array(d), s = '';
  for (var i = 0; i < a.length; i++) s += a[i].toString(16).padStart(2, '0');
  return s;
};
CP.triggerHashHex = function (word) {
  return CP.sha256hex(CP.te.encode(word.toLowerCase()));
};
// True if any recent suffix (length TRIG_MIN..TRIG_MAX) of \`buffer\` hashes to
// \`storedHex\`. Length is not revealed by the stored hash.
CP.triggerMatches = async function (buffer, storedHex) {
  var b = buffer.toLowerCase();
  for (var L = CP.TRIG_MIN; L <= CP.TRIG_MAX && L <= b.length; L++) {
    if (await CP.sha256hex(CP.te.encode(b.slice(-L))) === storedHex) return true;
  }
  return false;
};

/* theme.js — light/dark toggle. Default is dark (per design tokens). Preference
 * is remembered locally; this is UI state only and never leaves the machine. */
var CP = (typeof CP !== 'undefined') ? CP : {};

CP.initTheme = function () {
  var root = document.documentElement;
  var saved;
  try { saved = localStorage.getItem('cp-theme'); } catch (e) { saved = null; }
  root.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
  var btn = document.getElementById('themeToggle');
  if (!btn) return;
  function label() { btn.textContent = root.getAttribute('data-theme') === 'light' ? '[ dark ]' : '[ light ]'; }
  label();
  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('cp-theme', next); } catch (e) {}
    label();
  });
};

/* snake.js — the cover. When the file carries a trigger hash it opens as a plain
 * Snake game; typing the secret word (any casing) reveals the unlock screen. The
 * game is a genuine, playable canvas game so casual inspection sees only a game.
 * Movement uses arrow keys only, so letters typed for the trigger never disturb
 * play. DOM-only glue; the hashing/matching lives in crypto.js (testable). */
var CP = (typeof CP !== 'undefined') ? CP : {};

CP.revealUnlock = function () {
  var game = document.getElementById('game');
  if (game) game.hidden = true;
  var brand = document.getElementById('brand');
  if (brand) brand.innerHTML = '▌ <b>RECOVER</b>';
  document.getElementById('vault').hidden = false;
  var pw = document.getElementById('pw');
  if (pw) pw.focus();
  CP._revealed = true;
  if (CP._snakeTimer) { clearInterval(CP._snakeTimer); CP._snakeTimer = null; }
};

CP.initSnake = function (triggerHex, onReveal) {
  // ---- secret-word detector (runs regardless of whether the canvas exists) ----
  var buf = '';
  document.addEventListener('keydown', function (e) {
    if (CP._revealed) return;
    if (e.key && e.key.length === 1) {
      buf = (buf + e.key).slice(-CP.TRIG_MAX);
      CP.triggerMatches(buf, triggerHex).then(function (hit) { if (hit && !CP._revealed) onReveal(); });
    }
  });

  var canvas = document.getElementById('board');
  if (!canvas || !canvas.getContext) return; // headless / no canvas: detector still armed
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('score');
  var overEl = document.getElementById('gameover');

  var GRID = 24, CELL = canvas.width / GRID;
  var css = function (name, fallback) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; }
    catch (e) { return fallback; }
  };
  var snake, dir, nextDir, food, score, alive;

  function reset() {
    snake = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
    dir = { x: 1, y: 0 }; nextDir = dir; score = 0; alive = true;
    placeFood(); if (overEl) overEl.hidden = true; updateScore();
  }
  function placeFood() {
    do {
      food = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 };
    } while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
  }
  function updateScore() { if (scoreEl) scoreEl.textContent = 'score ' + score; }

  function step() {
    if (CP._revealed) return;
    if (!alive) return;
    dir = nextDir;
    var head = { x: (snake[0].x + dir.x + GRID) % GRID, y: (snake[0].y + dir.y + GRID) % GRID };
    if (snake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
      alive = false; if (overEl) overEl.hidden = false; draw(); return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { score++; updateScore(); placeFood(); }
    else snake.pop();
    draw();
  }
  function draw() {
    var bg = css('--bg', '#000'), accent = css('--accent', '#52a8ff'), fg = css('--fg', '#ededed'), border = css('--border', '#262626');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
    ctx.fillStyle = accent; ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);
    for (var i = 0; i < snake.length; i++) {
      ctx.fillStyle = i === 0 ? fg : css('--fg-2', '#a1a1a1');
      ctx.fillRect(snake[i].x * CELL + 1, snake[i].y * CELL + 1, CELL - 2, CELL - 2);
    }
  }

  document.addEventListener('keydown', function (e) {
    if (CP._revealed) return;
    var k = e.key;
    if (k === 'ArrowUp' && dir.y === 0) nextDir = { x: 0, y: -1 };
    else if (k === 'ArrowDown' && dir.y === 0) nextDir = { x: 0, y: 1 };
    else if (k === 'ArrowLeft' && dir.x === 0) nextDir = { x: -1, y: 0 };
    else if (k === 'ArrowRight' && dir.x === 0) nextDir = { x: 1, y: 0 };
    else if ((k === ' ' || k === 'Enter') && !alive) reset();
    else return;
    e.preventDefault();
  });

  reset(); draw();
  CP._snakeTimer = setInterval(step, 110);
};

/* viewer.js — the logic embedded in every generated wallet file. Prompts for a
 * password, derives keys for ALL volumes (constant time), and reveals the secret
 * (or the decoy under a duress password). Output is masked until clicked, and the
 * clipboard is auto-wiped 45 s after a copy. The payload placeholder on the P line
 * below is the ONLY marker occurrence, so the encryptor's single-pass replace at
 * write time targets it (never this comment). */
var CP = (typeof CP !== 'undefined') ? CP : {};
var P = __PAYLOAD__;
var SHOWN = '';
var clipTimer = null;

CP.renderSecret = function (text) {
  SHOWN = text;
  var words = text.trim().split(/\\s+/);
  var isPhrase = [12, 15, 18, 21, 24].indexOf(words.length) >= 0 &&
                 words.every(function (w) { return /^[a-zA-Z]+$/.test(w); });
  var grid = document.getElementById('outGrid'), pre = document.getElementById('out');
  if (isPhrase) {
    grid.innerHTML = '';
    grid.style.gridTemplateRows = 'repeat(' + Math.ceil(words.length / 2) + ', auto)';
    for (var i = 0; i < words.length; i++) {
      var chip = document.createElement('div'); chip.className = 'chip';
      var n = document.createElement('span'); n.className = 'chip-n'; n.textContent = i + 1;
      var w = document.createElement('span'); w.className = 'chip-w'; w.textContent = words[i];
      chip.appendChild(n); chip.appendChild(w); grid.appendChild(chip);
    }
    grid.hidden = false; pre.hidden = true;
  } else { pre.textContent = text; pre.hidden = false; grid.hidden = true; }
  var wrap = document.getElementById('secretWrap');
  wrap.hidden = false; wrap.classList.add('masked');
  document.getElementById('revealHint').textContent = 'click to reveal';
  document.getElementById('actions').hidden = false;
  document.getElementById('status').textContent = '';
  document.getElementById('status').className = 'status';
};

CP.unlock = async function () {
  var pw = document.getElementById('pw').value;
  var st = document.getElementById('status');
  var btn = document.getElementById('open');
  if (!pw) { st.textContent = 'Enter a password.'; st.className = 'status err'; return; }
  btn.disabled = true;
  st.textContent = 'Decrypting… Argon2id takes a few seconds by design.'; st.className = 'status';
  try {
    await CP.LIB_READY;
    var secret = await CP.openVault(pw, P);
    if (secret !== null) CP.renderSecret(secret);
    else { st.textContent = 'Wrong password (or the file has been tampered with).'; st.className = 'status err'; }
  } catch (e) {
    st.textContent = (e && e.message === 'lib-hash-mismatch')
      ? 'Security warning: the embedded library was modified — do not trust this file.'
      : 'Error processing file.';
    st.className = 'status err';
  }
  btn.disabled = false;
};

CP.initViewer = function () {
  CP.initTheme();
  // Cover mode: if the file carries a trigger hash, start as a Snake game and
  // reveal the unlock screen only when the secret word is typed. Otherwise show
  // the unlock screen directly.
  if (P.trig) {
    CP.initSnake(P.trig, CP.revealUnlock);
  } else {
    var g = document.getElementById('game'); if (g) g.hidden = true;
    var b = document.getElementById('brand'); if (b) b.innerHTML = '▌ <b>RECOVER</b>';
    document.getElementById('vault').hidden = false;
  }
  document.getElementById('open').addEventListener('click', CP.unlock);
  document.getElementById('pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') CP.unlock(); });
  document.getElementById('secretWrap').addEventListener('click', function () {
    this.classList.toggle('masked');
    document.getElementById('revealHint').textContent = this.classList.contains('masked') ? 'click to reveal' : 'click to hide';
  });
  document.getElementById('copy').addEventListener('click', function () {
    navigator.clipboard.writeText(SHOWN).then(function () {
      var st = document.getElementById('status');
      st.textContent = 'Copied. Clipboard auto-clears in 45 s.'; st.className = 'status ok';
      if (clipTimer) clearTimeout(clipTimer);
      clipTimer = setTimeout(function () { navigator.clipboard.writeText('—').catch(function () {}); }, 45000);
    });
  });
  document.getElementById('hide').addEventListener('click', function () {
    SHOWN = '';
    document.getElementById('outGrid').innerHTML = '';
    document.getElementById('out').textContent = '';
    document.getElementById('secretWrap').hidden = true;
    document.getElementById('actions').hidden = true;
    document.getElementById('pw').value = '';
    document.getElementById('status').textContent = '';
  });
};

CP.initViewer();
<\/script>
</body>
</html>
`;

CP.setStatus = function (html, cls, asHtml) {
  var st = document.getElementById('status');
  st.className = 'status ' + (cls || '');
  if (asHtml) st.innerHTML = html; else st.textContent = html;
};

CP.initEncryptor = function () {
  CP.initTheme();
  CP.initWordGrid();

  document.getElementById('duressHead').addEventListener('click', function (e) {
    var cb = document.getElementById('duressOn');
    if (e.target.id !== 'duressOn') cb.checked = !cb.checked;
    document.getElementById('duressBody').hidden = !cb.checked;
  });

  document.getElementById('disguiseHead').addEventListener('click', function (e) {
    var cb = document.getElementById('disguiseOn');
    if (e.target.id !== 'disguiseOn') cb.checked = !cb.checked;
    document.getElementById('disguiseBody').hidden = !cb.checked;
  });

  // Auto-generate a fake decoy: a random VALID BIP39 phrase + a duress password.
  // The button's own text changes on click, so it is obvious the click registered.
  document.getElementById('genDecoy').addEventListener('click', async function () {
    var btn = this, orig = btn.textContent;
    var note = document.getElementById('decoyNote');
    btn.textContent = '⏳ generating…';
    try {
      if (window.console) console.log('[ColdPhrase] generate fake: clicked');
      var phrase = await CP.phraseFromEntropy(crypto.getRandomValues(new Uint8Array(16)), CP.BIP39);
      var dp = CP.generatePassphrase();
      document.getElementById('decoy').value = phrase;
      document.getElementById('dpw1').value = dp;
      document.getElementById('dpw2').value = dp;
      btn.textContent = '✓ done';
      note.className = 'status ok';
      note.innerHTML = 'Decoy password (write it down): <code>' + dp + '</code><br>' +
        'You may replace it with something easier to remember — the decoy is worthless, so its password need not be strong. Note: a generated decoy is an <b>empty</b> wallet; a funded real wallet is more convincing under real coercion.';
      setTimeout(function () { btn.textContent = orig; }, 2000);
    } catch (e) {
      btn.textContent = '✗ error';
      note.className = 'status err';
      note.textContent = 'Could not generate: ' + (e && e.message ? e.message : e);
      if (window.console) console.error('[ColdPhrase] generate fake failed:', e);
      setTimeout(function () { btn.textContent = orig; }, 3000);
    }
  });

  document.getElementById('genPw').addEventListener('click', function () {
    var phrase = CP.generatePassphrase();
    document.getElementById('pw1').value = phrase;
    document.getElementById('pw2').value = phrase;
    CP.updateMeter(phrase, CP.PASSPHRASE_BITS);
    CP.setStatus('Generated passphrase (write it down now): <code>' + phrase + '</code>', 'ok', true);
  });

  document.getElementById('pw1').addEventListener('input', function () { CP.updateMeter(this.value); });

  document.getElementById('build').addEventListener('click', CP.build);
};

CP.build = async function () {
  var btn = document.getElementById('build');
  var p1 = document.getElementById('pw1').value;
  var p2 = document.getElementById('pw2').value;

  var secret = CP.readSecret();
  if (secret === null) { CP.setStatus(CP.wordCount ? 'Fill in all ' + CP.wordCount + ' words.' : 'Secret is empty.', 'err'); return; }
  if (p1.length < 10) { CP.setStatus('Main password must be at least 10 characters — use the generator.', 'err'); return; }
  if (p1 !== p2) { CP.setStatus('Main passwords do not match.', 'err'); return; }

  var duressOn = document.getElementById('duressOn').checked;
  var decoy = '', dpw = '';
  if (duressOn) {
    decoy = document.getElementById('decoy').value.trim();
    dpw = document.getElementById('dpw1').value;
    var dpw2 = document.getElementById('dpw2').value;
    if (!decoy) { CP.setStatus('Enter decoy content, or turn off duress mode.', 'err'); return; }
    if (dpw.length < 10) { CP.setStatus('Duress password must be at least 10 characters.', 'err'); return; }
    if (dpw !== dpw2) { CP.setStatus('Duress passwords do not match.', 'err'); return; }
    if (dpw === p1) { CP.setStatus('Duress password must differ from the main password.', 'err'); return; }
  }

  var disguiseOn = document.getElementById('disguiseOn').checked;
  var triggerWord = document.getElementById('trigger').value.trim();
  if (disguiseOn && triggerWord.length < CP.TRIG_MIN) {
    CP.setStatus('Secret word must be at least ' + CP.TRIG_MIN + ' letters (or turn off the disguise).', 'err'); return;
  }

  btn.disabled = true;
  CP.setStatus('Encrypting with Argon2id (256 MiB, two volumes)… this takes a few seconds.', '');
  try {
    await CP.LIB_READY;
    var triggerHex = disguiseOn ? await CP.triggerHashHex(triggerWord) : null;
    var payload = await CP.buildPayload({
      realPw: p1,
      realSecret: secret,
      duress: duressOn,
      duressPw: dpw,
      decoyText: decoy,
      placeholder: 'This vault has no secondary content configured.',
      triggerHex: triggerHex
    });

    var html = CP.VIEWER
      .replace('__ARGON2LIB_B64__', function () { return CP.LIB_B64; })
      .replace('__PAYLOAD__', function () { return JSON.stringify(payload); });

    var fileHash = await CP.sha256hex(CP.te.encode(html));
    var filename = disguiseOn ? 'snake-game.html' : 'wallet-secret.html';
    var blob = new Blob([html], { type: 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);

    CP.clearWords();
    if (document.getElementById('decoy')) document.getElementById('decoy').value = '';
    ['pw1', 'pw2', 'dpw1', 'dpw2'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
    CP.updateMeter('', 0);
    CP.setStatus(
      'Created <b>' + filename + '</b>.' +
      (disguiseOn ? '<br>It opens as a Snake game; type your secret word to reveal the unlock screen.' : '') +
      '<br>Whole-file SHA-256 (record this off the machine to detect tampering):' +
      '<br><code>' + fileHash + '</code><br>Test it with every password before deleting the original.',
      'ok', true);
  } catch (e) {
    CP.setStatus((e && e.message === 'lib-hash-mismatch')
      ? 'The embedded Argon2 library was modified — build aborted.'
      : 'Error: ' + (e && e.message ? e.message : e), 'err');
  }
  btn.disabled = false;
};

CP.initEncryptor();
