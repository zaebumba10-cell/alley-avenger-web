// The game's icons, from the bundled symbol library (vendor/symbols.js, the
// full Lucide set): every Lucide name just works — no lookup, no drawing.
//
// The HUD is DOM, so icons are SVG data URIs — sharp at any size:
//
//   registerIcons(['play', 'pause']);              // once, at startup
//   button.style.backgroundImage = 'var(--icon-play)';
//
// or set one directly: `url("${iconDataURI('play')}")`.

import { SYMBOLS } from '../vendor/symbols.js';

/// One symbol as an SVG data URI, ready for `background-image`.
export function iconDataURI(name, color = '#ffffff') {
  const symbol = SYMBOLS[name];
  if (!symbol) return null;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" ` +
    `stroke-linejoin="round">${symbol}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/// Publishes each named symbol as a CSS variable `--icon-<name>`, so HUD
/// styling can reference icons without importing this file everywhere.
/// Unknown names warn instead of failing, so a typo shows up in the runtime
/// log rather than an invisible button.
export function registerIcons(names, root = document.documentElement, color = '#ffffff') {
  for (const name of names) {
    const uri = iconDataURI(name, color);
    if (!uri) {
      console.warn(`Icon "${name}" is not a bundled symbol.`);
      continue;
    }
    root.style.setProperty(`--icon-${name}`, `url("${uri}")`);
  }
}
