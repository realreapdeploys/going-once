// Going Once: localStorage wrapper. One key, defensive validation, memory fallback.
//
// The saved value is { profile, saves: { "YYYY-MM-DD": { engineVersion, actions, timer } } }.
// Games are stored as action lists and rebuilt with replay(), so a tampered or half written save
// can only ever be rejected, never trusted.

import { ENGINE_VERSION, isValidDateString, replay, addDays } from "./engine.js";
import { emptyProfile, sanitizeStats, sanitizeAchievements } from "./progress.js";

export const STORAGE_KEY = "goingonce:v1";
export const KEEP_DAYS = 14;

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidAction(action) {
  if (!isPlainObject(action)) return false;
  switch (action.type) {
    case "bid":
      return Number.isInteger(action.amount) && action.amount >= 0;
    case "answer":
    case "steal":
      return action.index === null || (Number.isInteger(action.index) && action.index >= 0 && action.index <= 3);
    case "decline":
    case "next":
      return true;
    default:
      return false;
  }
}

function isValidTimer(timer) {
  if (timer === null) return true;
  if (!isPlainObject(timer)) return false;
  return (
    (timer.stage === "answering" || timer.stage === "stealing") &&
    Number.isInteger(timer.lotIndex) &&
    timer.lotIndex >= 0 &&
    Number.isFinite(timer.startedAt)
  );
}

/** Coerce a stored profile into a complete profile, keeping only fields of the right shape. */
export function sanitizeProfile(raw) {
  const base = emptyProfile();
  if (!isPlainObject(raw)) return base;
  const out = { ...base };
  for (const key of Object.keys(base)) {
    const value = raw[key];
    if (key === "history") {
      if (Array.isArray(value)) {
        out.history = value
          .filter(
            (h) =>
              isPlainObject(h) &&
              isValidDateString(h.date) &&
              Number.isFinite(h.chips) &&
              Number.isFinite(h.rank) &&
              Number.isFinite(h.rep),
          )
          .map((h) => {
            const entry = { date: h.date, chips: h.chips, rank: h.rank, rep: h.rep };
            if (typeof h.lots === "string") {
              const parts = h.lots.split(",");
              if (parts.length > 0 && parts.length <= 20 && parts.every((p) => ["won", "stole", "lost", "pass"].includes(p))) entry.lots = h.lots;
            }
            if (Number.isFinite(h.won) && h.won >= 0) entry.won = Math.floor(h.won);
            if (Number.isFinite(h.lost) && h.lost >= 0) entry.lost = Math.floor(h.lost);
            if (Number.isFinite(h.steals) && h.steals >= 0) entry.steals = Math.floor(h.steals);
            if (isPlainObject(h.hammer)) {
              entry.hammer = {
                correct: Boolean(h.hammer.correct),
                alone: Boolean(h.hammer.alone),
                chips: Number.isFinite(h.hammer.chips) && h.hammer.chips >= 0 ? Math.floor(h.hammer.chips) : 0,
              };
            }
            return entry;
          })
          .slice(-120);
      }
      continue;
    }
    if (key === "achievements") {
      out.achievements = sanitizeAchievements(value);
      continue;
    }
    if (key === "stats") {
      out.stats = sanitizeStats(value);
      continue;
    }
    if (key === "lastCompletedDate") {
      out.lastCompletedDate = isValidDateString(value) ? value : null;
      continue;
    }
    if (key === "paddle") {
      out.paddle = typeof value === "string" ? value : base.paddle;
      continue;
    }
    if (key === "soundOn") {
      out.soundOn = typeof value === "boolean" ? value : base.soundOn;
      continue;
    }
    if (key === "version") continue;
    if (Number.isFinite(value) && value >= 0) out[key] = value;
  }
  out.version = base.version;
  return out;
}

/** Keep the last KEEP_DAYS dated saves relative to `today`, and drop anything malformed. */
export function pruneSaves(saves, today) {
  const oldest = addDays(today, -(KEEP_DAYS - 1));
  const out = {};
  for (const [date, save] of Object.entries(saves)) {
    if (!isValidDateString(date)) continue;
    if (date < oldest || date > addDays(today, 1)) continue;
    out[date] = save;
  }
  return out;
}

/**
 * Validate one stored day. Returns { save } or { save: null, reason }.
 * A day whose actions will not replay, or which was written by another engine version, is dropped.
 */
export function validateSave(raw) {
  if (!isPlainObject(raw)) return { save: null, reason: "shape" };
  if (raw.engineVersion !== ENGINE_VERSION) return { save: null, reason: "version" };
  if (!Array.isArray(raw.actions) || !raw.actions.every(isValidAction)) return { save: null, reason: "actions" };
  if (!isValidTimer(raw.timer)) return { save: null, reason: "timer" };
  return { save: { engineVersion: raw.engineVersion, actions: raw.actions.map((a) => ({ ...a })), timer: raw.timer ? { ...raw.timer } : null } };
}

export function createStore(storage = safeDefaultStorage(), key = STORAGE_KEY) {
  let memory = null;
  let persistent = true;
  let lastProblem = null;

  function remember(reason) {
    if (persistent) persistent = false;
    if (reason) lastProblem = reason;
  }

  function readRaw() {
    try {
      if (!storage || typeof storage.getItem !== "function") {
        remember("unavailable");
        return null;
      }
      return storage.getItem(key);
    } catch {
      remember("unavailable");
      return null;
    }
  }

  function writeRaw(text) {
    try {
      if (!storage || typeof storage.setItem !== "function") {
        remember("unavailable");
        return false;
      }
      storage.setItem(key, text);
      return true;
    } catch {
      remember("full");
      return false;
    }
  }

  /** Load and clean everything. Never throws. */
  function load(today) {
    const fallback = { profile: emptyProfile(), saves: {} };
    const raw = readRaw();
    if (raw === null || raw === undefined || raw === "") {
      memory = fallback;
      return { ...fallback, persistent };
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      memory = fallback;
      remember("corrupt");
      return { ...fallback, persistent };
    }
    if (!isPlainObject(parsed)) {
      memory = fallback;
      remember("corrupt");
      return { ...fallback, persistent };
    }
    const profile = sanitizeProfile(parsed.profile);
    const incoming = isPlainObject(parsed.saves) ? parsed.saves : {};
    const saves = {};
    for (const [date, rawSave] of Object.entries(incoming)) {
      if (!isValidDateString(date)) continue;
      const { save } = validateSave(rawSave);
      if (!save) continue;
      if (date === today) {
        try {
          replay(date, save.actions);
        } catch {
          continue;
        }
      }
      saves[date] = save;
    }
    const pruned = today ? pruneSaves(saves, today) : saves;
    memory = { profile, saves: pruned };
    return { profile, saves: pruned, persistent };
  }

  function snapshot() {
    return memory || { profile: emptyProfile(), saves: {} };
  }

  function save({ profile, saves }) {
    memory = { profile, saves: saves || {} };
    return writeRaw(JSON.stringify({ profile, saves: memory.saves }));
  }

  function saveProfile(profile) {
    const current = snapshot();
    return save({ profile, saves: current.saves });
  }

  function saveDay(date, entry) {
    const current = snapshot();
    const saves = { ...current.saves, [date]: entry };
    return save({ profile: current.profile, saves });
  }

  function clear() {
    memory = { profile: emptyProfile(), saves: {} };
    try {
      if (storage && typeof storage.removeItem === "function") storage.removeItem(key);
    } catch {
      remember("unavailable");
    }
  }

  return {
    load,
    save,
    saveProfile,
    saveDay,
    clear,
    snapshot,
    get persistent() {
      return persistent;
    },
    get lastProblem() {
      return lastProblem;
    },
  };
}

function safeDefaultStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
