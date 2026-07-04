/* theme.js — light/dark toggle. Default is dark (per design tokens). Preference
 * is remembered locally; this is UI state only and never leaves the machine. */
var CP = (typeof CP !== 'undefined') ? CP : {};

CP.initTheme = function () {
  var root = document.documentElement;
  var saved;
  try { saved = localStorage.getItem('cp-theme'); } catch (e) { saved = null; }
  root.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
  var btn = document.getElementById('themeToggle');
  if (!btn) return;
  function label() { btn.textContent = root.getAttribute('data-theme') === 'light' ? '[ dark ]' : '[ light ]'; }
  label();
  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('cp-theme', next); } catch (e) {}
    label();
  });
};
