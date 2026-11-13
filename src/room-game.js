// Going Once: a shared room sale — one auction, one table, every seat live.
// The host runs this engine; nobody else needs it. Bids are sealed until the
// lot closes. Everyone (human or bot) wagering on the Hammer answers.
// Rolls, banks and answers never leave the host: snapshots carry only what a
// table is allowed to see.

import { QUESTIONS, CATEGORIES } from "./questions.js";
import { ROSTER, getRivalById } from "./roster.js";
import {
  STEP,
  START_CHIPS,
  hashString,
  mulberry32,
  hammerMinimum,
  maxBid,
  stealBonus,
  answerProbability,
  roomLadder,
} from "./engine.js";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const floorTo = (n, step) => Math.floor(n / step) * step;
const ceilTo = (n, step) => Math.ceil(n / step) * step;

function shuffled(items, rng) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ANSWER_MS_FALLBACK = 20000;
export const BID_MS = 45000;
export const STEAL_MS = 12000;
export const ANSWER_MS = ANSWER_MS_FALLBACK;

function saleBounds(bank, isHammer) {
  return { min: isHammer ? hammerMinimum(bank) : 0, max: maxBid(bank, isHammer), step: STEP };
}

export function createRoomSale(seed, { lotCount = 7, difficulty = "mixed", humans = ["Host"], botCount = 2 } = {}) {
  if (!seed || typeof seed !== "string") throw new Error("ROOM_SEED_REQUIRED");
  const count = clamp(Math.floor(lotCount) || 7, 2, 12);
  const rng = mulberry32(hashString(`going-once-room-game:${seed}`));

  const names = (humans.length ? humans : ["Host"]).map((n, i) => String(n || `Player ${i + 1}`).trim().slice(0, 24) || `Player ${i + 1}`);
  const rosterIds = ROSTER.map((r) => r.id);
  const botIds = shuffled(rosterIds, rng).slice(0, clamp(Math.floor(botCount) || 0, 0, 3));
  const seats = [
    ...names.map((name, i) => ({ id: `h-${i + 1}`, kind: "human", seatNumber: i + 1, name, playerId: null })),
    ...botIds.map((id) => ({ id, kind: "bot", name: getRivalById(id).name, botId: id })),
  ];

  const categoryPool = [];
  while (categoryPool.length < count) categoryPool.push(...shuffled(CATEGORIES, rng));
  const ladder = roomLadder(count, difficulty);
  const lots = categoryPool.slice(0, count).map((category, index) => {
    const diff = ladder[index];
    const pool = QUESTIONS.filter((q) => q.category === category && q.difficulty === diff);
    const q = pool.length ? pool[Math.floor(rng() * pool.length)] : QUESTIONS[Math.floor(rng() * QUESTIONS.length)];
    const order = shuffled([0, 1, 2, 3], rng);
    return {
      index,
      isHammer: index === count - 1,
      questionId: q.id,
      category,
      difficulty: diff,
      question: q.question,
      options: order.map((i) => q.options[i]),
      answerIndex: order.indexOf(q.answerIndex),
    };
  });

  const botSeatIds = seats.filter((s) => s.kind === "bot").map((s) => s.id);
  const bidders = seats.map((s) => s.id);
  const rolls = { knows: [], bluff: [], noise: [], pick: [], tieOrder: [] };
  for (let l = 0; l < count; l++) {
    const row = () => Object.fromEntries(botSeatIds.map((id) => [id, rng()]));
    rolls.knows.push(row());
    rolls.bluff.push(row());
    rolls.noise.push(row());
    rolls.pick.push(row());
    rolls.tieOrder.push(shuffled(bidders, rng));
  }

  const banks = Object.fromEntries(seats.map((s) => [s.id, START_CHIPS]));
  return {
    version: 1,
    room: true,
    seed,
    saleNo: 9000 + (hashString(seed) % 1000),
    lotCount: count,
    difficulty,
    seats,
    seatIndex: Object.fromEntries(seats.map((s) => [s.id, s])),
    bots: botSeatIds,
    humans: seats.filter((s) => s.kind === "human").map((s) => s.id),
    lots,
    rolls,
    banks,
    rivals: seats.slice(1).map((s) => s.id), // unused by UI outside POV remix; kept for parity
    lotIndex: 0,
    phase: "bidding", // bidding | answering | stealing | resolved | finished
    current: null,
    history: [],
    final: null,
  };
}

/* ------------------------------------------------------------- bids & bounds */

export function bidBoundsFor(state, seat) {
  return saleBounds(state.banks[seat], state.lots[state.lotIndex].isHammer);
}

function botBid(state, lotIndex, id) {
  const bank = state.banks[id];
  if (bank < STEP) return 0;
  const lot = state.lots[lotIndex];
  const bot = getRivalById(state.seatIndex[id].botId);
  const p = answerProbability(bot.skills[lot.category], lot.difficulty);
  const bluffing = state.rolls.bluff[lotIndex][id] < bot.bluff;
  const noise = state.rolls.noise[lotIndex][id];
  const perceived = clamp(p + (bluffing ? 0.35 : 0) + (noise - 0.5) * 0.2, 0, 1);
  const base = clamp((perceived - 0.3) / 0.7, 0, 1);
  const fraction = base * (0.2 + 0.7 * bot.boldness);
  let bid = floorTo(bank * fraction, STEP);
  bid = Math.min(bid, maxBid(bank, lot.isHammer));
  if (lot.isHammer) bid = clamp(bid, hammerMinimum(bank), bank);
  return bid;
}

function botKnows(state, lotIndex, id) {
  const bot = getRivalById(state.seatIndex[id].botId);
  const lot = state.lots[lotIndex];
  return state.rolls.knows[lotIndex][id] < answerProbability(bot.skills[lot.category], lot.difficulty);
}

function botWrongPick(state, lotIndex, id, exclude = null) {
  const lot = state.lots[lotIndex];
  const wrongs = [0, 1, 2, 3].filter((i) => i !== lot.answerIndex && i !== exclude);
  return wrongs[Math.floor(state.rolls.pick[lotIndex][id] * wrongs.length)];
}

function emptyDeltas(state) {
  return Object.fromEntries(state.seats.map((s) => [s.id, 0]));
}

function finalizeLot(state, cur) {
  const lot = state.lots[state.lotIndex];
  for (const id of Object.keys(cur.deltas)) state.banks[id] += cur.deltas[id];
  const record = {
    lotIndex: state.lotIndex,
    questionId: lot.questionId,
    category: lot.category,
    difficulty: lot.difficulty,
    isHammer: lot.isHammer,
    bids: { ...cur.bids },
    passedIn: cur.passedIn,
    winnerId: cur.winnerId,
    winnerCorrect: cur.winnerCorrect,
    winnerPick: cur.winnerPick,
    runnerUpId: cur.runnerUpId,
    steal: cur.steal || null,
    results: cur.results || null,
    deltas: { ...cur.deltas },
    banksAfter: { ...state.banks },
  };
  state.history.push(record);
  state.current = null;
  state.phase = "resolved";
  return state;
}

function resolveSeatSteal(state, cur) {
  const lotIndex = state.lotIndex;
  const lot = state.lots[lotIndex];
  const id = cur.runnerUpId;
  const bid = cur.bids[id];
  if (state.seatIndex[id].kind === "bot") {
    const knows = botKnows(state, lotIndex, id);
    cur.steal = {
      by: id,
      correct: knows,
      pick: knows ? lot.answerIndex : botWrongPick(state, lotIndex, id, cur.winnerPick),
      declined: false,
    };
    cur.deltas[id] += knows ? bid + stealBonus(cur.bids[cur.winnerId]) : -bid;
    return;
  }
  state.phase = "stealing";
  state.stealFor = id;
}

/** Apply every seat's bid (humans via `humanBids`, bots from rolls). Missing human bids count as passes. */
export function applyBids(state, humanBids = {}) {
  const lotIndex = state.lotIndex;
  const lot = state.lots[lotIndex];
  const bids = {};
  for (const seat of state.seats) {
    if (seat.kind === "human") {
      let amount = Number(humanBids[seat.id]);
      if (!Number.isFinite(amount) || amount < 0) amount = 0;
      const { min, max } = saleBounds(state.banks[seat.id], lot.isHammer);
      amount = clamp(floorTo(Math.round(amount), STEP), min, max);
      bids[seat.id] = amount;
    } else {
      bids[seat.id] = botBid(state, lotIndex, seat.id);
    }
  }

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
    cur.awaiting = [...state.humans];
    state.current = cur;
    state.phase = "answering";
    return state;
  }

  const tie = state.rolls.tieOrder[lotIndex];
  const eligible = state.seats
    .map((s) => s.id)
    .filter((id) => bids[id] >= STEP)
    .sort((a, b) => bids[b] - bids[a] || tie.indexOf(a) - tie.indexOf(b));

  if (eligible.length === 0) {
    cur.passedIn = true;
    return finalizeLot(state, cur);
  }
  cur.winnerId = eligible[0];
  cur.runnerUpId = eligible[1] || null;

  if (state.seatIndex[cur.winnerId].kind === "human") {
    cur.awaiting = [cur.winnerId];
    state.current = cur;
    state.phase = "answering";
    return state;
  }
  const winnerId = cur.winnerId;
  const winnerBid = bids[winnerId];
  if (botKnows(state, lotIndex, winnerId)) {
    cur.winnerCorrect = true;
    cur.winnerPick = lot.answerIndex;
    cur.deltas[winnerId] += winnerBid;
    return finalizeLot(state, cur);
  }
  cur.winnerCorrect = false;
  cur.winnerPick = botWrongPick(state, lotIndex, winnerId);
  cur.deltas[winnerId] -= winnerBid;
  if (cur.runnerUpId) resolveSeatSteal(state, cur);
  if (state.phase !== "stealing") return finalizeLot(state, cur);
  return state;
}

/** A seat answers (regular lots: the winner; Hammer: every human who wagered). */
export function applyAnswer(state, seat, index) {
  if (state.phase !== "answering") throw new Error("BAD_PHASE");
  const cur = state.current;
  if (!cur.awaiting.includes(seat)) throw new Error("NOT_AWAITED");
  const pick = index === null ? null : index;
  if (pick !== null && (!Number.isInteger(pick) || pick < 0 || pick > 3)) throw new Error("BAD_ANSWER");

  if (cur.hammer) {
    const lot = state.lots[state.lotIndex];
    const correct = pick === lot.answerIndex;
    const wager = cur.bids[seat];
    cur.results[seat] = { wager, correct, pick };
    cur.deltas[seat] += correct ? wager : -wager;
    cur.awaiting = cur.awaiting.filter((s) => s !== seat);
    if (cur.awaiting.length === 0) {
      // Bot results are computed only now, so live snapshots never carry them.
      for (const id of state.bots) {
        const knows = botKnows(state, state.lotIndex, id);
        cur.results[id] = { wager: cur.bids[id], correct: knows, pick: knows ? lot.answerIndex : botWrongPick(state, state.lotIndex, id) };
        cur.deltas[id] += knows ? cur.bids[id] : -cur.bids[id];
      }
      cur.winnerId = null;
      cur.winnerCorrect = null;
      return finalizeLot(state, cur);
    }
    return state;
  }

  const lot = state.lots[state.lotIndex];
  const correct = pick === lot.answerIndex;
  cur.winnerCorrect = correct;
  cur.winnerPick = pick;
  cur.deltas[seat] += correct ? cur.bids[seat] : -cur.bids[seat];
  cur.awaiting = cur.awaiting.filter((s) => s !== seat);
  if (!correct && cur.runnerUpId) resolveSeatSteal(state, cur);
  if (state.phase !== "stealing") return finalizeLot(state, cur);
  return state;
}

export function applySteal(state, seat, index) {
  if (state.phase !== "stealing") throw new Error("BAD_PHASE");
  if (seat !== state.stealFor) throw new Error("NOT_AWAITED");
  const cur = state.current;
  const lot = state.lots[state.lotIndex];
  if (cur.winnerPick === index) throw new Error("BAD_ANSWER");
  const correct = index === lot.answerIndex;
  const bid = cur.bids[seat];
  cur.steal = { by: seat, correct, pick: index, declined: false };
  cur.deltas[seat] += correct ? bid + stealBonus(cur.bids[cur.winnerId]) : -bid;
  state.stealFor = null;
  return finalizeLot(state, cur);
}

export function applyDecline(state, seat) {
  if (state.phase !== "stealing") throw new Error("BAD_PHASE");
  if (seat !== state.stealFor) throw new Error("NOT_AWAITED");
  const cur = state.current;
  cur.steal = { by: seat, correct: false, pick: null, declined: true };
  cur.passedIn = true;
  state.stealFor = null;
  return finalizeLot(state, cur);
}

export function advance(state) {
  if (state.phase !== "resolved") throw new Error("BAD_PHASE");
  if (state.lotIndex === state.lots.length - 1) {
    state.phase = "finished";
    state.final = standings(state);
  } else {
    state.lotIndex += 1;
    state.phase = "bidding";
  }
  return state;
}

export function standings(state) {
  const rows = state.seats.map((s) => ({ id: s.id, name: s.name, kind: s.kind, chips: state.banks[s.id] }));
  rows.forEach((r) => { r.rank = 1 + rows.filter((o) => o.chips > r.chips).length; });
  rows.sort((a, b) => a.rank - b.rank || b.chips - a.chips);
  return rows;
}

/* ------------------------------------------------------------- POV & leak safety */

function remapIds(value, mySeat) {
  if (typeof value === "string") return value === mySeat ? "player" : value;
  if (Array.isArray(value)) return value.map((v) => remapIds(v, mySeat));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k === mySeat ? "player" : k] = remapIds(v, mySeat);
    return out;
  }
  return value;
}

/** Rename one seat to "player" throughout a snapshot, leaving everything else alone. */
export function remapSnapshot(snap, mySeat) {
  return remapIds(snap, mySeat);
}

/** Everything a non-host client may see, with their own seat renamed to "player". */
export function povSnapshot(state, mySeat, locked = []) {
  const snap = {
    version: state.version,
    room: true,
    saleNo: state.saleNo,
    lotCount: state.lotCount,
    difficulty: state.difficulty,
    seats: state.seats.map((s) => ({ id: s.id, kind: s.kind, name: s.name })),
    lots: state.lots.map((lot) => {
      const keepAnswer = lot.index < state.lotIndex || state.phase === "finished" || (lot.index === state.lotIndex && state.phase === "resolved");
      const clone = { ...lot };
      if (!keepAnswer) delete clone.answerIndex;
      return clone;
    }),
    banks: { ...state.banks },
    rivals: state.seats.filter((s) => s.id !== mySeat).map((s) => s.id),
    lotIndex: state.lotIndex,
    phase: state.phase,
    current: null,
    history: state.history.map((rec) => ({ ...rec })),
    final: state.final ? [...state.final] : null,
    locked: [...locked],
  };
  if (state.phase !== "bidding" && state.current) {
    const cur = state.current;
    const revealed = state.phase === "resolved";
    snap.current = {
      bids: { ...cur.bids },
      passedIn: cur.passedIn,
      winnerId: cur.winnerId,
      winnerCorrect: revealed ? cur.winnerCorrect : null,
      winnerPick: revealed || state.phase === "stealing" ? cur.winnerPick : null,
      runnerUpId: revealed ? cur.runnerUpId : null,
      steal: revealed && cur.steal ? { ...cur.steal } : null,
      results: revealed && cur.results ? { ...cur.results } : null,
      hammer: cur.hammer === true || null,
      awaiting: Array.isArray(cur.awaiting) ? [...cur.awaiting] : null,
      stealFor: state.phase === "stealing" ? state.stealFor || null : null,
    };
  } else {
    snap.current = null;
  }
  // rename my seat everywhere
  return remapIds(snap, mySeat);
}
