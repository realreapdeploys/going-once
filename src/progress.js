// Going Once: reputation, ranks, streaks, paddles, badges and share text.
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

// Each rank paddle unlocks at the rank of the same index. Achievement paddles unlock on badge count.
export const PADDLES = Object.freeze([
  { id: "pine", name: "Plain Pine", color: "#b98f5b", trim: "#6d4a24", rankIndex: 0 },
  { id: "oxblood", name: "Oxblood", color: "#7d1f1f", trim: "#3d0d0d", rankIndex: 1 },
  { id: "ink", name: "Ink Blue", color: "#26375c", trim: "#121b30", rankIndex: 2 },
  { id: "brass", name: "Brass", color: "#b08d2e", trim: "#6b5416", rankIndex: 3 },
  { id: "ivory", name: "Ivory and Gold", color: "#e7dcc0", trim: "#a6812f", rankIndex: 4 },
  { id: "lacquer", name: "Black Lacquer", color: "#1b1917", trim: "#a6812f", rankIndex: 5 },
  { id: "laurel", name: "Laurel and Brass", color: "#2f4a2f", trim: "#b08d2e", rankIndex: 5, badges: 3 },
]);

const BADGE_PADDLES = PADDLES.filter((p) => p.badges);

export const BADGE_COUNT_FOR_LAUREL = 3;

/**
 * The saleroom badges. Each is pure data plus a predicate over one finished sale.
 * `shade` is the stamp colour class hook; `blurb` shows on the results screen, `hint` in the locked ledger slot.
 */
export const ACHIEVEMENTS = Object.freeze([
  {
    id: "opening-bid",
    name: "Opening Bid",
    blurb: "You closed your first sale.",
    hint: "Finish a sale.",
    test: ({ stats }) => (stats.salesScored || 0) >= 1,
  },
  {
    id: "steel-palm",
    name: "The Steal Artist",
    blurb: "Five lots won on the steal.",
    hint: "Win five lots on the steal.",
    test: ({ stats }) => stats.steals >= 5,
  },
  {
    id: "cold-console",
    name: "Cold Console",
    blurb: "A whole sale without forfeiting a lot.",
    hint: "Finish a sale without losing a single lot.",
    test: ({ entry }) => Boolean(entry && entry.lots && entry.lots.split(",").filter(Boolean).length === 7 && entry.lost === 0),
  },
  {
    id: "guesswork-genius",
    name: "Guesswork Genius",
    blurb: "The only right answer on the Hammer lot.",
    hint: "Be the only bidder right on the Hammer lot.",
    test: ({ entry }) => Boolean(entry && entry.hammer && entry.hammer.alone),
  },
  {
    id: "perfect-hammer",
    name: "The Perfect Hammer",
    blurb: "Profit on every one of the seven lots.",
    hint: "Take chips on all seven lots in a sale.",
    test: ({ entry }) => Boolean(entry) && entry.won === 7,
  },
  {
    id: "heavy-pockets",
    name: "Heavy Pockets",
    blurb: "Close a sale on 2,500 chips or more.",
    hint: "Finish a sale with at least 2,500 chips.",
    test: ({ chips }) => chips >= 2500,
  },
]);

const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

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
    achievements: {}, // { id: dateEarned }
    stats: emptyStats(),
    history: [], // compact entries, newest last, capped at 120
  };
}

function emptyStats() {
  return {
    answered: { 1: [0, 0], 2: [0, 0], 3: [0, 0] },
    categories: {}, // { category: [right, total] }
    steals: 0,
    lotsWon: 0,
    lotsLost: 0,
    hammersWon: 0,
    hammersPlayed: 0,
    bestHammer: 0,
    salesScored: 0,
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

export function badgeCount(profile) {
  return profile && profile.achievements ? Object.keys(profile.achievements).length : 0;
}

/** Paddles the player may use right now: rank paddles, plus achievement paddles whose badge bar is met. */
export function unlockedPaddles(reputation, badges = 0) {
  const idx = rankIndexFor(reputation);
  return PADDLES.filter((p) => p.rankIndex <= idx && (!p.badges || p.badges <= badges));
}

/** Build the compact per-sale entry from the engine's lot records. */
function summarizeSale(records) {
  const lots = [];
  let won = 0;
  let lost = 0;
  let steals = 0;
  const accuracy = { 1: [0, 0], 2: [0, 0], 3: [0, 0] };
  const categories = {};
  let hammer = null;

  for (const rec of records) {
    if (!rec || typeof rec.lotIndex !== "number") continue;
    const kind = outcomeKind(rec);
    lots.push(kind);
    const delta = rec.deltas && Number.isFinite(rec.deltas.player) ? rec.deltas.player : 0;
    if (delta > 0) won += 1;
    else if (delta < 0) lost += 1;
    if (rec.steal && rec.steal.by === "player" && rec.steal.correct) steals += 1;

    let answered = false;
    let correct = false;

    if (rec.isHammer) {
      const r = rec.results && rec.results.player;
      if (r) {
        answered = true;
        correct = Boolean(r.correct);
        const others = Object.entries(rec.results).filter(([id]) => id !== "player");
        const alone = correct && others.length > 0 && others.every(([, v]) => v && !v.correct);
        hammer = { correct, alone, chips: Math.max(0, delta), difficulty: rec.difficulty, category: rec.category };
      }
    } else if (rec.winnerId === "player") {
      answered = true;
      correct = Boolean(rec.winnerCorrect);
    } else if (rec.steal && rec.steal.by === "player") {
      answered = true;
      correct = Boolean(rec.steal.correct);
    }

    if (answered) {
      const bucket = accuracy[String(rec.difficulty)];
      if (bucket) {
        bucket[1] += 1;
        if (correct) bucket[0] += 1;
      }
      const cat = rec.category || "General";
      const pair = categories[cat] || (categories[cat] = [0, 0]);
      pair[1] += 1;
      if (correct) pair[0] += 1;
    }
  }

  return { lots: lots.join(","), won, lost, steals, accuracy, categories, hammer };
}

function mergeStats(base, summary, played) {
  if (!summary) {
    return { ...(base || emptyStats()), salesScored: (base && base.salesScored) || 0 };
  }
  const next = base ? { ...base, answered: {}, categories: { ...(base.categories || {}) } } : emptyStats();
  for (const d of ["1", "2", "3"]) {
    const a = (base && base.answered && base.answered[d]) || [0, 0];
    const b = summary.accuracy[d] || [0, 0];
    next.answered[d] = [a[0] + b[0], a[1] + b[1]];
  }
  for (const [cat, pair] of Object.entries(summary.categories || {})) {
    const a = next.categories[cat] || [0, 0];
    next.categories[cat] = [a[0] + pair[0], a[1] + pair[1]];
  }
  next.steals = (base && base.steals ? base.steals : 0) + summary.steals;
  next.lotsWon = (base && base.lotsWon ? base.lotsWon : 0) + summary.won;
  next.lotsLost = (base && base.lotsLost ? base.lotsLost : 0) + summary.lost;
  next.hammersPlayed = (base && base.hammersPlayed ? base.hammersPlayed : 0) + (summary.hammer ? 1 : 0);
  next.hammersWon = (base && base.hammersWon ? base.hammersWon : 0) + (summary.hammer && summary.hammer.correct ? 1 : 0);
  next.bestHammer = Math.max(base && base.bestHammer ? base.bestHammer : 0, summary.hammer ? summary.hammer.chips : 0);
  next.salesScored = (base && base.salesScored ? base.salesScored : 0) + 1;
  return next;
}

function sanitizeStats(raw) {
  const base = emptyStats();
  if (!raw || typeof raw !== "object") return base;
  const answered = {};
  for (const d of ["1", "2", "3"]) {
    const pair = raw.answered && raw.answered[d];
    answered[d] = Array.isArray(pair) && pair.length === 2 ? pair.map((n) => (Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0)) : [0, 0];
  }
  const categories = {};
  if (raw.categories && typeof raw.categories === "object") {
    for (const [cat, pair] of Object.entries(raw.categories)) {
      if (!Array.isArray(pair) || pair.length !== 2) continue;
      const r = Number(pair[0]);
      const t = Number(pair[1]);
      if (!Number.isFinite(r) || !Number.isFinite(t) || r < 0 || t < 0) continue;
      categories[String(cat)] = [Math.floor(r), Math.floor(t)];
    }
  }
  const num = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  return {
    answered,
    categories,
    steals: num(raw.steals),
    lotsWon: num(raw.lotsWon),
    lotsLost: num(raw.lotsLost),
    hammersWon: num(raw.hammersWon),
    hammersPlayed: num(raw.hammersPlayed),
    bestHammer: num(raw.bestHammer),
    salesScored: num(raw.salesScored),
  };
}

function sanitizeAchievements(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, date] of Object.entries(raw)) {
    if (ACHIEVEMENT_IDS.has(id) && typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) out[id] = date;
  }
  return out;
}

/**
 * Record a finished sale. Returns { profile, gained, rankedUp, newPaddles, newAchievements }.
 * Calling it twice for the same date changes nothing (the second call returns gained 0).
 * `records` are the engine's per-lot outcome records; without them the compact grid and
 * lifetime stats cannot be built, and achievements that need them stay locked.
 */
export function applyFinishedGame(profile, { date, chips, rank, records = null }) {
  if (profile.history.some((h) => h.date === date)) {
    return { profile, gained: 0, rankedUp: false, newPaddles: [], newAchievements: [] };
  }
  const continues = profile.lastCompletedDate === addDays(date, -1);
  const streak = continues ? profile.streak + 1 : 1;
  const gained = reputationForGame({ chips, rank, streak });
  const reputation = profile.reputation + gained;
  const before = rankIndexFor(profile.reputation);
  const after = rankIndexFor(reputation);

  const summary = records && records.length ? summarizeSale(records) : null;
  const stats = mergeStats(profile.stats, summary, 1);

  const entry = {
    date,
    chips,
    rank,
    rep: gained,
    ...(summary
      ? {
          lots: summary.lots,
          won: summary.won,
          lost: summary.lost,
          steals: summary.steals,
          hammer: summary.hammer ? { correct: summary.hammer.correct, alone: summary.hammer.alone, chips: summary.hammer.chips } : null,
        }
      : {}),
  };

  // Achievements: evaluate after the stats merge so lifetime bars read cumulatively.
  const achievements = { ...(profile.achievements || {}) };
  const newAchievements = [];
  for (const badge of ACHIEVEMENTS) {
    if (achievements[badge.id]) continue;
    if (badge.test({ entry, stats, chips, rank, profile: { ...profile, streak } })) {
      achievements[badge.id] = date;
      newAchievements.push(badge.id);
    }
  }

  const beforeBadges = badgeCount(profile);
  const afterBadges = Object.keys(achievements).length;

  const rankPaddleIds = PADDLES.filter((p) => p.rankIndex > before && p.rankIndex <= after);
  const badgePaddleIds = BADGE_PADDLES.filter((p) => (p.badges || 0) > beforeBadges && (p.badges || 0) <= afterBadges);
  const newPaddles = [...rankPaddleIds, ...badgePaddleIds];

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
    achievements,
    stats,
    history: [...profile.history, entry].slice(-120),
  };

  return { profile: next, gained, rankedUp: after > before, newPaddles, newAchievements };
}

/** If the player missed a day, the streak shown on the cover should read 0 until they play again. */
export function displayStreak(profile, todayStr) {
  if (!profile.lastCompletedDate) return 0;
  if (profile.lastCompletedDate === todayStr) return profile.streak;
  if (profile.lastCompletedDate === addDays(todayStr, -1)) return profile.streak;
  return 0;
}

const GLYPHS = { won: "🟩", stole: "🟨", lost: "🟥", pass: "⬜" };
const ORDINALS = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };

export function formatChips(n) {
  return new Intl.NumberFormat("en-AU").format(n);
}

/** Spoiler free share text for a finished game, including the seven-lot grid. */
export function buildShareText(state, url = "") {
  const rank = state.final.find((r) => r.id === "player").rank;
  const chips = state.banks.player;
  const row = state.history
    .map((rec) => GLYPHS[outcomeKind(rec)] || "⬜")
    .join(" ");
  const lines = [
    `Going Once No. ${saleNumber(state.date)}`,
    `${formatChips(chips)} chips · ${ORDINALS[rank] || `${rank}th`} of 4`,
    row,
  ];
  if (url) lines.push(url);
  return lines.join("\n");
}

/** The lots of a compact history entry as glyph characters (for the ledger grid). */
export const PRINTS = Object.freeze({ won: "■", stole: "◆", lost: "□", pass: "·" });
export function lotsOf(entry) {
  if (!entry || typeof entry.lots !== "string" || !entry.lots) return [];
  return entry.lots.split(",").map((k) => PRINTS[k] || "·");
}

/** Lifetime numbers for the ledger's "On the books" panel. */
export function lifetimeStats(profile) {
  const stats = profile && profile.stats ? sanitizeStats(profile.stats) : emptyStats();
  const overall = stats.answered[1][1] + stats.answered[2][1] + stats.answered[3][1];
  const overallRight = stats.answered[1][0] + stats.answered[2][0] + stats.answered[3][0];
  const accuracyPct = (d) => {
    const [r, t] = stats.answered[d];
    return t ? Math.round((r / t) * 100) : null;
  };
  let favoured = null;
  for (const [cat, [r, t]] of Object.entries(stats.categories)) {
    if (t < 3) continue; // avoid crowning a category seen once
    const rate = r / t;
    if (!favoured || rate > favoured.rate || (rate === favoured.rate && t > favoured.total)) {
      favoured = { category: cat, rate, right: r, total: t };
    }
  }
  return {
    answered: overall,
    answeredRight: overallRight,
    accuracy: overall ? Math.round((overallRight / overall) * 100) : null,
    byDifficulty: { 1: accuracyPct("1"), 2: accuracyPct("2"), 3: accuracyPct("3") },
    favoured,
    steals: stats.steals,
    lotsWon: stats.lotsWon,
    lotsLost: stats.lotsLost,
    hammersWon: stats.hammersWon,
    hammersPlayed: stats.hammersPlayed,
    bestHammer: stats.bestHammer,
    salesScored: stats.salesScored,
  };
}

export { sanitizeStats, sanitizeAchievements, emptyStats };
export { START_CHIPS };
