// Going Once: reputation, ranks, streaks, paddle unlocks and share text.
// Pure functions. The profile object is plain JSON so it can live in localStorage.

import { START_CHIPS, addDays, outcomeKind, saleNumber } from "./engine.js";

export const RANKS = Object.freeze([
  { id: "newcomer", title: "Newcomer", at: 0 },
  { id: "bidder", title: "Bidder", at: 100 },
  { id: "regular", title: "Regular", at: 300 },
  { id: "collector", title: "Collector", at: 700 },
  { id: "connoisseur", title: "Connoisseur", at: 1300 },
  { id: "auctioneer", title: "Auctioneer", at: 2200 },
]);

// Each paddle unlocks at the rank with the same index. "color" and "trim" are CSS colours.
export const PADDLES = Object.freeze([
  { id: "pine", name: "Plain Pine", color: "#b98f5b", trim: "#6d4a24", rankIndex: 0 },
  { id: "oxblood", name: "Oxblood", color: "#7d1f1f", trim: "#3d0d0d", rankIndex: 1 },
  { id: "ink", name: "Ink Blue", color: "#26375c", trim: "#121b30", rankIndex: 2 },
  { id: "brass", name: "Brass", color: "#b08d2e", trim: "#6b5416", rankIndex: 3 },
  { id: "ivory", name: "Ivory and Gold", color: "#e7dcc0", trim: "#a6812f", rankIndex: 4 },
  { id: "lacquer", name: "Black Lacquer", color: "#1b1917", trim: "#a6812f", rankIndex: 5 },
]);

export function emptyProfile() {
  return {
    version: 1,
    reputation: 0,
    streak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    played: 0,
    firstPlaces: 0,
    totalChips: 0,
    bestChips: 0,
    paddle: "pine",
    soundOn: true,
    history: [], // { date, chips, rank, rep }, newest last, capped at 120 entries
  };
}

const PLACE_BONUS = { 1: 50, 2: 30, 3: 15, 4: 5 };

/** Reputation earned by one finished sale. */
export function reputationForGame({ chips, rank, streak }) {
  const profitPart = Math.max(0, Math.floor((chips - 500) / 10));
  return profitPart + (PLACE_BONUS[rank] ?? 0) + Math.min(streak, 7) * 5;
}

export function rankIndexFor(reputation) {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (reputation >= r.at) idx = i;
  });
  return idx;
}

export function rankFor(reputation) {
  return RANKS[rankIndexFor(reputation)];
}

/** Progress toward the next rank: { current, next, into, span, fraction } (next is null at the top). */
export function rankProgress(reputation) {
  const i = rankIndexFor(reputation);
  const current = RANKS[i];
  const next = RANKS[i + 1] || null;
  if (!next) return { current, next: null, into: reputation - current.at, span: 0, fraction: 1 };
  const span = next.at - current.at;
  const into = reputation - current.at;
  return { current, next, into, span, fraction: Math.min(1, into / span) };
}

export function unlockedPaddles(reputation) {
  const idx = rankIndexFor(reputation);
  return PADDLES.filter((p) => p.rankIndex <= idx);
}

/**
 * Record a finished sale. Returns { profile, gained, rankedUp, newPaddles }.
 * Calling it twice for the same date changes nothing (the second call returns gained 0).
 */
export function applyFinishedGame(profile, { date, chips, rank }) {
  if (profile.history.some((h) => h.date === date)) {
    return { profile, gained: 0, rankedUp: false, newPaddles: [] };
  }
  const continues = profile.lastCompletedDate === addDays(date, -1);
  const streak = continues ? profile.streak + 1 : 1;
  const gained = reputationForGame({ chips, rank, streak });
  const reputation = profile.reputation + gained;
  const before = rankIndexFor(profile.reputation);
  const after = rankIndexFor(reputation);
  const history = [...profile.history, { date, chips, rank, rep: gained }].slice(-120);
  const next = {
    ...profile,
    reputation,
    streak,
    bestStreak: Math.max(profile.bestStreak, streak),
    lastCompletedDate: date,
    played: profile.played + 1,
    firstPlaces: profile.firstPlaces + (rank === 1 ? 1 : 0),
    totalChips: profile.totalChips + chips,
    bestChips: Math.max(profile.bestChips, chips),
    history,
  };
  const newPaddles = PADDLES.filter((p) => p.rankIndex > before && p.rankIndex <= after);
  return { profile: next, gained, rankedUp: after > before, newPaddles };
}

/** If the player missed a day, the streak shown on the cover should read 0 until they play again. */
export function displayStreak(profile, todayStr) {
  if (!profile.lastCompletedDate) return 0;
  if (profile.lastCompletedDate === todayStr) return profile.streak;
  if (profile.lastCompletedDate === addDays(todayStr, -1)) return profile.streak;
  return 0;
}

const GLYPHS = { won: "■", stole: "◆", lost: "□", pass: "·" };
const ORDINALS = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };

export function formatChips(n) {
  return new Intl.NumberFormat("en-AU").format(n);
}

/** Spoiler free share text for a finished game. */
export function buildShareText(state, url = "") {
  const rank = state.final.find((r) => r.id === "player").rank;
  const chips = state.banks.player;
  const row = state.history.map((rec) => GLYPHS[outcomeKind(rec)]).join(" ");
  const lines = [
    `Going Once No. ${saleNumber(state.date)}`,
    `${formatChips(chips)} chips · ${ORDINALS[rank] || `${rank}th`} of 4`,
    row,
  ];
  if (url) lines.push(url);
  return lines.join("\n");
}

export { START_CHIPS };
