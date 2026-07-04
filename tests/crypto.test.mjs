/* crypto.test.mjs — exercises the REAL src/js/crypto.js against the vendored
 * Argon2 build. Uses low KDF params for speed; correctness is independent of the
 * cost parameters (the shipped 256 MiB/t=4 is asserted separately, not run). */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BIP39 = readFileSync(join(ROOT, 'vendor/wordlists/bip39-english.txt'), 'utf8').trim().split(/\s+/);

// Run the vendored Argon2 UMD for its side effect: it attaches `hashwasm` to
// globalThis (the browser-path branch of its environment detection).
await import(pathToFileURL(join(ROOT, 'vendor/hash-wasm/argon2.umd.min.js')).href);

// Load the REAL browser script (src/js/crypto.js) in a sandbox with the same
// globals the browser provides. This tests the exact shipped code.
const ctx = {
  crypto: globalThis.crypto, TextEncoder, TextDecoder, atob, btoa, console,
  hashwasm: globalThis.hashwasm
};
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'src/js/crypto.js'), 'utf8'), ctx);
const CP = ctx.CP;

let pass = 0;
function ok(c, m) { if (!c) { console.error('FAIL: ' + m); process.exit(1); } console.log('PASS: ' + m); pass++; }

const SHIPPED = { m: 262144, t: 4, p: 1 };
ok(CP.ARGON2.m === SHIPPED.m && CP.ARGON2.t === SHIPPED.t && CP.ARGON2.p === SHIPPED.p,
   'shipped Argon2 params are 256 MiB / t=4 / p=1');
CP.ARGON2 = { m: 8192, t: 2, p: 1 }; // speed for the rest

const realSecret = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
const decoy = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';
const realPw = 'correct-horse-battery-staple-ostrich-mango';
const duressPw = 'hand-this-one-over-42';

(async () => {
  // ---- duress ON ----
  const pd = await CP.buildPayload({ realPw, realSecret, duress: true, duressPw, decoyText: decoy });
  ok(pd.vols.length === 2, 'payload always has exactly two volumes');
  ok(await CP.openVault(realPw, pd) === realSecret, 'duress ON: real password reveals real secret');
  ok(await CP.openVault(duressPw, pd) === decoy, 'duress ON: duress password reveals decoy');
  ok(await CP.openVault('nope-nope-nope', pd) === null, 'duress ON: wrong password reveals nothing');

  // exactly one volume opens with the real pw under duress (the other is the decoy)
  let realOpens = 0;
  for (let i = 0; i < 2; i++) { try { const t = await CP.tryVolume(realPw, pd.vols[i], pd, i); if (t[0] === 'P') realOpens++; } catch (e) {} }
  ok(realOpens === 1, 'duress ON: exactly one volume carries the primary tag');

  // ---- volume order is randomized ----
  const seen = new Set();
  for (let n = 0; n < 8; n++) {
    const p = await CP.buildPayload({ realPw, realSecret, duress: true, duressPw, decoyText: decoy });
    for (let i = 0; i < 2; i++) { try { const t = await CP.tryVolume(realPw, p.vols[i], p, i); if (t[0] === 'P') seen.add(i); } catch (e) {} }
  }
  ok(seen.has(0) && seen.has(1), 'volume order is randomized (primary appears in both slots across runs)');

  // ---- duress OFF: no un-openable volume ----
  const po = await CP.buildPayload({ realPw, realSecret, duress: false, placeholder: 'nothing here' });
  ok(await CP.openVault(realPw, po) === realSecret, 'duress OFF: real password reveals real secret');
  let opened = 0;
  for (let i = 0; i < 2; i++) { try { await CP.tryVolume(realPw, po.vols[i], po, i); opened++; } catch (e) {} }
  ok(opened === 2, 'duress OFF: both volumes open with the real password (no incriminating locked volume)');
  ok(await CP.openVault('wrong-wrong-wrong', po) === null, 'duress OFF: wrong password reveals nothing');

  // ---- tamper ----
  const tp = JSON.parse(JSON.stringify(pd)); tp.m = 4096;
  ok(await CP.openVault(realPw, tp) === null, 'parameter tampering (m in AAD) breaks authentication');
  const tc = JSON.parse(JSON.stringify(pd));
  for (const v of tc.vols) { const raw = CP.b64(v.ct); raw[0] ^= 0xff; v.ct = CP.b64buf(raw); }
  ok(await CP.openVault(realPw, tc) === null && await CP.openVault(duressPw, tc) === null,
     'ciphertext tampering is rejected (both volumes)');

  // ---- param clamp (DoS guard) ----
  let clamped = false;
  try { await CP.aesKey('x', new Uint8Array(32), { m: 9999999, t: 2, p: 1 }, 'decrypt'); }
  catch (e) { clamped = e.message === 'param-out-of-range'; }
  ok(clamped, 'absurd memory parameter is refused before running the KDF');

  // ---- BIP39 vectors (decoy generator) ----
  ok(await CP.phraseFromEntropy(new Uint8Array(16), BIP39) ===
     'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
     'BIP39 checksum encoder matches the official zero-entropy vector');

  // ---- cover trigger (Snake disguise) ----
  const th = await CP.triggerHashHex('Hesam');      // stored hash lowercases the word
  ok(!/hesam/i.test(th) && th.length === 64, 'trigger: only a SHA-256 hash is produced (word not embedded)');
  ok(await CP.triggerMatches('hesam', th), 'trigger: exact word matches');
  ok(await CP.triggerMatches('wasdhesam', th), 'trigger: matches as a suffix while playing');
  ok(await CP.triggerMatches('HESAM', th), 'trigger: uppercase (caps lock) still matches');
  ok(!(await CP.triggerMatches('hesa', th)), 'trigger: partial word does not match');
  ok(!(await CP.triggerMatches('helloworld', th)), 'trigger: unrelated typing does not match');
  const pt = await CP.buildPayload({ realPw, realSecret, duress: false, placeholder: 'x', triggerHex: th });
  ok(pt.trig === th, 'trigger: hash is carried in the payload when disguising');
  const pn = await CP.buildPayload({ realPw, realSecret, duress: false, placeholder: 'x' });
  ok(!('trig' in pn), 'trigger: no trig field when disguise is off');

  console.log(`\nALL ${pass} CRYPTO TESTS PASSED`);
})().catch(e => { console.error(e); process.exit(1); });
