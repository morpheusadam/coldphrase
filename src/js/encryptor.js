/* encryptor.js — wires the builder UI: word grid, duress panel, passphrase
 * generator, strength meter, and the "encrypt & download" flow. It embeds the
 * viewer template (below), injects the verified library + the encrypted payload,
 * and hands back a single self-contained wallet file plus its whole-file SHA-256.
 * The viewer-template placeholder on the CP.VIEWER line below is the ONLY marker
 * occurrence, so the build's single-pass replace targets it (never a comment). */
var CP = (typeof CP !== 'undefined') ? CP : {};

CP.LIB_B64 = CP.libB64();
CP.VIEWER = `__VIEWER_TEMPLATE__`;

CP.setStatus = function (html, cls, asHtml) {
  var st = document.getElementById('status');
  st.className = 'status ' + (cls || '');
  if (asHtml) st.innerHTML = html; else st.textContent = html;
};

CP.initEncryptor = function () {
  CP.initTheme();
  CP.initWordGrid();

  document.getElementById('duressHead').addEventListener('click', function (e) {
    var cb = document.getElementById('duressOn');
    if (e.target.id !== 'duressOn') cb.checked = !cb.checked;
    document.getElementById('duressBody').hidden = !cb.checked;
  });

  document.getElementById('disguiseHead').addEventListener('click', function (e) {
    var cb = document.getElementById('disguiseOn');
    if (e.target.id !== 'disguiseOn') cb.checked = !cb.checked;
    document.getElementById('disguiseBody').hidden = !cb.checked;
  });

  // Auto-generate a fake decoy: a random VALID BIP39 phrase + a duress password.
  // The button's own text changes on click, so it is obvious the click registered.
  document.getElementById('genDecoy').addEventListener('click', async function () {
    var btn = this, orig = btn.textContent;
    var note = document.getElementById('decoyNote');
    btn.textContent = '⏳ generating…';
    try {
      if (window.console) console.log('[ColdPhrase] generate fake: clicked');
      var phrase = await CP.phraseFromEntropy(crypto.getRandomValues(new Uint8Array(16)), CP.BIP39);
      var dp = CP.generatePassphrase();
      document.getElementById('decoy').value = phrase;
      document.getElementById('dpw1').value = dp;
      document.getElementById('dpw2').value = dp;
      btn.textContent = '✓ done';
      note.className = 'status ok';
      note.innerHTML = 'Decoy password (write it down): <code>' + dp + '</code><br>' +
        'You may replace it with something easier to remember — the decoy is worthless, so its password need not be strong. Note: a generated decoy is an <b>empty</b> wallet; a funded real wallet is more convincing under real coercion.';
      setTimeout(function () { btn.textContent = orig; }, 2000);
    } catch (e) {
      btn.textContent = '✗ error';
      note.className = 'status err';
      note.textContent = 'Could not generate: ' + (e && e.message ? e.message : e);
      if (window.console) console.error('[ColdPhrase] generate fake failed:', e);
      setTimeout(function () { btn.textContent = orig; }, 3000);
    }
  });

  document.getElementById('genPw').addEventListener('click', function () {
    var phrase = CP.generatePassphrase();
    document.getElementById('pw1').value = phrase;
    document.getElementById('pw2').value = phrase;
    CP.updateMeter(phrase, CP.PASSPHRASE_BITS);
    CP.setStatus('Generated passphrase (write it down now): <code>' + phrase + '</code>', 'ok', true);
  });

  document.getElementById('pw1').addEventListener('input', function () { CP.updateMeter(this.value); });

  document.getElementById('build').addEventListener('click', CP.build);
};

CP.build = async function () {
  var btn = document.getElementById('build');
  var p1 = document.getElementById('pw1').value;
  var p2 = document.getElementById('pw2').value;

  var secret = CP.readSecret();
  if (secret === null) { CP.setStatus(CP.wordCount ? 'Fill in all ' + CP.wordCount + ' words.' : 'Secret is empty.', 'err'); return; }
  if (p1.length < 10) { CP.setStatus('Main password must be at least 10 characters — use the generator.', 'err'); return; }
  if (p1 !== p2) { CP.setStatus('Main passwords do not match.', 'err'); return; }

  var duressOn = document.getElementById('duressOn').checked;
  var decoy = '', dpw = '';
  if (duressOn) {
    decoy = document.getElementById('decoy').value.trim();
    dpw = document.getElementById('dpw1').value;
    var dpw2 = document.getElementById('dpw2').value;
    if (!decoy) { CP.setStatus('Enter decoy content, or turn off duress mode.', 'err'); return; }
    if (dpw.length < 10) { CP.setStatus('Duress password must be at least 10 characters.', 'err'); return; }
    if (dpw !== dpw2) { CP.setStatus('Duress passwords do not match.', 'err'); return; }
    if (dpw === p1) { CP.setStatus('Duress password must differ from the main password.', 'err'); return; }
  }

  var disguiseOn = document.getElementById('disguiseOn').checked;
  var triggerWord = document.getElementById('trigger').value.trim();
  if (disguiseOn && triggerWord.length < CP.TRIG_MIN) {
    CP.setStatus('Secret word must be at least ' + CP.TRIG_MIN + ' letters (or turn off the disguise).', 'err'); return;
  }

  btn.disabled = true;
  CP.setStatus('Encrypting with Argon2id (256 MiB, two volumes)… this takes a few seconds.', '');
  try {
    await CP.LIB_READY;
    var triggerHex = disguiseOn ? await CP.triggerHashHex(triggerWord) : null;
    var payload = await CP.buildPayload({
      realPw: p1,
      realSecret: secret,
      duress: duressOn,
      duressPw: dpw,
      decoyText: decoy,
      placeholder: 'This vault has no secondary content configured.',
      triggerHex: triggerHex
    });

    var html = CP.VIEWER
      .replace('__ARGON2LIB_B64__', function () { return CP.LIB_B64; })
      .replace('__PAYLOAD__', function () { return JSON.stringify(payload); });

    var fileHash = await CP.sha256hex(CP.te.encode(html));
    var filename = disguiseOn ? 'snake-game.html' : 'wallet-secret.html';
    var blob = new Blob([html], { type: 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);

    CP.clearWords();
    if (document.getElementById('decoy')) document.getElementById('decoy').value = '';
    ['pw1', 'pw2', 'dpw1', 'dpw2'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
    CP.updateMeter('', 0);
    CP.setStatus(
      'Created <b>' + filename + '</b>.' +
      (disguiseOn ? '<br>It opens as a Snake game; type your secret word to reveal the unlock screen.' : '') +
      '<br>Whole-file SHA-256 (record this off the machine to detect tampering):' +
      '<br><code>' + fileHash + '</code><br>Test it with every password before deleting the original.',
      'ok', true);
  } catch (e) {
    CP.setStatus((e && e.message === 'lib-hash-mismatch')
      ? 'The embedded Argon2 library was modified — build aborted.'
      : 'Error: ' + (e && e.message ? e.message : e), 'err');
  }
  btn.disabled = false;
};

CP.initEncryptor();
