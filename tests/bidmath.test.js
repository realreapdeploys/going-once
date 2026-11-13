import { test } from "node:test";
import assert from "node:assert/strict";

import { snapBid, quickPicks, stepBid } from "../src/bidmath.js";

test("snapBid rounds to the nearest multiple of 5", () => {
  assert.equal(snapBid(103, { min: 0, max: 500 }), 105);
  assert.equal(snapBid(102, { min: 0, max: 500 }), 100);
  assert.equal(snapBid(7, { min: 0, max: 500 }), 5);
});

test("snapBid clamps into the bounds", () => {
  assert.equal(snapBid(9999, { min: 0, max: 500 }), 500);
  assert.equal(snapBid(-50, { min: 0, max: 500 }), 0);
  assert.equal(snapBid(10, { min: 25, max: 500 }), 25);
});

test("snapBid handles NaN, empty and garbage", () => {
  assert.equal(snapBid(NaN, { min: 0, max: 500 }), 0);
  assert.equal(snapBid("", { min: 0, max: 500 }), 0);
  assert.equal(snapBid("abc", { min: 0, max: 500 }), 0);
  assert.equal(snapBid(undefined, { min: 25, max: 500 }), 25);
});

test("snapBid handles decimal strings, negatives and huge values", () => {
  assert.equal(snapBid("123.4", { min: 0, max: 500 }), 125);
  assert.equal(snapBid("-200", { min: 0, max: 500 }), 0);
  assert.equal(snapBid("1e9", { min: 0, max: 500 }), 500);
  assert.equal(snapBid(1e15, { min: 0, max: 500 }), 500);
});

test("snapBid strips stray characters from typed input", () => {
  assert.equal(snapBid("bid 120 please", { min: 0, max: 500 }), 120);
  assert.equal(snapBid("100 chips", { min: 0, max: 500 }), 100);
});

test("snapBid with an inverted or empty range returns a sane value", () => {
  assert.equal(snapBid(100, { min: 0, max: 0 }), 0);
});

test("quickPicks for lots 1 to 4 offers Pass, Quarter and House limit", () => {
  const picks = quickPicks({ min: 0, max: 500 }, false);
  assert.deepEqual(picks.map((p) => p.id), ["pass", "quarter", "limit"]);
  assert.equal(picks[0].amount, 0);
  assert.equal(picks[1].amount, 250);
  assert.equal(picks[2].amount, 500);
});

test("quickPicks for the Hammer offers Minimum, Half and All in", () => {
  const picks = quickPicks({ min: 250, max: 1000 }, true);
  assert.deepEqual(picks.map((p) => p.id), ["min", "half", "all"]);
  assert.equal(picks[0].amount, 250);
  assert.equal(picks[1].amount, 500);
  assert.equal(picks[2].amount, 1000);
});

test("quickPicks with tiny banks stays on the grid and in bounds", () => {
  for (const bank of [5, 10, 15]) {
    const picks = quickPicks({ min: 0, max: bank }, false);
    for (const pick of picks) {
      assert.ok(pick.amount >= 0 && pick.amount <= bank, `${pick.id} within bounds`);
      assert.equal(pick.amount % 5, 0);
    }
    const hammer = quickPicks({ min: Math.ceil((bank * 0.25) / 5) * 5, max: bank }, true);
    for (const pick of hammer) {
      assert.ok(pick.amount >= Math.ceil((bank * 0.25) / 5) * 5 - 5 || pick.amount === 0);
      assert.equal(pick.amount % 5, 0);
    }
  }
});

test("quickPicks with a zero bank does not produce negatives", () => {
  const picks = quickPicks({ min: 0, max: 0 }, false);
  for (const pick of picks) assert.ok(pick.amount >= 0);
  const hammer = quickPicks({ min: 0, max: 0 }, true);
  for (const pick of hammer) assert.ok(pick.amount >= 0);
});

test("stepBid moves by the step and clamps", () => {
  assert.equal(stepBid(100, 1, { min: 0, max: 500 }), 105);
  assert.equal(stepBid(100, -1, { min: 0, max: 500 }), 95);
  assert.equal(stepBid(500, 1, { min: 0, max: 500 }), 500);
  assert.equal(stepBid(0, -1, { min: 0, max: 500 }), 0);
  assert.equal(stepBid(100, 1, { min: 0, max: 500 }, 50), 150);
});
