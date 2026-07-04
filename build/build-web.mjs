/* build-web.mjs — emit a MULTI-FILE builder into web/, where the main page is
 * thin and imports external CSS / data / JS. Runs over file:// with classic
 * <script src> tags (no ES modules, which don't load from file://).
 *
 *   web/index.html          thin page: markup + <link> + <script src> tags
 *   web/app.css             styles (generated from design tokens + app.css)
 *   web/data/argon2.js      window.CP_LIB   = "<base64 argon2 wasm lib>"
 *   web/data/wordlists.js   window.CP_BIP39 / window.CP_EFF
 *   web/js/*.js             one file per module (crypto, ui, encryptor, …)
 *
 * The wallet file the builder PRODUCES stays single-file and self-contained
 * (its CSS/library/payload are inlined) — only the builder tool is split.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tokensToCss } from './tokens-to-css.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (...p) => join(ROOT, ...p);
const read = (...p) => readFileSync(R(...p), 'utf8');
const put = (h, m, v) => h.replace(m, () => v);
function embed(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/<\/script/gi, '<\\/script');
}

const tokens = JSON.parse(read('design', 'design-tokens.json'));
const cssBundle = tokensToCss(tokens) + '\n' + read('src', 'styles', 'app.css');
const argonB64 = Buffer.from(readFileSync(R('vendor', 'hash-wasm', 'argon2.umd.min.js'))).toString('base64');
const bip39 = read('vendor', 'wordlists', 'bip39-english.txt').trim();
const eff = read('vendor', 'wordlists', 'eff-large.txt').trim();
const js = (n) => read('src', 'js', n);

// --- viewer HTML (single-file, CSS inlined; runtime placeholders kept) ---
let viewerHtml = read('src', 'templates', 'viewer.html');
viewerHtml = put(viewerHtml, '__STYLE__', cssBundle);
viewerHtml = put(viewerHtml, '__VIEWER_JS__', [js('lib-loader.js'), js('crypto.js'), js('theme.js'), js('snake.js'), js('viewer.js')].join('\n'));

// --- write the tree ---
mkdirSync(R('web', 'js'), { recursive: true });
mkdirSync(R('web', 'data'), { recursive: true });

writeFileSync(R('web', 'app.css'), cssBundle);
writeFileSync(R('web', 'data', 'argon2.js'), 'window.CP_LIB = ' + JSON.stringify(argonB64) + ';\n');
writeFileSync(R('web', 'data', 'wordlists.js'), 'window.CP_BIP39 = ' + JSON.stringify(bip39) + ';\nwindow.CP_EFF = ' + JSON.stringify(eff) + ';\n');

// builder modules (encryptor.js carries the escaped viewer template)
for (const m of ['lib-loader.js', 'crypto.js', 'theme.js', 'wordlist.js', 'passphrase.js', 'strength.js']) {
  writeFileSync(R('web', 'js', m), js(m));
}
writeFileSync(R('web', 'js', 'encryptor.js'), put(js('encryptor.js'), '__VIEWER_TEMPLATE__', embed(viewerHtml)));

// thin index.html: swap the inline style/data/js for external references
let idx = read('src', 'templates', 'encryptor.html');
idx = idx.replace(
  /<meta http-equiv="Content-Security-Policy"[^>]*>/,
  '<meta http-equiv="Content-Security-Policy" content="connect-src \'none\'; img-src \'none\'; media-src \'none\'; font-src \'none\'; object-src \'none\'; frame-src \'none\'; child-src \'none\'; manifest-src \'none\'; prefetch-src \'none\'; form-action \'none\'; base-uri \'none\'">'
);
idx = idx.replace('<style>__STYLE__</style>', '<link rel="stylesheet" href="app.css">');
idx = idx.replace(
  /<script id="argon2b64"[\s\S]*?<script>__JS__<\/script>/,
  [
    '<script src="data/argon2.js"></script>',
    '<script src="data/wordlists.js"></script>',
    '<script src="js/lib-loader.js"></script>',
    '<script src="js/crypto.js"></script>',
    '<script src="js/theme.js"></script>',
    '<script src="js/wordlist.js"></script>',
    '<script src="js/passphrase.js"></script>',
    '<script src="js/strength.js"></script>',
    '<script src="js/encryptor.js"></script>'
  ].join('\n')
);
for (const stray of ['__STYLE__', '__JS__', '__ARGON2_B64__', '__BIP39__', '__EFF__', '__VIEWER_TEMPLATE__']) {
  if (idx.includes(stray)) throw new Error('unreplaced placeholder in web/index.html: ' + stray);
}
writeFileSync(R('web', 'index.html'), idx);

console.log('built web/ multi-file builder');
console.log('  web/index.html   ' + idx.length.toLocaleString() + ' bytes (thin page)');
console.log('  web/js/          7 modules');
console.log('  web/data/        argon2.js + wordlists.js');
console.log('  web/app.css      ' + cssBundle.length.toLocaleString() + ' bytes');
