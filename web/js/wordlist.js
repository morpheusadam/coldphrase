/* wordlist.js — Trust Wallet-style numbered word grid for entering a BIP39
 * recovery phrase across two columns, with smart paste and live validation
 * against the official 2048-word list. Encryptor page only. */
var CP = (typeof CP !== 'undefined') ? CP : {};

CP.BIP39 = ((typeof window !== 'undefined' && window.CP_BIP39) || document.getElementById('bip39').textContent).trim().split(/\s+/);
CP.wordCount = 12; // 0 => free-text mode

CP.gridInputs = function () {
  return Array.prototype.slice.call(document.querySelectorAll('#grid input'));
};

CP.renderGrid = function () {
  var g = document.getElementById('grid');
  g.innerHTML = '';
  if (!CP.wordCount) return;
  g.style.gridTemplateRows = 'repeat(' + Math.ceil(CP.wordCount / 2) + ', auto)';
  for (var i = 0; i < CP.wordCount; i++) {
    var chip = document.createElement('div'); chip.className = 'chip';
    var n = document.createElement('span'); n.className = 'chip-n'; n.textContent = i + 1;
    var inp = document.createElement('input');
    inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false;
    inp.setAttribute('data-idx', i);
    inp.addEventListener('paste', CP.onWordPaste);
    inp.addEventListener('keydown', CP.onWordKey);
    inp.addEventListener('input', CP.onWordInput);
    chip.appendChild(n); chip.appendChild(inp); g.appendChild(chip);
  }
};

CP.onWordPaste = function (e) {
  var text = (e.clipboardData || window.clipboardData).getData('text');
  var words = text.trim().toLowerCase().split(/\s+/);
  if (words.length < 2) return;
  e.preventDefault();
  var ins = CP.gridInputs();
  var start = parseInt(e.target.getAttribute('data-idx'), 10);
  if (words.length >= CP.wordCount) start = 0;
  for (var i = 0; i < words.length && start + i < ins.length; i++) {
    ins[start + i].value = words[i]; CP.validateWord(ins[start + i]);
  }
  ins[Math.min(start + words.length, ins.length) - 1].focus();
};

CP.onWordKey = function (e) {
  var idx = parseInt(e.target.getAttribute('data-idx'), 10);
  var ins = CP.gridInputs();
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (idx + 1 < ins.length) ins[idx + 1].focus(); }
  else if (e.key === 'Backspace' && !e.target.value && idx > 0) { e.preventDefault(); ins[idx - 1].focus(); }
};

CP.onWordInput = function (e) { CP.validateWord(e.target); };

CP.validateWord = function (inp) {
  var v = inp.value.trim().toLowerCase();
  inp.parentElement.className = (v && CP.BIP39.indexOf(v) < 0) ? 'chip invalid' : 'chip';
};

CP.readSecret = function () {
  if (!CP.wordCount) {
    var t = document.getElementById('secret').value.trim();
    return t || null;
  }
  var vals = CP.gridInputs().map(function (i) { return i.value.trim().toLowerCase(); });
  if (vals.some(function (v) { return !v; })) return null;
  return vals.join(' ');
};

CP.clearWords = function () {
  CP.gridInputs().forEach(function (i) { i.value = ''; i.parentElement.className = 'chip'; });
  var s = document.getElementById('secret'); if (s) s.value = '';
};

CP.initWordGrid = function () {
  document.getElementById('tabs').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    CP.wordCount = parseInt(btn.getAttribute('data-count'), 10);
    var free = !CP.wordCount;
    document.getElementById('grid').hidden = free;
    document.getElementById('secret').hidden = !free;
    CP.renderGrid();
  });
  CP.renderGrid();
};
