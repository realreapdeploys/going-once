import { test } from "node:test";
import assert from "node:assert/strict";

import { formatChips, ordinal, longDate, formatCountdown, signedChips, deltaLabel, msUntilMidnight, surnameOf } from "../src/format.js";

test("formatChips groups thousands", () => {
  assert.equal(formatChips(1000), "1,000");
  assert.equal(formatChips(0), "0");
  assert.equal(formatChips(1234567), "1,234,567");
});

test("formatChips rounds and tolerates garbage", () => {
  assert.equal(formatChips(99.6), "100");
  assert.equal(formatChips(NaN), "0");
  assert.equal(formatChips(Infinity), "0");
});

test("ordinals 1st to 4th", () => {
  assert.equal(ordinal(1), "1st");
  assert.equal(ordinal(2), "2nd");
  assert.equal(ordinal(3), "3rd");
  assert.equal(ordinal(4), "4th");
});

test("longDate renders en-AU long form", () => {
  assert.equal(longDate("2026-11-14"), "Saturday 14 November 2026");
});

test("formatCountdown shows hours when needed", () => {
  assert.equal(formatCountdown(6 * 3600 * 1000 + 12 * 60 * 1000 + 33 * 1000), "06:12:33");
  assert.equal(formatCountdown(3600 * 1000), "01:00:00");
});

test("formatCountdown drops hours under one hour", () => {
  assert.equal(formatCountdown(12 * 60 * 1000 + 33 * 1000), "12:33");
  assert.equal(formatCountdown(59 * 1000), "00:59");
});

test("formatCountdown at zero and below", () => {
  assert.equal(formatCountdown(0), "00:00");
  assert.equal(formatCountdown(-5000), "00:00");
});

test("signedChips always carries a sign or zero", () => {
  assert.equal(signedChips(300), "+300");
  assert.equal(signedChips(-45), "-45");
  assert.equal(signedChips(0), "0");
});

test("deltaLabel spells out the change for screen readers", () => {
  assert.equal(deltaLabel(300), "gained 300 chips");
  assert.equal(deltaLabel(-45), "lost 45 chips");
  assert.equal(deltaLabel(0), "no change in chips");
});

test("msUntilMidnight is within (0, 24h]", () => {
  const ms = msUntilMidnight(new Date(2026, 10, 14, 23, 0, 0));
  assert.ok(ms > 0 && ms <= 24 * 3600 * 1000);
});

test("surnameOf returns the last word", () => {
  assert.equal(surnameOf("Orla Venn"), "Venn");
  assert.equal(surnameOf("Madonna"), "Madonna");
});
