/* e2e.test.mjs — drives the SHIPPED code end to end. Builds a payload with the
 * real crypto module, injects it into the viewer template extracted from
 * dist/coldphrase.html exactly as the encryptor does at runtime, then runs the
 * real viewer bundle under a minimal DOM stub and asserts it decrypts correctly. */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (...p) => join(ROOT, ...p);
let pass = 0;
const ok = (c, m) => { if (!c) { console.error('FAIL: ' + m); process.exit(1); } console.log('PASS: ' + m); pass++; };

await import(pathToFileURL(R('vendor/hash-wasm/argon2.umd.min.js')).href); // globalThis.hashwasm

// --- load real crypto.js to build a payload (low params for speed) ---
const cryptoCtx = { crypto: globalThis.crypto, TextEncoder, TextDecoder, atob, btoa, console, hashwasm: globalThis.hashwasm };
vm.createContext(cryptoCtx);
vm.runInContext(readFileSync(R('src/js/crypto.js'), 'utf8'), cryptoCtx);
const CP = cryptoCtx.CP;
CP.ARGON2 = { m: 8192, t: 2, p: 1 };

const realSecret = 'real backup key 0xDEADBEEF do not share';
const decoy = 'decoy wallet holds pocket change only';
const realPw = 'primary-passphrase-alpha';
const duressPw = 'coerced-passphrase-beta';

// --- extract the viewer template from the built encryptor, like the app does ---
const dist = readFileSync(R('dist/coldphrase.html'), 'utf8');
const libB64 = (() => { const s = dist.indexOf('<script id="argon2b64" type="text/plain">'); const a = dist.indexOf('>', s) + 1; return dist.slice(a, dist.indexOf('</script>', a)).trim(); })();
const encCode = dist.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];
const vs = encCode.indexOf('CP.VIEWER = `') + 'CP.VIEWER = `'.length;
const viewerTemplate = new Function('return `' + encCode.slice(vs, encCode.indexOf('`;', vs)) + '`;')();

// minimal DOM stub sufficient for the viewer's unlock + render path
function makeDom(argonB64) {
  const el = () => {
    const e = { _text: '', value: '', hidden: false, className: '', style: {}, _html: '', children: [], handlers: {} };
    Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { e._text = v; } });
    Object.defineProperty(e, 'innerHTML', { get() { return e._html; }, set(v) { e._html = v; e.children = []; } });
    e.classList = { add(c) { e.className += ' ' + c; }, remove() {}, toggle(c) { e.className = e.className.includes(c) ? '' : c; return e.className.includes(c); }, contains(c) { return e.className.includes(c); } };
    e.appendChild = (c) => { e.children.push(c); return c; };
    e.addEventListener = (ev, fn) => { e.handlers[ev] = fn; };
    e.setAttribute = () => {}; e.getAttribute = () => null; e.focus = () => {};
    e.querySelectorAll = () => [];
    return e;
  };
  const ids = {};
  const get = (id) => (ids[id] || (ids[id] = el()));
  get('argon2b64').textContent = argonB64;
  const documentElement = el();
  return {
    document: { getElementById: get, createElement: el, documentElement },
    localStorage: { getItem: () => null, setItem: () => {} },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    _ids: ids
  };
}

async function runViewer(pw) {
  const html = viewerTemplate.replace('__ARGON2LIB_B64__', () => libB64).replace('__PAYLOAD__', () => JSON.stringify(payload));
  const bundle = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];
  const dom = makeDom(libB64);
  const ctx = {
    crypto: globalThis.crypto, TextEncoder, TextDecoder, atob, btoa, console, WebAssembly,
    performance, setTimeout, clearTimeout,
    document: dom.document, localStorage: dom.localStorage, navigator: dom.navigator, window: {}
  };
  vm.createContext(ctx);
  vm.runInContext(bundle, ctx);      // runs its own lib-loader (verify+eval), crypto, theme, viewer.initViewer()
  await ctx.CP.LIB_READY;
  dom._ids.pw.value = pw;
  await ctx.CP.unlock();
  return { out: (dom._ids.out && dom._ids.out._text) || '', status: (dom._ids.status && dom._ids.status._text) || '' };
}

const payload = await CP.buildPayload({ realPw, realSecret, duress: true, duressPw, decoyText: decoy });

ok((await runViewer(realPw)).out === realSecret, 'shipped viewer: real password decrypts the real secret');
ok((await runViewer(duressPw)).out === decoy, 'shipped viewer: duress password decrypts the decoy');
const wrong = await runViewer('not-the-password');
ok(wrong.out === '' && /Wrong password/.test(wrong.status), 'shipped viewer: wrong password reveals nothing');

console.log(`\nALL ${pass} E2E TESTS PASSED (full build -> encrypt -> viewer decrypt path)`);
