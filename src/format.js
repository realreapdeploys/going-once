// Going Once: formatting helpers. Pure functions, no DOM.

const chipsFormatter = new Intl.NumberFormat("en-AU");
const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const ORDINALS = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };

/** "1,000" with a thin space? No: plain en-AU grouping, always with tabular figures by CSS. */
export function formatChips(n) {
  const value = Number.isFinite(n) ? Math.round(n) : 0;
  return chipsFormatter.format(value);
}

/** 1 -> "1st", 4 -> "4th". Anything else falls back to "{n}th". */
export function ordinal(n) {
  return ORDINALS[n] || `${n}th`;
}

/** Parse "YYYY-MM-DD" as a LOCAL noon so DST and timezone shifts cannot move the printed day. */
function localNoon(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** "Saturday 14 November 2026" (en-AU long date). */
export function longDate(dateStr) {
  return dateFormatter.format(localNoon(dateStr));
}

/** Millisecond countdown as "06:12:33", "12:33" or "00:00". Hours are dropped under an hour. */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil((Number.isFinite(ms) ? ms : 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n) => String(n).padStart(2, "0");
  if (h > 0) return `${two(h)}:${two(m)}:${two(s)}`;
  return `${two(m)}:${two(s)}`;
}

/** Signed chip delta for display: "+300", "-45", "0" (rendered as "no change"). */
export function signedChips(n) {
  if (n > 0) return `+${formatChips(n)}`;
  if (n < 0) return `-${formatChips(Math.abs(n))}`;
  return "0";
}

/** Screen reader text for a chip delta. */
export function deltaLabel(n) {
  if (n > 0) return `gained ${formatChips(n)} chips`;
  if (n < 0) return `lost ${formatChips(Math.abs(n))} chips`;
  return "no change in chips";
}

/** "Rare" from a difficulty number, falling back to the raw value. */
export function difficultyLabel(difficulty) {
  return { 1: "Common", 2: "Uncommon", 3: "Rare" }[difficulty] || String(difficulty);
}

/** Milliseconds until the next local midnight, at least 0. */
export function msUntilMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

/** "Surname, First names" is not used; this returns the surname for compact rival cards. */
export function surnameOf(name) {
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : String(name);
}
