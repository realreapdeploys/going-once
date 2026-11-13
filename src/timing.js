// Going Once: time helpers. Pure functions plus one shared sequence clock for animations.

import { ANSWER_SECONDS } from "./engine.js";

export const ANSWER_MS = ANSWER_SECONDS * 1000;

/**
 * Time left on an answer timer. Clamped into [0, duration] so a clock that jumps backwards
 * cannot hand out extra time and one that jumps forwards cannot go negative.
 * A null start means the timer has not started yet: the full duration is left.
 */
export function remainingMs(startedAt, now = Date.now(), duration = ANSWER_MS) {
  if (startedAt === null || startedAt === undefined) return duration;
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return duration;
  const left = duration - (now - startedAt);
  if (!Number.isFinite(left)) return duration;
  return Math.min(duration, Math.max(0, left));
}

/** Timer state to persist: { stage, lotIndex, startedAt }. */
export function startTimer(stage, lotIndex, now = Date.now()) {
  return { stage, lotIndex, startedAt: now };
}

/**
 * A skippable sequence clock. `seq.sleep(ms)` resolves after ms, or immediately once skip() has
 * been called. begin() invalidates every earlier sequence, so a sequence abandoned by a screen
 * change can check `seq.alive` and stop before touching the DOM.
 */
export function createSequenceClock() {
  let generation = 0;
  let skipping = false;
  const waiting = new Set();

  function release() {
    for (const entry of waiting) {
      clearTimeout(entry.timer);
      entry.resolve();
    }
    waiting.clear();
  }

  function skip() {
    skipping = true;
    release();
  }

  function begin() {
    generation += 1;
    skipping = false;
    release();
    const token = generation;
    return {
      get alive() {
        return token === generation;
      },
      get skipped() {
        return skipping || token !== generation;
      },
      sleep(ms) {
        if (skipping || token !== generation) return Promise.resolve();
        return new Promise((resolve) => {
          const entry = { resolve, timer: null };
          entry.timer = setTimeout(() => {
            waiting.delete(entry);
            resolve();
          }, ms);
          waiting.add(entry);
        });
      },
    };
  }

  return { skip, begin };
}

/** A plain sleep for code that is not part of a skippable sequence. */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
