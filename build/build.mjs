/* build.mjs — assemble the modular sources into ONE self-contained offline file.
 *
 *   dist/coldphrase.html   the builder app (what you open)
 *   dist/SHA256SUMS.txt    integrity anchor for the builder
 *
 * The builder embeds the viewer as a runtime template; when a user encrypts a
 * phrase, the builder injects the verified Argon2 library and the ciphertext
 * payload into that template and hands back a standalone wallet file.
 *
 * Why one file instead of many at runtime: ES modules do not load over file://,
 * and a single portable file is the entire point (double-click, works offline,
 * nothing to install). Modularity lives in SOURCE; the build collapses it.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tokensToCss } from './tokens-to-css.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (...p) => join(ROOT, ...p);
const read = (...p) => readFileSync(R(...p), 'utf8');

// Escape a string so it can live inside a JS template literal that itself sits
// inside a <script> element. Order matters: backslashes first.
function embed(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/<\/script/gi, '<\\/script');
}
// Replace a unique placeholder without $-substitution surprises.
const put = (haystack, marker, value) => haystack.replace(marker, () => value);

// ---- inputs ----
const tokens = JSON.parse(read('design', 'design-tokens.json'));
const cssVars = tokensToCss(tokens);
const appCss = read('src', 'styles', 'app.css');
const cssBundle = cssVars + '\n' + appCss;

const argonB64 = Buffer.from(readFileSync(R('vendor', 'hash-wasm', 'argon2.umd.min.js'))).toString('base64');
const bip39 = read('vendor', 'wordlists', 'bip39-english.txt').trim();
const eff = read('vendor', 'wordlists', 'eff-large.txt').trim();

const js = (name) => read('src', 'js', name);
const viewerBundle = [js('lib-loader.js'), js('crypto.js'), js('theme.js'), js('viewer.js')].join('\n');
const encModules = [js('lib-loader.js'), js('crypto.js'), js('theme.js'),
                    js('wordlist.js'), js('passphrase.js'), js('strength.js'), js('encryptor.js')].join('\n');

// ---- viewer HTML (keeps __ARGON2LIB_B64__ and __PAYLOAD__ as runtime placeholders) ----
let viewerHtml = read('src', 'templates', 'viewer.html');
viewerHtml = put(viewerHtml, '__STYLE__', cssBundle);
viewerHtml = put(viewerHtml, '__VIEWER_JS__', viewerBundle);

// ---- encryptor JS: inject the escaped viewer template ----
const encBundle = put(encModules, '__VIEWER_TEMPLATE__', embed(viewerHtml));

// ---- encryptor HTML ----
let encHtml = read('src', 'templates', 'encryptor.html');
encHtml = put(encHtml, '__STYLE__', cssBundle);
encHtml = put(encHtml, '__ARGON2_B64__', argonB64);
encHtml = put(encHtml, '__BIP39__', bip39);
encHtml = put(encHtml, '__EFF__', eff);
encHtml = put(encHtml, '__JS__', encBundle);

// sanity: no stray build-time placeholders survive
for (const m of ['__STYLE__', '__JS__', '__VIEWER_TEMPLATE__', '__ARGON2_B64__', '__BIP39__', '__EFF__', '__VIEWER_JS__']) {
  if (encHtml.includes(m)) throw new Error('unreplaced placeholder in output: ' + m);
}

mkdirSync(R('dist'), { recursive: true });
writeFileSync(R('dist', 'coldphrase.html'), encHtml);

const sha = createHash('sha256').update(encHtml).digest('hex');
writeFileSync(R('dist', 'SHA256SUMS.txt'), `${sha}  coldphrase.html\n`);

console.log('built dist/coldphrase.html');
console.log('  size:      ' + encHtml.length.toLocaleString() + ' bytes');
console.log('  sha256:    ' + sha);
console.log('  argon2:    ' + createHash('sha256').update(Buffer.from(argonB64, 'base64')).digest('hex'));
console.log('  bip39:     ' + bip39.split(/\s+/).length + ' words');
console.log('  eff:       ' + eff.split(/\s+/).length + ' words');
