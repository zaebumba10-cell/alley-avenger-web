// The on-screen layer: buttons, readouts, anything the player reads or presses.
//
// Three renders geometry and nothing else — it has no text and no hit-testing,
// so a score drawn "in the game" would be a texture you cannot read at a glance
// and a button would be a raycast against a quad. Both are DOM elements here
// instead, sitting over the canvas in #hud. Raycasting stays for what it is
// actually good at: tapping objects in the world.

const hud = () => document.getElementById('hud');

/// A round touch button, positioned with CSS.
///
/// `icon` is a symbol name from src/icons.js — call registerIcons(['play'])
/// once at startup to publish each one as a CSS variable, and the button just
/// points at it and stays sharp at any size.
///
/// `onPress` fires on pointerdown rather than click: a game control has to
/// respond the moment the thumb lands, and click waits for the release.
export function addButton({ icon, label, onPress, onRelease, style = {} }) {
  const button = document.createElement('button');
  button.className = 'hud-button';
  button.type = 'button';
  if (icon) button.style.backgroundImage = `var(--icon-${icon})`;
  // Every control needs a name for VoiceOver even though it shows a symbol.
  button.setAttribute('aria-label', label ?? icon ?? 'button');
  Object.assign(button.style, style);

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    // Without capture, a thumb that slides off the button never delivers its
    // pointerup and the control sticks down forever.
    button.setPointerCapture(event.pointerId);
    onPress?.(event);
  });

  if (onRelease) {
    for (const type of ['pointerup', 'pointercancel']) {
      button.addEventListener(type, (event) => onRelease(event));
    }
  }

  hud().appendChild(button);
  return button;
}

/// A text readout — score, timer, lives.
export function addText(text, style = {}) {
  const element = document.createElement('div');
  element.className = 'hud-text';
  element.textContent = text;
  Object.assign(element.style, { position: 'absolute', ...style });
  hud().appendChild(element);
  return element;
}

/// Empties the layer. Call when a scene tears down, or its buttons outlive it.
export function clearHUD() {
  hud().replaceChildren();
}
