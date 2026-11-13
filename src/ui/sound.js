// Going Once: synthesized sound. No audio files, everything from the Web Audio API.
// Every call is wrapped so a browser without audio, or a closed context, stays silent.

let context = null;
let master = null;
let enabled = true;

function ensureContext() {
  if (context) return context;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  master = context.createGain();
  master.gain.value = 0.5;
  master.connect(context.destination);
  return context;
}

function noiseBuffer(ctx, seconds) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function burst(ctx, { seconds, type = "lowpass", frequency = 900, gain = 0.5, delay = 0 }) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, seconds);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  const amp = ctx.createGain();
  const start = ctx.currentTime + delay;
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  source.connect(filter).connect(amp).connect(master);
  source.start(start);
  source.stop(start + seconds + 0.02);
}

function tone(ctx, { type = "sine", from, to = from, seconds, gain = 0.3, delay = 0 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  const start = ctx.currentTime + delay;
  osc.frequency.setValueAtTime(from, start);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + seconds);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(amp).connect(master);
  osc.start(start);
  osc.stop(start + seconds + 0.02);
}

/** Play a named sound. Safe to call before any user gesture: it simply does nothing. */
export function play(name) {
  if (!enabled) return;
  try {
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    switch (name) {
      case "gavel":
        burst(ctx, { seconds: 0.03, frequency: 900, gain: 0.5 });
        tone(ctx, { type: "sine", from: 110, seconds: 0.12, gain: 0.5 });
        break;
      case "stamp":
        burst(ctx, { seconds: 0.06, type: "bandpass", frequency: 1800, gain: 0.45 });
        tone(ctx, { type: "sine", from: 70, seconds: 0.08, gain: 0.35 });
        break;
      case "flick":
        burst(ctx, { seconds: 0.04, type: "highpass", frequency: 2400, gain: 0.25 });
        break;
      case "coin":
        tone(ctx, { type: "sine", from: 1760, seconds: 0.06, gain: 0.18 });
        tone(ctx, { type: "sine", from: 2349, seconds: 0.06, gain: 0.14, delay: 0.06 });
        break;
      case "tick":
        tone(ctx, { type: "square", from: 1200, seconds: 0.015, gain: 0.06 });
        break;
      case "right":
        tone(ctx, { type: "sawtooth", from: 392, seconds: 0.14, gain: 0.13 });
        tone(ctx, { type: "sawtooth", from: 523, seconds: 0.14, gain: 0.13, delay: 0.14 });
        break;
      case "wrong":
        tone(ctx, { type: "triangle", from: 160, to: 110, seconds: 0.22, gain: 0.22 });
        break;
      default:
        break;
    }
  } catch {
    /* silence is a valid outcome */
  }
}

export function setEnabled(value) {
  enabled = Boolean(value);
}

export function isEnabled() {
  return enabled;
}

/** Called on the first user gesture so the context is unlocked in browsers that require it. */
export function unlock() {
  try {
    const ctx = ensureContext();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  } catch {
    /* ignore */
  }
}
