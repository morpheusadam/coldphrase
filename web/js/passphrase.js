/* passphrase.js — generates a true-random diceware passphrase from the EFF long
 * wordlist (7776 words = log2(7776) ≈ 12.925 bits/word). Six words ≈ 77.5 bits,
 * which — behind Argon2id at 256 MiB — is far beyond any feasible offline attack.
 * Uses rejection sampling so the word choice is unbiased. Encryptor page only. */
var CP = (typeof CP !== 'undefined') ? CP : {};

CP.EFF = ((typeof window !== 'undefined' && window.CP_EFF) || document.getElementById('eff').textContent).trim().split(/\s+/);
CP.PASSPHRASE_WORDS = 6;
CP.PASSPHRASE_BITS = Math.round(CP.PASSPHRASE_WORDS * Math.log2(CP.EFF.length));

// Unbiased index in [0, n) via rejection sampling on 16-bit draws.
CP.randIndex = function (n) {
  var limit = Math.floor(65536 / n) * n;
  var buf = new Uint16Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
};

CP.generatePassphrase = function () {
  var out = [];
  for (var i = 0; i < CP.PASSPHRASE_WORDS; i++) out.push(CP.EFF[CP.randIndex(CP.EFF.length)]);
  return out.join('-');
};
