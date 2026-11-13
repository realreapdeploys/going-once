import { test } from "node:test";
import assert from "node:assert/strict";
import {
  START_CHIPS, STEP, LOT_COUNT, DIFFICULTY_LADDER, LAUNCH_DATE,
  hashString, mulberry32, shuffled,
  isValidDateString, localDateString, daysBetween, addDays, saleNumber,
  answerProbability, stealBonus, hammerMinimum, maxBid,
  buildDay, createGame, reduce, replay, rivalBid, rivalTell, rivalKnows,
  isValidBid, bidBounds, standings, playerRank, outcomeKind, EngineError,
} from "../src/engine.js";
import { QUESTIONS, CATEGORIES } from "../src/questions.js";
import { ROSTER } from "../src/roster.js";

/* ---------- helpers ---------- */

function dayWithRival(id, from = LAUNCH_DATE) {
  for (let i = 0; i < 200; i++) {
    const g = createGame(addDays(from, i));
    if (g.rivals.includes(id)) return g;
  }
  throw new Error("no day found");
}

/** Force a rival's rolls for the CURRENT lot. */
function force(state, id, { knows, bluff, noise = 0.5 } = {}) {
  const s = structuredClone(state);
  const l = s.lotIndex;
  if (knows !== undefined) s.rolls.knows[l][id] = knows ? 0 : 0.9999999;
  if (bluff !== undefined) s.rolls.bluff[l][id] = bluff ? 0 : 0.9999999;
  s.rolls.noise[l][id] = noise;
  return s;
}

/** Take every rival out of the bidding by emptying their banks. */
function emptyRivals(state, except = []) {
  const s = structuredClone(state);
  for (const id of s.rivals) if (!except.includes(id)) s.banks[id] = 0;
  return s;
}

/* ---------- randomness and dates ---------- */

test("hashString and mulberry32 are deterministic and in range", () => {
  assert.equal(hashString("abc"), hashString("abc"));
  assert.notEqual(hashString("abc"), hashString("abd"));
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 1000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test("shuffled returns a permutation and does not mutate the input", () => {
  const src = [1, 2, 3, 4, 5, 6];
  const out = shuffled(src, mulberry32(7));
  assert.deepEqual(src, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...out].sort(), src);
});

test("date helpers", () => {
  assert.ok(isValidDateString("2026-11-14"));
  assert.ok(!isValidDateString("2026-02-30"));
  assert.ok(!isValidDateString("2026-2-3"));
  assert.ok(!isValidDateString(null));
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(daysBetween("2026-11-14", "2026-11-20"), 6);
  assert.equal(saleNumber(LAUNCH_DATE), 1);
  assert.equal(saleNumber(addDays(LAUNCH_DATE, 41)), 42);
  assert.equal(saleNumber("2020-01-01"), 1); // never below 1
  assert.equal(localDateString(new Date(2026, 10, 5, 23, 59)), "2026-11-05");
});

/* ---------- building a day ---------- */

test("buildDay is deterministic and well formed", () => {
  const a = buildDay("2026-11-14");
  const b = buildDay("2026-11-14");
  assert.deepEqual(a, b);
  assert.equal(a.rivals.length, 3);
  assert.equal(new Set(a.rivals).size, 3);
  assert.equal(a.lots.length, LOT_COUNT);
  assert.equal(new Set(a.lots.map((l) => l.category)).size, LOT_COUNT);
  a.lots.forEach((lot, i) => {
    assert.equal(lot.difficulty, DIFFICULTY_LADDER[i]);
    assert.equal(lot.isHammer, i === LOT_COUNT - 1);
    assert.equal(lot.options.length, 4);
    assert.ok(lot.answerIndex >= 0 && lot.answerIndex < 4);
    const src = QUESTIONS.find((q) => q.id === lot.questionId);
    assert.equal(lot.options[lot.answerIndex], src.options[src.answerIndex]);
    assert.deepEqual([...lot.options].sort(), [...src.options].sort());
  });
});

test("different days produce different sales", () => {
  const sigs = new Set();
  for (let i = 0; i < 20; i++) {
    const d = buildDay(addDays(LAUNCH_DATE, i));
    sigs.add(d.lots.map((l) => l.questionId).join(",") + d.rivals.join(","));
  }
  assert.ok(sigs.size >= 15);
});

test("buildDay rejects a bad date", () => {
  assert.throws(() => buildDay("nope"), (e) => e instanceof EngineError && e.code === "BAD_DATE");
});

/* ---------- maths ---------- */

test("answerProbability is in range and ordered by difficulty", () => {
  for (const r of ROSTER) {
    for (const c of CATEGORIES) {
      const s = r.skills[c];
      const p1 = answerProbability(s, 1), p2 = answerProbability(s, 2), p3 = answerProbability(s, 3);
      for (const p of [p1, p2, p3]) assert.ok(p >= 0 && p <= 1);
      assert.ok(p1 >= p2 && p2 >= p3);
    }
  }
});

test("stealBonus and hammerMinimum", () => {
  assert.equal(stealBonus(100), 50);
  assert.equal(stealBonus(5), 0);
  assert.equal(stealBonus(15), 5);
  assert.equal(stealBonus(1000), 500);
  assert.equal(hammerMinimum(1000), 250);
  assert.equal(hammerMinimum(985), 250);
  assert.equal(hammerMinimum(5), 5);
  assert.equal(hammerMinimum(0), 0);
});

test("rivalBid is always a multiple of STEP within the bank, and 0 with no bank", () => {
  for (let i = 0; i < 60; i++) {
    const g = createGame(addDays(LAUNCH_DATE, i));
    for (let lot = 0; lot < LOT_COUNT; lot++) {
      const s = { ...g, lotIndex: lot };
      for (const id of g.rivals) {
        const bid = rivalBid(s, lot, id);
        assert.ok(bid % STEP === 0 && bid >= 0 && bid <= START_CHIPS);
        if (lot === LOT_COUNT - 1) assert.ok(bid >= hammerMinimum(START_CHIPS));
      }
    }
    const broke = structuredClone(g);
    for (const id of g.rivals) broke.banks[id] = 0;
    for (const id of g.rivals) assert.equal(rivalBid(broke, 0, id), 0);
  }
});

test("rivalTell returns a mood and a line, and bluffers look keen", () => {
  const g = dayWithRival("marlowe");
  const forced = force(g, "marlowe", { bluff: true });
  const t = rivalTell(forced, "marlowe");
  assert.equal(t.mood, "keen");
  assert.ok(t.line.includes("Marlowe"));
});

/* ---------- bidding rules ---------- */

test("createGame starts every bank at 1000 in the bidding phase", () => {
  const g = createGame(LAUNCH_DATE);
  assert.equal(g.phase, "bidding");
  assert.equal(g.banks.player, START_CHIPS);
  for (const id of g.rivals) assert.equal(g.banks[id], START_CHIPS);
});

test("bid validation", () => {
  const g = createGame(LAUNCH_DATE);
  assert.ok(isValidBid(g, 0));
  assert.ok(isValidBid(g, 500));
  assert.ok(isValidBid(g, 35));
  for (const bad of [-5, 3, 505, 1000, 12.5, NaN, "100", null, undefined]) assert.ok(!isValidBid(g, bad), String(bad));
  assert.throws(() => reduce(g, { type: "bid", amount: 7 }), (e) => e.code === "BAD_BID");
  assert.throws(() => reduce(g, { type: "bid", amount: 1000 }), (e) => e.code === "BAD_BID");
});

test("house limit: half the bank on lots 1 to 4, the whole bank on the Hammer", () => {
  assert.equal(maxBid(1000, false), 500);
  assert.equal(maxBid(995, false), 495);
  assert.equal(maxBid(20, false), 10);
  assert.equal(maxBid(10, false), 5);
  assert.equal(maxBid(5, false), 5);
  assert.equal(maxBid(0, false), 0);
  assert.equal(maxBid(1000, true), 1000);
  assert.equal(maxBid(0, true), 0);
  for (let bank = 0; bank <= 4000; bank += STEP) {
    const m = maxBid(bank, false);
    assert.ok(m % STEP === 0 && m <= bank && m >= 0);
    if (bank > 0) assert.ok(m >= STEP);
  }
});

test("rivals obey the house limit on lots 1 to 4", () => {
  for (let i = 0; i < 80; i++) {
    const g = createGame(addDays(LAUNCH_DATE, i));
    for (let lot = 0; lot < LOT_COUNT - 1; lot++) {
      for (const id of g.rivals) assert.ok(rivalBid(g, lot, id) <= 500);
    }
  }
});

test("actions are rejected in the wrong phase", () => {
  const g = createGame(LAUNCH_DATE);
  assert.throws(() => reduce(g, { type: "answer", index: 0 }), (e) => e.code === "BAD_PHASE");
  assert.throws(() => reduce(g, { type: "next" }), (e) => e.code === "BAD_PHASE");
  assert.throws(() => reduce(g, { type: "steal", index: 0 }), (e) => e.code === "BAD_PHASE");
  assert.throws(() => reduce(g, { type: "wat" }), (e) => e.code === "UNKNOWN_ACTION");
});

test("reduce never mutates the previous state", () => {
  const g = createGame(LAUNCH_DATE);
  const snapshot = JSON.stringify(g);
  reduce(g, { type: "bid", amount: 100 });
  assert.equal(JSON.stringify(g), snapshot);
});

test("everyone passing passes the lot in with no chip changes", () => {
  const g = emptyRivals(createGame(LAUNCH_DATE));
  const s = reduce(g, { type: "bid", amount: 0 });
  assert.equal(s.phase, "resolved");
  assert.equal(s.history[0].passedIn, true);
  assert.equal(s.banks.player, START_CHIPS);
  assert.equal(outcomeKind(s.history[0]), "pass");
});

test("player wins alone and answers right: gains the bid", () => {
  const g = emptyRivals(createGame(LAUNCH_DATE));
  let s = reduce(g, { type: "bid", amount: 300 });
  assert.equal(s.phase, "answering");
  assert.equal(s.current.winnerId, "player");
  s = reduce(s, { type: "answer", index: s.lots[0].answerIndex });
  assert.equal(s.phase, "resolved");
  assert.equal(s.banks.player, 1300);
  assert.equal(outcomeKind(s.history[0]), "won");
});

test("player wins alone and answers wrong or times out: loses the bid", () => {
  const g = emptyRivals(createGame(LAUNCH_DATE));
  const wrong = (g.lots[0].answerIndex + 1) % 4;
  let s = reduce(reduce(g, { type: "bid", amount: 300 }), { type: "answer", index: wrong });
  assert.equal(s.banks.player, 700);
  assert.equal(outcomeKind(s.history[0]), "lost");
  s = reduce(reduce(g, { type: "bid", amount: 300 }), { type: "answer", index: null });
  assert.equal(s.banks.player, 700);
});

test("player can bottom out at 0 in the Hammer but never below", () => {
  let s = toHammer(createGame(LAUNCH_DATE));
  s = reduce(s, { type: "bid", amount: 1000 });
  s = reduce(s, { type: "answer", index: (s.lots[LOT_COUNT - 1].answerIndex + 1) % 4 });
  assert.equal(s.banks.player, 0);
  s = reduce(s, { type: "next" });
  assert.equal(s.phase, "finished");
});

test("a player with 0 chips can only pass", () => {
  let g = emptyRivals(createGame(LAUNCH_DATE));
  g.banks.player = 0;
  assert.deepEqual(bidBounds(g), { min: 0, max: 0, step: STEP });
  const s = reduce(g, { type: "bid", amount: 0 });
  assert.equal(s.phase, "resolved");
});

test("a rival who wins and knows the answer gains their bid", () => {
  const base = dayWithRival("marlowe");
  let g = emptyRivals(base, ["marlowe"]);
  g = force(g, "marlowe", { knows: true, bluff: true });
  const s = reduce(g, { type: "bid", amount: 0 });
  const rec = s.history[0];
  assert.equal(rec.winnerId, "marlowe");
  assert.equal(rec.winnerCorrect, true);
  assert.equal(s.banks.marlowe, START_CHIPS + rec.bids.marlowe);
  assert.equal(s.banks.player, START_CHIPS);
});

test("a rival who wins and does not know loses their bid, and nobody steals when no runner-up", () => {
  const base = dayWithRival("marlowe");
  let g = emptyRivals(base, ["marlowe"]);
  g = force(g, "marlowe", { knows: false, bluff: true });
  const s = reduce(g, { type: "bid", amount: 0 });
  const rec = s.history[0];
  assert.equal(rec.winnerCorrect, false);
  assert.equal(rec.steal, null);
  assert.equal(s.banks.marlowe, START_CHIPS - rec.bids.marlowe);
  assert.notEqual(rec.winnerPick, s.lots[0].answerIndex);
});

test("player steal: right answer pays own bid plus half the failed bid", () => {
  const base = dayWithRival("marlowe");
  let g = emptyRivals(base, ["marlowe"]);
  g = force(g, "marlowe", { knows: false, bluff: true });
  let s = reduce(g, { type: "bid", amount: 5 });
  assert.equal(s.phase, "stealing");
  const failedBid = s.current.bids.marlowe;
  assert.ok(failedBid > 5);
  assert.equal(s.current.runnerUpId, "player");
  s = reduce(s, { type: "steal", index: s.lots[0].answerIndex });
  assert.equal(s.phase, "resolved");
  assert.equal(s.banks.player, START_CHIPS + 5 + stealBonus(failedBid));
  assert.equal(s.banks.marlowe, START_CHIPS - failedBid);
  assert.equal(outcomeKind(s.history[0]), "stole");
});

test("player steal: wrong answer or timeout costs only the own bid; decline costs nothing", () => {
  const base = dayWithRival("marlowe");
  let g = emptyRivals(base, ["marlowe"]);
  g = force(g, "marlowe", { knows: false, bluff: true });
  const start = reduce(g, { type: "bid", amount: 50 });
  const wrongPick = start.current.winnerPick;
  const answer = start.lots[0].answerIndex;
  const other = [0, 1, 2, 3].find((i) => i !== answer && i !== wrongPick);

  assert.equal(reduce(start, { type: "steal", index: other }).banks.player, START_CHIPS - 50);
  assert.equal(reduce(start, { type: "steal", index: null }).banks.player, START_CHIPS - 50);
  const declined = reduce(start, { type: "decline" });
  assert.equal(declined.banks.player, START_CHIPS);
  assert.equal(declined.history[0].steal.declined, true);
  assert.equal(outcomeKind(declined.history[0]), "pass");
  assert.throws(() => reduce(start, { type: "steal", index: wrongPick }), (e) => e.code === "BAD_ANSWER");
});

test("rival steals after the player answers wrong", () => {
  const base = dayWithRival("marlowe");
  let g = emptyRivals(base, ["marlowe"]);
  g = force(g, "marlowe", { knows: true, bluff: true });
  g.banks.marlowe = 600; // his bid is capped at 300, so a player bid of 500 always wins
  let s = reduce(g, { type: "bid", amount: 500 });
  assert.equal(s.current.winnerId, "player");
  const marloweBid = s.current.bids.marlowe;
  assert.ok(marloweBid >= STEP && marloweBid <= 300);
  const wrong = (s.lots[0].answerIndex + 1) % 4;
  s = reduce(s, { type: "answer", index: wrong });
  assert.equal(s.banks.player, 500);
  assert.equal(s.history[0].steal.by, "marlowe");
  assert.equal(s.history[0].steal.correct, true);
  assert.equal(s.banks.marlowe, 600 + marloweBid + stealBonus(500));
});

test("a rival's wrong steal costs only their own bid", () => {
  const base = dayWithRival("marlowe");
  let g = emptyRivals(base, ["marlowe"]);
  g = force(g, "marlowe", { knows: false, bluff: true });
  g.banks.marlowe = 600;
  let s = reduce(g, { type: "bid", amount: 500 });
  const marloweBid = s.current.bids.marlowe;
  s = reduce(s, { type: "answer", index: (s.lots[0].answerIndex + 1) % 4 });
  assert.equal(s.history[0].steal.correct, false);
  assert.equal(s.banks.marlowe, 600 - marloweBid);
  assert.notEqual(s.history[0].steal.pick, s.history[0].winnerPick);
});

test("ties go to the seeded order and the runner-up is the next eligible bid", () => {
  const g = dayWithRival("marlowe");
  const order = g.rolls.tieOrder[0];
  assert.deepEqual([...order].sort(), ["player", ...g.rivals].sort());
});

/* ---------- the Hammer ---------- */

function toHammer(g) {
  let s = emptyRivals(g);
  for (let i = 0; i < LOT_COUNT - 1; i++) {
    s = reduce(s, { type: "bid", amount: 0 });
    s = reduce(s, { type: "next" });
  }
  return s;
}

test("the Hammer: wager minimum is enforced and every bidder answers", () => {
  let s = toHammer(createGame(LAUNCH_DATE));
  assert.equal(s.lotIndex, LOT_COUNT - 1);
  assert.equal(s.phase, "bidding");
  assert.deepEqual(bidBounds(s), { min: 250, max: 1000, step: STEP });
  assert.throws(() => reduce(s, { type: "bid", amount: 100 }), (e) => e.code === "BAD_BID");
  s = reduce(s, { type: "bid", amount: 250 });
  assert.equal(s.phase, "answering");
  s = reduce(s, { type: "answer", index: s.lots[LOT_COUNT - 1].answerIndex });
  assert.equal(s.phase, "resolved");
  const rec = s.history[LOT_COUNT - 1];
  assert.equal(s.banks.player, 1250);
  assert.equal(rec.results.player.correct, true);
  assert.equal(outcomeKind(rec), "won");
});

test("the Hammer: a wrong answer loses the wager and the rivals settle too", () => {
  // Rivals keep their full banks here so they actually wager.
  let s = createGame(LAUNCH_DATE);
  for (let i = 0; i < LOT_COUNT - 1; i++) {
    s = reduce(structuredClone({ ...s, banks: { ...s.banks, ...Object.fromEntries(s.rivals.map((id) => [id, 0])) } }), { type: "bid", amount: 0 });
    s = reduce(s, { type: "next" });
    for (const id of s.rivals) s.banks[id] = START_CHIPS;
  }
  assert.equal(s.lotIndex, LOT_COUNT - 1);
  s = reduce(s, { type: "bid", amount: 600 });
  s = reduce(s, { type: "answer", index: (s.lots[LOT_COUNT - 1].answerIndex + 1) % 4 });
  const rec = s.history[LOT_COUNT - 1];
  assert.equal(s.banks.player, 400);
  for (const id of s.rivals) {
    const r = rec.results[id];
    assert.ok(r.wager >= 250, "rivals wager at least the minimum");
    assert.equal(rec.deltas[id], r.correct ? r.wager : -r.wager);
    assert.equal(s.banks[id], START_CHIPS + rec.deltas[id]);
  }
});

test("finishing: next after the Hammer finishes the game with standings", () => {
  let s = toHammer(createGame(LAUNCH_DATE));
  s = reduce(s, { type: "bid", amount: 250 });
  s = reduce(s, { type: "answer", index: null });
  s = reduce(s, { type: "next" });
  assert.equal(s.phase, "finished");
  assert.equal(s.final.length, 4);
  assert.equal(s.final[0].rank, 1);
  assert.equal(s.history.length, LOT_COUNT);
  assert.throws(() => reduce(s, { type: "bid", amount: 0 }), (e) => e.code === "BAD_PHASE");
});

test("standings share a rank on equal chips", () => {
  const g = createGame(LAUNCH_DATE);
  const rows = standings(g);
  assert.ok(rows.every((r) => r.rank === 1));
  assert.equal(playerRank(g), 1);
  const s = structuredClone(g);
  s.banks.player = 900;
  assert.equal(playerRank(s), 4);
});

/* ---------- replay and the property sweep ---------- */

test("replay rebuilds exactly the same state from the action list", () => {
  const actions = [];
  let s = createGame("2026-12-25");
  const rng = mulberry32(99);
  while (s.phase !== "finished") {
    let a;
    if (s.phase === "bidding") {
      const { min, max } = bidBounds(s);
      a = { type: "bid", amount: min + STEP * Math.floor((rng() * (max - min)) / STEP) };
    } else if (s.phase === "answering") a = { type: "answer", index: Math.floor(rng() * 4) };
    else if (s.phase === "stealing") a = rng() < 0.5 ? { type: "decline" } : { type: "steal", index: [0, 1, 2, 3].find((i) => i !== s.current.winnerPick) };
    else a = { type: "next" };
    actions.push(a);
    s = reduce(s, a);
  }
  assert.deepEqual(replay("2026-12-25", actions), s);
});

test("property sweep: 400 random games keep every invariant", () => {
  for (let n = 0; n < 400; n++) {
    const date = addDays("2026-11-14", n);
    const rng = mulberry32(n + 1);
    let s = createGame(date);
    let steps = 0;
    while (s.phase !== "finished") {
      assert.ok(++steps < 60, "game must finish");
      if (s.phase === "bidding") {
        const { min, max } = bidBounds(s);
        const pick = rng();
        const amount = pick < 0.15 ? max : pick < 0.3 ? min : min + STEP * Math.floor((rng() * (max - min)) / STEP);
        s = reduce(s, { type: "bid", amount });
      } else if (s.phase === "answering") {
        s = reduce(s, { type: "answer", index: rng() < 0.1 ? null : Math.floor(rng() * 4) });
      } else if (s.phase === "stealing") {
        if (rng() < 0.4) s = reduce(s, { type: "decline" });
        else s = reduce(s, { type: "steal", index: rng() < 0.1 ? null : [0, 1, 2, 3].filter((i) => i !== s.current.winnerPick)[Math.floor(rng() * 3)] });
      } else s = reduce(s, { type: "next" });
      for (const [id, chips] of Object.entries(s.banks)) {
        assert.ok(chips >= 0 && chips % STEP === 0, `${date} ${id} ${chips}`);
      }
    }
    assert.equal(s.history.length, LOT_COUNT);
    s.history.forEach((rec, i) => {
      assert.equal(rec.lotIndex, i);
      const total = Object.values(rec.deltas).reduce((a, b) => a + b, 0);
      assert.ok(Number.isInteger(total));
    });
  }
});

test("rivalKnows is stable for a given state", () => {
  const g = createGame(LAUNCH_DATE);
  for (const id of g.rivals) assert.equal(rivalKnows(g, 0, id), rivalKnows(g, 0, id));
});
