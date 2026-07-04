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

// Encrypt one tagged plaintext into a volume at position `index`.
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

// Attempt to decrypt volume at position `index`. Throws on wrong key/tamper.
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
  return { v: CP.VERSION, kdf: 'argon2id', m: params.m, t: params.t, p: params.p, vols: vols };
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
