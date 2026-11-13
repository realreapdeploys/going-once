// Going Once: game engine. Pure, deterministic, no DOM, no timers, no storage.
//
// A game is fully determined by its date string plus the list of player actions, so saving a game
// means saving the actions and loading means replaying them (see replay()). This also makes the
// engine easy to test and impossible to "reroll" by refreshing the page.
//
// Chips: every bid, bank and payout is a multiple of STEP (5). Banks can never go below 0.
//
// Lot flow (lots 1 to 6):
//   bidding   the player places a sealed bid (0 passes, at most half the bank: the house limit).
//             Rivals' bids are computed from the day's seed and obey the same limit.
//   answering the highest bid (at least STEP) wins the lot and must answer. The winner gains the bid if
//             right and loses it if wrong. If the player is the winner they answer here.
//   stealing  if a RIVAL wins and answers wrong, the runner-up (highest other bid of at least STEP) may
//             steal. If that is the player they choose: answer with the wrong option removed, or decline.
//             A steal pays the stealer's own bid plus half the failed winner's bid (rounded down to a
//             multiple of STEP). A wrong steal costs the stealer's own bid.
//   resolved  lot is finished, the record is in state.history. Dispatch "next".
// Lot 7 is the Hammer: everyone must wager at least 25 percent of their bank (rounded up to STEP),
// then everyone answers the same question. Right gains the wager, wrong loses it. No steals.

import { QUESTIONS, CATEGORIES } from "./questions.js";
import { ROSTER, getRivalById } from "./roster.js";

export const ENGINE_VERSION = 1;
export const START_CHIPS = 1000;
export const LOT_COUNT = 7;
export const STEP = 5;
export const ANSWER_SECONDS = 20;
export const HAMMER_MIN_FRACTION = 0.25;
export const HOUSE_LIMIT_FRACTION = 0.5; // max bid as a fraction of the bank on lots 1 to 4
export const RIVAL_COUNT = 3;
export const LAUNCH_DATE = "2026-11-14"; // Sale No. 1
export const DIFFICULTY_LADDER = Object.freeze([1, 2, 1, 2, 3, 2, 2]); // difficulty of lots 1 to 7
export const DIFFICULTY_LABELS = Object.freeze({ 1: "Common", 2: "Uncommon", 3: "Rare" });

export class EngineError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = "EngineError";
    this.code = code;
  }
}

/* ------------------------------------------------------------------ randomness */

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled(items, rng) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------------ dates */

export function isValidDateString(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function utcMs(s) {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** The player's LOCAL calendar date as YYYY-MM-DD. A new sale opens at local midnight. */
export function localDateString(date = new Date()) {
  const y = String(date.getFullYear()).padStart(4, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetween(a, b) {
  return Math.round((utcMs(b) - utcMs(a)) / 86400000);
}

export function addDays(dateStr, n) {
  const t = new Date(utcMs(dateStr) + n * 86400000);
  const y = String(t.getUTCFullYear()).padStart(4, "0");
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function saleNumber(dateStr) {
  return Math.max(1, daysBetween(LAUNCH_DATE, dateStr) + 1);
}

/* ------------------------------------------------------------------ small helpers */

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const floorTo = (n, step) => Math.floor(n / step) * step;
const ceilTo = (n, step) => Math.ceil(n / step) * step;

/** Half of the failed winner's bid, rounded down to a multiple of STEP. */
export function stealBonus(winnerBid) {
  return Math.floor(winnerBid / (2 * STEP)) * STEP;
}

export function hammerMinimum(bank) {
  if (bank <= 0) return 0;
  return Math.min(bank, ceilTo(bank * HAMMER_MIN_FRACTION, STEP));
}

/**
 * House limit. On lots 1 to 6 no bid may exceed half the bank (rounded down to STEP, but a bank of
 * 5 to 9 chips may still bid STEP). The Hammer allows the whole bank.
 */
export function maxBid(bank, isHammer) {
  if (bank <= 0) return 0;
  if (isHammer) return bank;
  return Math.min(bank, Math.max(STEP, floorTo(bank * HOUSE_LIMIT_FRACTION, STEP)));
}

/** Chance (0 to 1) that a rival with this skill knows a lot of this difficulty. */
export function answerProbability(skill, difficulty) {
  if (difficulty === 1) return skill + (1 - skill) * 0.55;
  if (difficulty === 3) return skill * 0.6;
  return skill;
}

/* ------------------------------------------------------------------ building a day */

function buildDayInternal({ rng, dateLabel, saleNo, lotCount, difficultyLadder }, questions, roster) {
  const rivals = shuffled(roster.map((r) => r.id), rng).slice(0, RIVAL_COUNT);
  const categoryPool = [];
  while (categoryPool.length < lotCount) {
    categoryPool.push(...shuffled(CATEGORIES, rng));
  }
  const categories = categoryPool.slice(0, lotCount);

  const lots = categories.map((category, index) => {
    const difficulty = difficultyLadder[index];
    const pool = questions.filter((q) => q.category === category && q.difficulty === difficulty);
    if (pool.length === 0) throw new EngineError("NO_QUESTION", `No question for ${category} ${difficulty}`);
    const q = pool[Math.floor(rng() * pool.length)];
    const order = shuffled([0, 1, 2, 3], rng);
    return {
      index,
      isHammer: index === lotCount - 1,
      questionId: q.id,
      category,
      difficulty,
      question: q.question,
      options: order.map((i) => q.options[i]),
      answerIndex: order.indexOf(q.answerIndex),
    };
  });

  const bidders = ["player", ...rivals];
  const rolls = { knows: [], bluff: [], noise: [], pick: [], tieOrder: [] };
  for (let l = 0; l < lotCount; l++) {
    const row = () => Object.fromEntries(rivals.map((id) => [id, rng()]));
    rolls.knows.push(row());
    rolls.bluff.push(row());
    rolls.noise.push(row());
    rolls.pick.push(row());
    rolls.tieOrder.push(shuffled(bidders, rng));
  }
  return { date: dateLabel, saleNo, rivals, lots, rolls };
}

export function buildDay(dateStr, questions = QUESTIONS, roster = ROSTER) {
  if (!isValidDateString(dateStr)) throw new EngineError("BAD_DATE", `Invalid date: ${dateStr}`);
  const rng = mulberry32(hashString(`going-once:${dateStr}`));
  return buildDayInternal(
    { rng, dateLabel: dateStr, saleNo: saleNumber(dateStr), lotCount: LOT_COUNT, difficultyLadder: [...DIFFICULTY_LADDER] },
    questions,
    roster,
  );
}

const ROOM_LADDER_CYCLE = Object.freeze([1, 2, 3, 2]);

/** The ladder used for room sales when tension is set to "mixed". */
export function mixedLadder(lotCount) {
  const size = Math.max(1, Math.floor(lotCount) || 1);
  return Array.from({ length: size }, (_, i) => (i === size - 1 ? 2 : ROOM_LADDER_CYCLE[i % ROOM_LADDER_CYCLE.length]));
}

/**
 * A ladder of `lotCount` difficulties for a room sale.
 * difficulty: "easy" | "medium" | "hard" | "mixed"
 */
export function roomLadder(lotCount, difficulty = "mixed") {
  const size = Math.max(2, Math.min(12, Math.floor(lotCount) || 7));
  const fill = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : difficulty === "hard" ? 3 : null;
  return fill ? Array.from({ length: size }, () => fill) : mixedLadder(size);
}

export function createRoomGame(seed, { lotCount = 7, difficulty = "mixed" } = {}, questions = QUESTIONS, roster = ROSTER) {
  if (!seed || typeof seed !== "string") throw new EngineError("BAD_SEED", "A room seed is required");
  const count = Math.max(2, Math.min(12, Math.floor(lotCount) || 7));
  const rng = mulberry32(hashString(`going-once-room:${seed}`));
  const day = buildDayInternal(
    {
      rng,
      dateLabel: `room:${seed}`,
      saleNo: 9000 + (hashString(seed) % 1000),
      lotCount: count,
      difficultyLadder: roomLadder(count, difficulty),
    },
    questions,
    roster,
  );
  const banks = { player: START_CHIPS };
  for (const id of day.rivals) banks[id] = START_CHIPS;
  return {
    version: ENGINE_VERSION,
    ...day,
    banks,
    lotIndex: 0,
    phase: "bidding", // bidding | answering | stealing | resolved | finished
    current: null,
    history: [],
    final: null,
    room: { lotCount: count, difficulty },
  };
}

export function createGame(dateStr, questions = QUESTIONS, roster = ROSTER) {
  const day = buildDay(dateStr, questions, roster);
  const banks = { player: START_CHIPS };
  for (const id of day.rivals) banks[id] = START_CHIPS;
  return {
    version: ENGINE_VERSION,
    ...day,
    banks,
    lotIndex: 0,
    phase: "bidding", // bidding | answering | stealing | resolved | finished
    current: null,
    history: [],
    final: null,
  };
}

/* ------------------------------------------------------------------ rivals */

export function rivalKnows(state, lotIndex, id) {
  const lot = state.lots[lotIndex];
  const rival = getRivalById(id);
  return state.rolls.knows[lotIndex][id] < answerProbability(rival.skills[lot.category], lot.difficulty);
}

/** Index of the wrong option a rival (who does not know) picks. */
export function rivalWrongPick(state, lotIndex, id, exclude = null) {
  const lot = state.lots[lotIndex];
  const wrongs = [0, 1, 2, 3].filter((i) => i !== lot.answerIndex && i !== exclude);
  return wrongs[Math.floor(state.rolls.pick[lotIndex][id] * wrongs.length)];
}

export function rivalBid(state, lotIndex, id) {
  const bank = state.banks[id];
  if (bank < STEP) return 0;
  const lot = state.lots[lotIndex];
  const rival = getRivalById(id);
  const p = answerProbability(rival.skills[lot.category], lot.difficulty);
  const bluffing = state.rolls.bluff[lotIndex][id] < rival.bluff;
  const noise = state.rolls.noise[lotIndex][id];
  const perceived = clamp(p + (bluffing ? 0.35 : 0) + (noise - 0.5) * 0.2, 0, 1);
  const base = clamp((perceived - 0.3) / 0.7, 0, 1);
  const fraction = base * (0.2 + 0.7 * rival.boldness);
  let bid = floorTo(bank * fraction, STEP);
  bid = Math.min(bid, maxBid(bank, lot.isHammer));
  if (lot.isHammer) bid = clamp(bid, hammerMinimum(bank), bank);
  return bid;
}

const TELL_LINES = {
  keen: ["{S} is already leaning forward, paddle half raised.", "{S} nods before the lot has finished being read."],
  cool: ["{S} gives nothing away.", "{S} turns the paddle over in one hand."],
  wary: ["{S} studies the ceiling.", "{S} shifts in the seat and says nothing."],
};

/** Body language shown before bidding. It is a fallible hint: bluffers look keen when they are not. */
export function rivalTell(state, id) {
  const lotIndex = state.lotIndex;
  const lot = state.lots[lotIndex];
  const rival = getRivalById(id);
  const p = answerProbability(rival.skills[lot.category], lot.difficulty);
  const bluffing = state.rolls.bluff[lotIndex][id] < rival.bluff;
  let mood = p >= 0.65 ? "keen" : p <= 0.35 ? "wary" : "cool";
  if (bluffing) mood = "keen";
  const variant = state.rolls.noise[lotIndex][id] < 0.5 ? 0 : 1;
  const surname = rival.name.split(" ").pop();
  return { mood, line: TELL_LINES[mood][variant].replace("{S}", surname) };
}

/* ------------------------------------------------------------------ queries */

export function currentLot(state) {
  return state.lots[state.lotIndex];
}

export function bidBounds(state) {
  const bank = state.banks.player;
  const lot = state.lots[state.lotIndex];
  return { min: lot.isHammer ? hammerMinimum(bank) : 0, max: maxBid(bank, lot.isHammer), step: STEP };
}

export function isValidBid(state, amount) {
  const { min, max } = bidBounds(state);
  return Number.isInteger(amount) && amount % STEP === 0 && amount >= min && amount <= max;
}

export function standings(state) {
  const ids = ["player", ...state.rivals];
  const rows = ids.map((id) => ({ id, chips: state.banks[id] }));
  rows.forEach((r) => {
    r.rank = 1 + rows.filter((o) => o.chips > r.chips).length;
  });
  rows.sort((a, b) => a.rank - b.rank);
  return rows;
}

export function playerRank(state) {
  return standings(state).find((r) => r.id === "player").rank;
}

/** won = answered right as winner or in the Hammer, stole = right steal, lost = chips lost, pass = no change. */
export function outcomeKind(record) {
  const d = record.deltas.player;
  if (d < 0) return "lost";
  if (d === 0) return "pass";
  if (record.steal && record.steal.by === "player" && record.steal.correct) return "stole";
  return "won";
}

export function lastRecord(state) {
  return state.history[state.history.length - 1] || null;
}

/* ------------------------------------------------------------------ reducer */

function assertPhase(state, ...phases) {
  if (!phases.includes(state.phase)) {
    throw new EngineError("BAD_PHASE", `Action not allowed during phase "${state.phase}"`);
  }
}

function checkAnswerIndex(index, allowNull = true) {
  if (index === null && allowNull) return;
  if (!Number.isInteger(index) || index < 0 || index > 3) {
    throw new EngineError("BAD_ANSWER", "Answer must be an option index from 0 to 3 (or null for a timeout)");
  }
}

function emptyDeltas(state) {
  const d = { player: 0 };
  for (const id of state.rivals) d[id] = 0;
  return d;
}

function finalizeLot(state, cur) {
  const lot = state.lots[state.lotIndex];
  for (const id of Object.keys(cur.deltas)) {
    state.banks[id] += cur.deltas[id];
    if (state.banks[id] < 0 || state.banks[id] % STEP !== 0) {
      throw new EngineError("INVARIANT", `Bank for ${id} became ${state.banks[id]}`);
    }
  }
  state.history.push({
    lotIndex: state.lotIndex,
    questionId: lot.questionId,
    category: lot.category,
    difficulty: lot.difficulty,
    isHammer: lot.isHammer,
    bids: cur.bids,
    passedIn: cur.passedIn,
    winnerId: cur.winnerId,
    winnerCorrect: cur.winnerCorrect,
    winnerPick: cur.winnerPick,
    runnerUpId: cur.runnerUpId,
    steal: cur.steal,
    results: cur.results,
    deltas: cur.deltas,
    banksAfter: { ...state.banks },
  });
  state.current = null;
  state.phase = "resolved";
  return state;
}

function resolveRivalSteal(state, cur) {
  const lotIndex = state.lotIndex;
  const lot = state.lots[lotIndex];
  const id = cur.runnerUpId;
  const bid = cur.bids[id];
  const knows = rivalKnows(state, lotIndex, id);
  cur.steal = {
    by: id,
    correct: knows,
    pick: knows ? lot.answerIndex : rivalWrongPick(state, lotIndex, id, cur.winnerPick),
    declined: false,
  };
  cur.deltas[id] += knows ? bid + stealBonus(cur.bids[cur.winnerId]) : -bid;
}

function doBid(state, amount) {
  assertPhase(state, "bidding");
  if (!isValidBid(state, amount)) {
    const { min, max } = bidBounds(state);
    throw new EngineError("BAD_BID", `Bid must be a multiple of ${STEP} between ${min} and ${max}`);
  }
  const lotIndex = state.lotIndex;
  const lot = state.lots[lotIndex];
  const bids = { player: amount };
  for (const id of state.rivals) bids[id] = rivalBid(state, lotIndex, id);

  const cur = {
    bids,
    passedIn: false,
    winnerId: null,
    winnerCorrect: null,
    winnerPick: null,
    runnerUpId: null,
    steal: null,
    results: null,
    deltas: emptyDeltas(state),
  };

  if (lot.isHammer) {
    cur.results = {};
    cur.hammer = true;
    state.current = cur;
    state.phase = "answering";
    return state;
  }

  const tie = state.rolls.tieOrder[lotIndex];
  const eligible = ["player", ...state.rivals]
    .filter((id) => bids[id] >= STEP)
    .sort((a, b) => bids[b] - bids[a] || tie.indexOf(a) - tie.indexOf(b));

  if (eligible.length === 0) {
    cur.passedIn = true;
    return finalizeLot(state, cur);
  }
  cur.winnerId = eligible[0];
  cur.runnerUpId = eligible[1] || null;

  if (cur.winnerId === "player") {
    state.current = cur;
    state.phase = "answering";
    return state;
  }

  // A rival won. Resolve their answer now.
  const winnerBid = bids[cur.winnerId];
  if (rivalKnows(state, lotIndex, cur.winnerId)) {
    cur.winnerCorrect = true;
    cur.winnerPick = lot.answerIndex;
    cur.deltas[cur.winnerId] += winnerBid;
    return finalizeLot(state, cur);
  }
  cur.winnerCorrect = false;
  cur.winnerPick = rivalWrongPick(state, lotIndex, cur.winnerId);
  cur.deltas[cur.winnerId] -= winnerBid;
  if (cur.runnerUpId === "player") {
    state.current = cur;
    state.phase = "stealing";
    return state;
  }
  if (cur.runnerUpId) resolveRivalSteal(state, cur);
  return finalizeLot(state, cur);
}

function doAnswer(state, index) {
  assertPhase(state, "answering");
  checkAnswerIndex(index);
  const lotIndex = state.lotIndex;
  const lot = state.lots[lotIndex];
  const cur = state.current;
  const correct = index === lot.answerIndex;

  if (cur.hammer) {
    cur.results.player = { wager: cur.bids.player, correct, pick: index };
    cur.deltas.player += correct ? cur.bids.player : -cur.bids.player;
    for (const id of state.rivals) {
      const knows = rivalKnows(state, lotIndex, id);
      cur.results[id] = {
        wager: cur.bids[id],
        correct: knows,
        pick: knows ? lot.answerIndex : rivalWrongPick(state, lotIndex, id),
      };
      cur.deltas[id] += knows ? cur.bids[id] : -cur.bids[id];
    }
    return finalizeLot(state, cur);
  }

  cur.winnerCorrect = correct;
  cur.winnerPick = index;
  cur.deltas.player += correct ? cur.bids.player : -cur.bids.player;
  if (!correct && cur.runnerUpId) resolveRivalSteal(state, cur);
  return finalizeLot(state, cur);
}

function doSteal(state, index) {
  assertPhase(state, "stealing");
  checkAnswerIndex(index);
  const cur = state.current;
  const lot = state.lots[state.lotIndex];
  if (index !== null && index === cur.winnerPick) {
    throw new EngineError("BAD_ANSWER", "That option was already ruled out by the failed winner");
  }
  const correct = index === lot.answerIndex;
  const bid = cur.bids.player;
  cur.steal = { by: "player", correct, pick: index, declined: false };
  cur.deltas.player += correct ? bid + stealBonus(cur.bids[cur.winnerId]) : -bid;
  return finalizeLot(state, cur);
}

function doDecline(state) {
  assertPhase(state, "stealing");
  const cur = state.current;
  cur.steal = { by: "player", correct: false, pick: null, declined: true };
  return finalizeLot(state, cur);
}

function doNext(state) {
  assertPhase(state, "resolved");
  if (state.lotIndex === state.lots.length - 1) {
    state.phase = "finished";
    state.final = standings(state);
  } else {
    state.lotIndex += 1;
    state.phase = "bidding";
  }
  return state;
}

/**
 * reduce(state, action) returns a NEW state and never mutates the old one. Actions:
 *   { type: "bid", amount }      phase bidding
 *   { type: "answer", index }    phase answering (index null = timed out)
 *   { type: "steal", index }     phase stealing  (index null = timed out, counts as wrong)
 *   { type: "decline" }          phase stealing
 *   { type: "next" }             phase resolved
 */
export function reduce(state, action) {
  const s = structuredClone(state);
  switch (action && action.type) {
    case "bid": return doBid(s, action.amount);
    case "answer": return doAnswer(s, action.index);
    case "steal": return doSteal(s, action.index);
    case "decline": return doDecline(s);
    case "next": return doNext(s);
    default: throw new EngineError("UNKNOWN_ACTION", `Unknown action: ${action && action.type}`);
  }
}

export function replay(dateStr, actions) {
  let s = createGame(dateStr);
  for (const a of actions) s = reduce(s, a);
  return s;
}
