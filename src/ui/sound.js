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


function woodblock(ctx, { frequency = 900, seconds = 0.05, gain = 0.18, delay = 0 }) {
  tone(ctx, { type: "square", from: frequency, seconds, gain, delay });
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
      case "click":
        burst(ctx, { seconds: 0.02, type: "bandpass", frequency: 3400, gain: 0.09 });
        break;
      case "chips": {
        tone(ctx, { type: "sine", from: 2093, seconds: 0.05, gain: 0.12 });
        tone(ctx, { type: "sine", from: 2637, seconds: 0.05, gain: 0.09, delay: 0.045 });
        tone(ctx, { type: "sine", from: 3136, seconds: 0.06, gain: 0.07, delay: 0.09 });
        break;
      }
      case "ruler-tick":
        burst(ctx, { seconds: 0.012, type: "highpass", frequency: 5200, gain: 0.07 });
        tone(ctx, { type: "sine", from: 3600, seconds: 0.02, gain: 0.03 });
        break;
      case "lock": {
        woodblock(ctx, { frequency: 820, seconds: 0.045, gain: 0.2 });
        woodblock(ctx, { frequency: 1230, seconds: 0.05, gain: 0.16, delay: 0.1 });
        break;
      }
      case "page": {
        burst(ctx, { seconds: 0.05, type: "bandpass", frequency: 650, gain: 0.18 });
        burst(ctx, { seconds: 0.12, type: "bandpass", frequency: 1450, gain: 0.15, delay: 0.06 });
        break;
      }
      case "fanfare": {
        const notes = [392, 523, 659, 784];
        notes.forEach((n, i) => tone(ctx, { type: "triangle", from: n, seconds: 0.18, gain: 0.16, delay: i * 0.09 }));
        break;
      }
      case "pass":
        burst(ctx, { seconds: 0.12, type: "lowpass", frequency: 600, gain: 0.16 });
        tone(ctx, { type: "triangle", from: 175, to: 140, seconds: 0.12, gain: 0.06 });
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
