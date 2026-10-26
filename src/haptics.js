// Every haptic the game plays, by name.
//
// THIS FILE IS A FIXED CONTRACT, like src/icons.js. FreeMilk reads it to list the
// game's haptics, and it is written by the set_haptic and remove_haptic tools —
// not by hand. Three things must stay true:
//
//   1. the file stays at src/haptics.js
//   2. the export stays named HAPTICS
//   3. every value is a plain object literal (no function calls, no variables)
//
// There are no canned effects. An effect is a pattern you describe: a list of
// events on a timeline, in seconds.
//
//   type       'transient' (an instantaneous tap) or 'continuous' (a buzz)
//   time       when it fires, relative to the start
//   intensity  0-1, how hard it hits
//   sharpness  0-1, a dull thud at 0, a crisp tick at 1
//   duration   continuous events only, seconds
//
// Events also take an envelope — attackTime, decayTime, releaseTime, sustained
// — for how they rise, hold and fall.
//
// A pattern may carry curves, which ramp intensity or sharpness smoothly rather
// than in steps, and may loop, set a playbackRate, or be marked sustained so the
// game can change it with hapticUpdate() while it runs.
//
// There is no web haptics API on iOS: this goes through the app to the Taptic
// Engine, so it does nothing when the game is opened in a plain browser.

export const HAPTICS = {
  // A single short tick — the smallest thing worth feeling.
  tick: {
    events: [
      { type: 'transient', time: 0, intensity: 0.5, sharpness: 0.8 }
    ]
  },

  // A crack followed by a fading rumble. A tap alone reads as a click; the tail
  // is what makes it read as an impact.
  impact: {
    events: [
      { type: 'transient', time: 0, intensity: 1, sharpness: 0.9 },
      { type: 'continuous', time: 0.02, duration: 0.28, intensity: 0.55, sharpness: 0.2 }
    ]
  },

  // A curve ramps a value smoothly across an event, which stepped segments
  // cannot do. This one swells and falls away.
  charge: {
    events: [
      { type: 'continuous', time: 0, duration: 0.8, intensity: 0.4, sharpness: 0.3 }
    ],
    curves: [
      {
        parameter: 'intensity',
        time: 0,
        points: [
          { time: 0, value: 0.1 },
          { time: 0.6, value: 1 },
          { time: 0.8, value: 0 }
        ]
      }
    ]
  }
};

const channel =
  typeof window !== 'undefined' &&
  window.webkit &&
  window.webkit.messageHandlers &&
  window.webkit.messageHandlers.milqHaptics;

function send(payload) {
  if (channel) channel.postMessage(payload);
}

/// Plays a named haptic. Unknown names are ignored rather than throwing, so a
/// renamed effect never crashes a scene mid-frame.
///
/// Pass an id for an effect you intend to change or stop while it runs —
/// looping and sustained effects only. One-shots need no id.
export function haptic(name, id) {
  const effect = HAPTICS[name];
  if (!effect) return;
  send(id ? { ...effect, action: 'play', id } : effect);
}

/// Changes an effect that is already playing: intensity, sharpness, volume or
/// playbackRate. Only reaches effects started with an id.
export function hapticUpdate(id, params) {
  send({ action: 'update', id, ...params });
}

/// Stops one running effect, or every one when called with no id.
export function hapticStop(id) {
  send({ action: 'stop', id });
}

/// Plays an effect without naming it. Prefer named entries in HAPTICS — those
/// are the ones FreeMilk can list and the user can find.
export function hapticNow(effect, id) {
  if (!effect) return;
  send(id ? { ...effect, action: 'play', id } : effect);
}
