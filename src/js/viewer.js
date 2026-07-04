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
  var words = text.trim().split(/\s+/);
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
