/* build-verify.mjs — static integrity + feature checks on dist/coldphrase.html.
 * Confirms the embedded library/wordlists are exactly the vendored bytes, both
 * CSP policies are present, both scripts parse, and every hardened feature is
 * actually in the shipped output. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (...p) => join(ROOT, ...p);
const LIB_SHA = 'dcec617a2e1b700fa132d1583a186cb70611113395e869f2dd6cc82b415d3094';
const html = readFileSync(R('dist', 'coldphrase.html'), 'utf8');
const bip39 = readFileSync(R('vendor/wordlists/bip39-english.txt'), 'utf8').trim();
const eff = readFileSync(R('vendor/wordlists/eff-large.txt'), 'utf8').trim();

let pass = 0;
const ok = (c, m) => { if (!c) { console.error('FAIL: ' + m); process.exit(1); } console.log('PASS: ' + m); pass++; };

function tag(src, id, from = 0) {
  const s = src.indexOf(`<script id="${id}" type="text/plain">`, from);
  if (s < 0) throw new Error('missing tag ' + id);
  const a = src.indexOf('>', s) + 1, b = src.indexOf('</script>', a);
  return { text: src.slice(a, b).trim(), end: b };
}

// 1) embedded library == vendored bytes == pinned constant
const lib = tag(html, 'argon2b64');
ok(createHash('sha256').update(Buffer.from(lib.text, 'base64')).digest('hex') === LIB_SHA, 'embedded Argon2 == vendored SHA-256');
ok(html.includes(`CP.LIB_SHA256 = '${LIB_SHA}'`), 'runtime pin constant equals the vendored hash');

// 2) wordlists intact
ok(tag(html, 'bip39').text.split(/\s+/).length === 2048 && tag(html, 'bip39').text === bip39, 'BIP39 wordlist intact (2048)');
ok(tag(html, 'eff').text.split(/\s+/).length === 7776 && tag(html, 'eff').text === eff, 'EFF wordlist intact (7776)');

// 3) CSP: builder (enumerated) + viewer (default-src none, inside embedded template)
ok(/connect-src 'none'/.test(html) && /img-src 'none'/.test(html) && /form-action 'none'/.test(html), 'builder CSP blocks connect/img/form');
ok(html.includes("default-src 'none'"), 'viewer CSP uses closed default-src none allowlist');

// 4) encryptor bundle parses
const encMatch = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
ok(!!encMatch, 'found encryptor bundle');
const encCode = encMatch[1];
new vm.Script(encCode);
ok(true, 'encryptor bundle parses (' + encCode.length.toLocaleString() + ' chars)');

// 5) reconstruct + parse the embedded viewer
const vs = encCode.indexOf('CP.VIEWER = `') + 'CP.VIEWER = `'.length;
const ve = encCode.indexOf('`;', vs);
const viewerHtml = new Function('return `' + encCode.slice(vs, ve) + '`;')()
  .replace('__ARGON2LIB_B64__', () => lib.text)
  .replace('__PAYLOAD__', () => JSON.stringify({ v: 6, m: 8192, t: 2, p: 1, vols: [] }));
ok(!viewerHtml.includes('__ARGON2LIB_B64__') && !viewerHtml.includes('__PAYLOAD__'), 'viewer placeholders resolve');
const vlib = tag(viewerHtml, 'argon2b64');
ok(createHash('sha256').update(Buffer.from(vlib.text, 'base64')).digest('hex') === LIB_SHA, 'viewer carries the verified library');
const vMatch = viewerHtml.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
const vCode = vMatch[1];
new vm.Script(vCode);
ok(true, 'viewer bundle parses (' + vCode.length.toLocaleString() + ' chars)');

// 6) hardened features actually present
const feat = {
  'constant-time open loop (openVault)': vCode.includes('openVault') && encCode.includes('openVault'),
  'two-volume randomized build (buildPayload+shuffle)': encCode.includes('buildPayload') && encCode.includes('CP.shuffle'),
  'AAD parameter authentication': vCode.includes("'coldphrase|v6|'") && vCode.includes('additionalData'),
  'param clamp (DoS guard)': vCode.includes('param-out-of-range') && encCode.includes('param-out-of-range'),
  'NFKC password normalization': vCode.includes("normalize('NFKC')") && encCode.includes("normalize('NFKC')"),
  'runtime lib-hash gate': vCode.includes('lib-hash-mismatch') && encCode.includes('lib-hash-mismatch'),
  'clipboard auto-wipe': vCode.includes('45000'),
  'EFF diceware generator': encCode.includes('generatePassphrase') && encCode.includes('randIndex'),
  'conservative strength meter': encCode.includes('estimateBits') && encCode.includes('COMMON'),
  'whole-file hash reported': encCode.includes('sha256hex(CP.te.encode(html))'),
  'no fw metadata field': !encCode.includes('fw:') && !vCode.includes('P.fw'),
  'no localStorage attempt counter': !vCode.includes('setTries') && !vCode.includes("localStorage.getItem('ws"),
  'Trust Wallet word grid': encCode.includes('renderGrid') && encCode.includes('onWordPaste'),
  'masked reveal in viewer': viewerHtml.includes('secretWrap') && vCode.includes('masked'),
  'theme toggle wired': vCode.includes('initTheme') && encCode.includes('initTheme'),
};
for (const [k, v] of Object.entries(feat)) { ok(v, 'feature: ' + k); }

// 7) SHA256SUMS matches
const sums = readFileSync(R('dist', 'SHA256SUMS.txt'), 'utf8').trim().split(/\s+/)[0];
ok(createHash('sha256').update(html).digest('hex') === sums, 'dist/SHA256SUMS.txt matches the built file');

console.log(`\nALL ${pass} BUILD CHECKS PASSED`);
