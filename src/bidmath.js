// Going Once: bid arithmetic for the paddle control. Pure functions, no DOM.
// The engine is the authority on what a legal bid is; these helpers only help the UI snap a typed
// number into something legal and suggest sensible quick picks.

import { STEP } from "./engine.js";

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
    const cleaned = trimmed.replace(/[^0-9.-]/g, "");
    if (cleaned === "" || cleaned === "." || cleaned === "-") return NaN;
    return Number(cleaned);
  }
  return NaN;
}

function snapToStep(n) {
  return Math.round(n / STEP) * STEP;
}

/**
 * Turn anything the player typed into a legal bid: round to the nearest multiple of STEP, then
 * clamp into [min, max]. Empty, garbage, NaN and negatives fall to min.
 */
export function snapBid(value, bounds) {
  const { min = 0, max = 0 } = bounds || {};
  if (max <= min) return Math.max(0, Math.min(min, max));
  const n = toNumber(value);
  if (!Number.isFinite(n)) return min;
  const clamped = Math.min(max, Math.max(min, n));
  return Math.min(max, Math.max(min, snapToStep(clamped)));
}

/**
 * Quick picks for the bid control.
 * Lots 1 to 4: Pass (0), Quarter (a quarter of the purse) and the house limit.
 * The Hammer: Minimum, Half and All in.
 */
export function quickPicks(bounds, isHammer) {
  const min = Math.max(0, bounds && Number.isFinite(bounds.min) ? bounds.min : 0);
  const max = Math.max(0, bounds && Number.isFinite(bounds.max) ? bounds.max : 0);
  if (isHammer) {
    return [
      { id: "min", label: "Minimum", amount: snapBid(min, { min, max }) },
      { id: "half", label: "Half", amount: snapBid(max / 2, { min, max }) },
      { id: "all", label: "All in", amount: snapBid(max, { min, max }) },
    ];
  }
  return [
    { id: "pass", label: "Pass", amount: 0 },
    { id: "quarter", label: "Quarter", amount: snapBid(max / 2, { min, max }) },
    { id: "limit", label: "House limit", amount: snapBid(max, { min, max }) },
  ];
}

/** One step up or down, kept inside the bounds and on the STEP grid. */
export function stepBid(value, direction, bounds, by = STEP) {
  const min = bounds && Number.isFinite(bounds.min) ? bounds.min : 0;
  const max = bounds && Number.isFinite(bounds.max) ? bounds.max : 0;
  const base = Number.isFinite(value) ? value : min;
  return snapBid(base + direction * by, { min, max });
}
