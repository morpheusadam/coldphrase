/* strength.js — a deliberately CONSERVATIVE, pattern-aware strength heuristic for
 * manually-typed passwords. It is an estimate, not a guarantee: it treats every
 * number it prints as an optimistic ceiling and steers the user toward the
 * generator (whose entropy is exact). Encryptor page only. */
var CP = (typeof CP !== 'undefined') ? CP : {};

CP.COMMON = {};
('password 123456 123456789 qwerty abc123 111111 12345678 iloveyou admin welcome ' +
 'monkey dragon letmein 000000 password1 qwerty123 1q2w3e4r sunshine princess football ' +
 'password123 trustwallet bitcoin ethereum seedphrase 12345 654321 superman batman qazwsx')
  .split(' ').forEach(function (w) { CP.COMMON[w] = 1; });

CP.estimateBits = function (p) {
  if (!p) return 0;
  var lower = p.toLowerCase();
  var norm = lower.replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i')
                  .replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't');
  if (CP.COMMON[lower] || CP.COMMON[norm]) return Math.min(18, p.length * 2);
  var pools = 0;
  if (/[a-z]/.test(p)) pools += 26;
  if (/[A-Z]/.test(p)) pools += 26;
  if (/[0-9]/.test(p)) pools += 10;
  if (/[^A-Za-z0-9]/.test(p)) pools += 33;
  var base = p.length * Math.log2(pools || 1);
  var penalty = 0, seq = 0, rep = 0;
  for (var i = 1; i < p.length; i++) {
    var d = p.charCodeAt(i) - p.charCodeAt(i - 1);
    if (d === 1 || d === -1) seq++;   // abcd / 4321
    if (d === 0) rep++;               // aaaa
  }
  penalty += seq * 2.2 + rep * 2.2;
  if (/^\d+$/.test(p)) penalty += p.length * 1.6;             // all digits (PIN/date)
  if (pools <= 26) penalty += p.length * 0.7;                 // single character class
  if (/^[a-zA-Z]+\d{1,4}[!@#$]?$/.test(p)) penalty += 12;     // word + digits + symbol
  return Math.max(0, base - penalty);
};

// Renders the meter. `exactBits` (optional) overrides the estimate for the
// generator, where the entropy is known precisely.
CP.updateMeter = function (p, exactBits) {
  var bits = (typeof exactBits === 'number') ? exactBits : CP.estimateBits(p);
  var bar = document.getElementById('meterBar');
  var lbl = document.getElementById('meterLabel');
  bar.style.width = Math.min(100, Math.round(bits)) + '%';
  if (!p) { bar.style.width = '0'; lbl.textContent = ''; bar.className = ''; return; }
  var note = (typeof exactBits === 'number') ? ' (true random)' : ' (estimate)';
  var level;
  if (bits < 50) level = 'weak';
  else if (bits < 66) level = 'medium';
  else if (bits < 85) level = 'strong';
  else level = 'strong';
  bar.className = 'lvl-' + level;
  var word = bits < 50 ? 'weak — crackable offline' : bits < 66 ? 'medium' : bits < 85 ? 'strong' : 'excellent';
  lbl.textContent = word + ' (~' + Math.round(bits) + ' bits)' + note;
};
