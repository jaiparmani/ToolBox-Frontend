/**
 * Tactile finish — haptics and sound-design cues for key moments.
 *
 * Both are opt-in-respectful: haptics fire only where the device supports
 * vibration (phones), sound is synthesized on the fly (no audio files, no
 * network) and OFF by default, and every cue is mutable and remembered. Nothing
 * here is load-bearing — it's the felt layer on top of actions that already
 * work and already say what happened on screen.
 */

const KEY = 'toolbox:feedback';
const DEFAULTS = { haptics: true, sound: false };

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}

let prefs = load();

export function getFeedbackPrefs() { return { ...prefs }; }
export function setFeedbackPrefs(next) {
  prefs = { ...prefs, ...next };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
}

/** A short vibration, keyed by a semantic name (or pass a raw pattern). */
export function haptic(pattern = 'tap') {
  if (!prefs.haptics) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const P = { tap: 10, soft: 8, success: [12, 40, 18], warn: [22, 60, 22], heavy: 26 };
  try { navigator.vibrate(P[pattern] ?? pattern); } catch { /* some browsers throw when backgrounded */ }
}

let ctx = null;
function audio() {
  if (ctx) return ctx;
  try { const AC = window.AudioContext || window.webkitAudioContext; ctx = AC ? new AC() : null; }
  catch { ctx = null; }
  return ctx;
}

/** A brief synthesized cue. No-op unless sound is enabled. */
export function sound(name = 'tick') {
  if (!prefs.sound) return;
  const ac = audio();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  const now = ac.currentTime;
  const tone = (freq, dur, type = 'sine', gain = 0.05, delay = 0) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now + delay);
    g.gain.linearRampToValueAtTime(gain, now + delay + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
    o.connect(g).connect(ac.destination);
    o.start(now + delay); o.stop(now + delay + dur + 0.02);
  };
  switch (name) {
    case 'success': tone(523.25, 0.12, 'sine', 0.05); tone(783.99, 0.16, 'sine', 0.05, 0.08); break;
    case 'error': tone(196, 0.22, 'sawtooth', 0.035); break;
    case 'send': tone(659.25, 0.10, 'triangle', 0.045); break;
    case 'open': tone(392, 0.09, 'sine', 0.035); break;
    case 'snap': tone(440, 0.05, 'sine', 0.03); break;
    default: tone(880, 0.05, 'sine', 0.03); // tick
  }
}

/** Pair the haptic and sound that belong to a semantic moment. */
export function feedback(kind) {
  switch (kind) {
    case 'success': haptic('success'); sound('success'); break;
    case 'error': haptic('warn'); sound('error'); break;
    case 'send': haptic('soft'); sound('send'); break;
    case 'open': haptic('soft'); sound('open'); break;
    case 'snap': haptic('tap'); sound('snap'); break;
    default: haptic('tap'); sound('tick');
  }
}
