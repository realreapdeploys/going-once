import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RANKS, PADDLES, emptyProfile, reputationForGame, rankFor, rankProgress, unlockedPaddles,
  applyFinishedGame, displayStreak, buildShareText, formatChips,
} from "../src/progress.js";
import { createGame, reduce, bidBounds, LOT_COUNT } from "../src/engine.js";
import { QUESTIONS, CATEGORIES } from "../src/questions.js";
import { ROSTER } from "../src/roster.js";

test("reputationForGame", () => {
  assert.equal(reputationForGame({ chips: 1000, rank: 1, streak: 1 }), 50 + 50 + 5);
  assert.equal(reputationForGame({ chips: 0, rank: 4, streak: 1 }), 5 + 5);
  assert.equal(reputationForGame({ chips: 400, rank: 4, streak: 20 }), 5 + 35);
});

test("ranks and progress", () => {
  assert.equal(rankFor(0).id, "newcomer");
  assert.equal(rankFor(99).id, "bidder" === rankFor(99).id ? "bidder" : "newcomer");
  assert.equal(rankFor(100).id, "bidder");
  assert.equal(rankFor(99999).id, "auctioneer");
  const p = rankProgress(150);
  assert.equal(p.current.id, "bidder");
  assert.equal(p.next.id, "regular");
  assert.equal(p.into, 50);
  assert.equal(rankProgress(5000).next, null);
  assert.equal(rankProgress(5000).fraction, 1);
});

test("paddles unlock with rank, and the laurel paddle with badges", () => {
  assert.equal(unlockedPaddles(0).length, 1);
  assert.equal(unlockedPaddles(300).length, 3);
  assert.equal(unlockedPaddles(99999, 0).length, PADDLES.length - 1); // laurel still locked
  assert.equal(unlockedPaddles(99999, 3).length, PADDLES.length); // 3 badges: laurel unlocks
  assert.equal(PADDLES.length, RANKS.length + 1); // rank paddles plus the badge paddle
});

test("applyFinishedGame builds a streak, records history, and is idempotent per date", () => {
  let p = emptyProfile();
  let r = applyFinishedGame(p, { date: "2026-11-14", chips: 1200, rank: 1 });
  assert.equal(r.profile.streak, 1);
  assert.equal(r.profile.played, 1);
  assert.equal(r.profile.firstPlaces, 1);
  assert.ok(r.gained > 0);
  const again = applyFinishedGame(r.profile, { date: "2026-11-14", chips: 5000, rank: 1 });
  assert.equal(again.gained, 0);
  assert.equal(again.profile, r.profile);

  r = applyFinishedGame(r.profile, { date: "2026-11-15", chips: 800, rank: 3 });
  assert.equal(r.profile.streak, 2);
  r = applyFinishedGame(r.profile, { date: "2026-11-17", chips: 800, rank: 3 }); // skipped a day
  assert.equal(r.profile.streak, 1);
  assert.equal(r.profile.bestStreak, 2);
  assert.equal(r.profile.history.length, 3);
});

test("applyFinishedGame reports rank ups and new paddles", () => {
  const p = { ...emptyProfile(), reputation: 90 };
  const r = applyFinishedGame(p, { date: "2026-11-14", chips: 1500, rank: 1 });
  assert.ok(r.rankedUp);
  assert.deepEqual(r.newPaddles.map((x) => x.id), ["oxblood"]);
});

test("history is capped at 120", () => {
  let p = emptyProfile();
  for (let i = 0; i < 130; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    p = applyFinishedGame(p, { date: d, chips: 1000, rank: 2 }).profile;
  }
  assert.equal(p.history.length, 120);
  assert.equal(p.played, 130);
});

test("displayStreak resets after a missed day", () => {
  const p = { ...emptyProfile(), streak: 4, lastCompletedDate: "2026-11-14" };
  assert.equal(displayStreak(p, "2026-11-14"), 4);
  assert.equal(displayStreak(p, "2026-11-15"), 4);
  assert.equal(displayStreak(p, "2026-11-16"), 0);
  assert.equal(displayStreak(emptyProfile(), "2026-11-16"), 0);
});

test("share text is spoiler free and well formed", () => {
  let s = createGame("2026-11-14");
  for (const id of s.rivals) s.banks[id] = 0;
  for (let i = 0; i < LOT_COUNT; i++) {
    s = reduce(s, { type: "bid", amount: i === LOT_COUNT - 1 ? bidBounds(s).min : 0 });
    if (s.phase === "answering") s = reduce(s, { type: "answer", index: s.lots[i].answerIndex });
    s = reduce(s, { type: "next" });
  }
  const text = buildShareText(s, "https://example.com");
  const lines = text.split("\n");
  assert.equal(lines[0], "Going Once No. 1");
  assert.match(lines[1], /^[\d,]+ chips · (1st|2nd|3rd|4th) of 4$/);
  assert.equal(lines[2].split(" ").length, LOT_COUNT);
  assert.equal(lines[3], "https://example.com");
  for (const lot of s.lots) assert.ok(!text.includes(lot.question));
  assert.equal(formatChips(1420), "1,420");
});

test("data files are consistent", () => {
  for (const r of ROSTER) {
    for (const c of CATEGORIES) assert.ok(r.skills[c] >= 0 && r.skills[c] <= 1, `${r.id} ${c}`);
    assert.ok(r.portrait.length > 50);
  }
  assert.ok(QUESTIONS.length >= 850, "expanded question bank");
});
