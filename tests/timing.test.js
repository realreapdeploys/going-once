import { test } from "node:test";
import assert from "node:assert/strict";

import { remainingMs, startTimer, ANSWER_MS } from "../src/timing.js";

test("at the start of the timer the full duration remains", () => {
  assert.equal(remainingMs(1000, 1000), ANSWER_MS);
});

test("mid way through, half the duration remains", () => {
  assert.equal(remainingMs(1000, 1000 + ANSWER_MS / 2), ANSWER_MS / 2);
});

test("exactly at the limit nothing remains", () => {
  assert.equal(remainingMs(1000, 1000 + ANSWER_MS), 0);
});

test("past the limit clamps to zero", () => {
  assert.equal(remainingMs(1000, 1000 + ANSWER_MS + 5000), 0);
});

test("a clock that moved backwards cannot exceed the full duration", () => {
  assert.equal(remainingMs(1000, 500), ANSWER_MS);
});

test("a null start means the timer has not started", () => {
  assert.equal(remainingMs(null, 12345), ANSWER_MS);
  assert.equal(remainingMs(undefined, 12345), ANSWER_MS);
});

test("garbage input falls back to the full duration", () => {
  assert.equal(remainingMs(NaN, 1000), ANSWER_MS);
  assert.equal(remainingMs(1000, NaN), ANSWER_MS);
});

test("startTimer records stage, lot and time", () => {
  assert.deepEqual(startTimer("answering", 2, 777), { stage: "answering", lotIndex: 2, startedAt: 777 });
});
