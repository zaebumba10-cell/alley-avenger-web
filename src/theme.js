// Colours live in styles/main.css so light and dark mode are defined in one
// place. Three cannot read CSS variables, so they are resolved here.

import * as THREE from 'three';

/// The raw CSS value, e.g. '#10131a'. DOM styling takes strings.
export function themeValue(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/// The same value as a THREE.Color. Materials, lights and the renderer's clear
/// colour take these rather than strings.
export function themeColor(name) {
  return new THREE.Color(themeValue(name));
}

/// Runs the callback whenever the system flips between light and dark. The CSS
/// variables have already changed by the time it fires.
export function onThemeChange(callback) {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', callback);
}
