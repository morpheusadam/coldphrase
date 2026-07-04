/* tokens-to-css.mjs — turn design/design-tokens.json into CSS custom properties.
 * :root carries the dark theme (the default) plus theme-independent globals;
 * [data-theme="light"] overrides the palette. No color is ever hardcoded in CSS. */

const VARMAP = {
  '--bg': ['background', 'primary'],
  '--bg-2': ['background', 'secondary'],
  '--bg-3': ['background', 'tertiary'],
  '--hover': ['background', 'hover'],
  '--fg': ['foreground', 'primary'],
  '--fg-2': ['foreground', 'secondary'],
  '--fg-3': ['foreground', 'tertiary'],
  '--fg-inverse': ['foreground', 'inverse'],
  '--border': ['border', 'default'],
  '--border-input': ['border', 'input'],
  '--border-input-hover': ['border', 'inputHover'],
  '--focus': ['border', 'focus'],
  '--accent': ['accent', 'default'],
  '--success': ['accent', 'success'],
  '--success-bg': ['accent', 'successBg'],
  '--warning': ['accent', 'warning'],
  '--warning-bg': ['accent', 'warningBg'],
  '--error': ['accent', 'error'],
  '--error-bg': ['accent', 'errorBg']
};

function themeBlock(theme) {
  return Object.entries(VARMAP)
    .map(([k, [group, key]]) => `  ${k}: ${theme[group][key]};`)
    .join('\n');
}

export function tokensToCss(tokens) {
  const t = tokens.color;
  const globals = [
    `  --font-mono: ${tokens.typography.fontFamily.mono};`,
    `  --font-sans: ${tokens.typography.fontFamily.sans};`,
    `  --radius: ${tokens.radius.md};`,
    `  --radius-sm: ${tokens.radius.sm};`,
    `  --radius-full: ${tokens.radius.full};`,
    `  --space: ${tokens.spacing['1']};`
  ].join('\n');
  return [
    `/* Generated from ${tokens.meta.name} v${tokens.meta.version} — do not edit; edit the tokens. */`,
    `:root {`,
    themeBlock(t.dark),
    globals,
    `}`,
    `[data-theme="light"] {`,
    themeBlock(t.light),
    `}`
  ].join('\n');
}
