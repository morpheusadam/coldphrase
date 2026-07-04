/*
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

// Verify-then-eval. Exposed as a promise every entry point awaits before using hashwasm.
CP.LIB_READY = (async function () {
  var el = document.getElementById('argon2b64');
  var bytes = CP.b64ToBytes(el.textContent.trim());
  var h = await CP.sha256hex(bytes);
  if (h !== CP.LIB_SHA256) throw new Error('lib-hash-mismatch');
  (0, eval)(new TextDecoder().decode(bytes)); // defines global `hashwasm`
})();
