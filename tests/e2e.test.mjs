/* e2e.test.mjs — drives the SHIPPED code end to end. Builds a payload with the
 * real crypto module, injects it into the viewer template extracted from
 * dist/coldphrase.html exactly as the encryptor does at runtime, then runs the
 * real viewer bundle under a minimal DOM stub and asserts it decrypts correctly —
 * including the Snake-game cover that reveals the unlock screen on a typed word. */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (...p) => join(ROOT, ...p);
let pass = 0;
const ok = (c, m) => { if (!c) { console.error('FAIL: ' + m); process.exit(1); } console.log('PASS: ' + m); pass++; };

await import(pathToFileURL(R('vendor/hash-wasm/argon2.umd.min.js')).href); // globalThis.hashwasm

const cryptoCtx = { crypto: globalThis.crypto, TextEncoder, TextDecoder, atob, btoa, console, hashwasm: globalThis.hashwasm };
vm.createContext(cryptoCtx);
vm.runInContext(readFileSync(R('src/js/crypto.js'), 'utf8'), cryptoCtx);
const CP = cryptoCtx.CP;
CP.ARGON2 = { m: 8192, t: 2, p: 1 }; // speed

const realSecret = 'real backup key 0xDEADBEEF do not share';
const decoy = 'decoy wallet holds pocket change only';
const realPw = 'primary-passphrase-alpha';
const duressPw = 'coerced-passphrase-beta';

// extract the viewer template from the built encryptor, exactly like the app does
const dist = readFileSync(R('dist/coldphrase.html'), 'utf8');
const libB64 = (() => { const s = dist.indexOf('<script id="argon2b64" type="text/plain">'); const a = dist.indexOf('>', s) + 1; return dist.slice(a, dist.indexOf('</script>', a)).trim(); })();
const encCode = dist.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];
const vs = encCode.indexOf('CP.VIEWER = `') + 'CP.VIEWER = `'.length;
const viewerTemplate = new Function('return `' + encCode.slice(vs, encCode.indexOf('`;', vs)) + '`;')();

function makeDom(argonB64) {
  const docHandlers = {};
  const el = () => {
    const e = { _text: '', value: '', hidden: false, className: '', style: {}, _html: '', children: [], handlers: {} };
    Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { e._text = v; } });
    Object.defineProperty(e, 'innerHTML', { get() { return e._html; }, set(v) { e._html = v; e.children = []; } });
    e.classList = { add(c) { e.className += ' ' + c; }, remove() {}, toggle(c) { e.className = e.className.includes(c) ? '' : c; return e.className.includes(c); }, contains(c) { return e.className.includes(c); } };
    e.appendChild = (c) => { e.children.push(c); return c; };
    e.addEventListener = (ev, fn) => { e.handlers[ev] = fn; };
    e.setAttribute = () => {}; e.getAttribute = () => null; e.focus = () => {};
    e.querySelectorAll = () => [];
    return e; // note: no getContext -> snake game rendering is skipped, detector stays armed
  };
  const ids = {};
  const get = (id) => (ids[id] || (ids[id] = el()));
  get('argon2b64').textContent = argonB64;
  return {
    _ids: ids,
    dispatchKey: (key) => (docHandlers['keydown'] || []).forEach((fn) => fn({ key, preventDefault() {} })),
    ctx: {
      crypto: globalThis.crypto, TextEncoder, TextDecoder, atob, btoa, console, WebAssembly,
      performance, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
      getComputedStyle: () => ({ getPropertyValue: () => '' }),
      document: {
        getElementById: get, createElement: el, documentElement: el(),
        addEventListener: (t, fn) => { (docHandlers[t] = docHandlers[t] || []).push(fn); }
      },
      localStorage: { getItem: () => null, setItem: () => {} },
      navigator: { clipboard: { writeText: () => Promise.resolve() } },
      window: {}
    }
  };
}

async function mount(pl) {
  const html = viewerTemplate.replace('__ARGON2LIB_B64__', () => libB64).replace('__PAYLOAD__', () => JSON.stringify(pl));
  const bundle = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];
  const dom = makeDom(libB64);
  vm.createContext(dom.ctx);
  vm.runInContext(bundle, dom.ctx);
  await dom.ctx.CP.LIB_READY;
  return dom;
}
const outOf = (dom) => (dom._ids.out && dom._ids.out._text) || '';
const statusOf = (dom) => (dom._ids.status && dom._ids.status._text) || '';

// ---- plain unlock (no disguise) ----
const payload = await CP.buildPayload({ realPw, realSecret, duress: true, duressPw, decoyText: decoy });
{
  const dom = await mount(payload); dom._ids.pw.value = realPw; await dom.ctx.CP.unlock();
  ok(outOf(dom) === realSecret, 'shipped viewer: real password decrypts the real secret');
}
{
  const dom = await mount(payload); dom._ids.pw.value = duressPw; await dom.ctx.CP.unlock();
  ok(outOf(dom) === decoy, 'shipped viewer: duress password decrypts the decoy');
}
{
  const dom = await mount(payload); dom._ids.pw.value = 'not-the-password'; await dom.ctx.CP.unlock();
  ok(outOf(dom) === '' && /Wrong password/.test(statusOf(dom)), 'shipped viewer: wrong password reveals nothing');
}

// ---- Snake-game cover ----
{
  const trig = await CP.triggerHashHex('hesam');
  const coverPayload = await CP.buildPayload({ realPw, realSecret, duress: false, placeholder: 'x', triggerHex: trig });
  const dom = await mount(coverPayload);
  const revealedBefore = !!dom.ctx.CP._revealed;
  'HESAM'.split('').forEach((ch) => dom.dispatchKey(ch)); // caps lock on — must still work
  await new Promise((r) => setTimeout(r, 60)); // let async hashing resolve
  const revealedAfter = !!dom.ctx.CP._revealed;
  dom._ids.pw.value = realPw; await dom.ctx.CP.unlock();
  ok(!revealedBefore && revealedAfter && outOf(dom) === realSecret,
     'shipped viewer: Snake cover stays hidden, reveals on the secret word (caps-insensitive), then decrypts');
}
{
  const trig = await CP.triggerHashHex('hesam');
  const coverPayload = await CP.buildPayload({ realPw, realSecret, duress: false, placeholder: 'x', triggerHex: trig });
  const dom = await mount(coverPayload);
  'wrongword'.split('').forEach((ch) => dom.dispatchKey(ch));
  await new Promise((r) => setTimeout(r, 60));
  ok(!dom.ctx.CP._revealed, 'shipped viewer: wrong typed word does not reveal the unlock screen');
}

console.log(`\nALL ${pass} E2E TESTS PASSED (build -> encrypt -> cover -> decrypt path)`);
