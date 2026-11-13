import { test } from "node:test";
import assert from "node:assert/strict";

import { QUESTIONS, CATEGORIES } from "../src/questions.js";

test("ids are unique", () => {
  const ids = QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("question text is unique", () => {
  const texts = QUESTIONS.map((q) => q.question.trim().toLowerCase());
  assert.equal(new Set(texts).size, texts.length);
});

test("every question has 4 distinct non-empty options", () => {
  for (const q of QUESTIONS) {
    assert.equal(q.options.length, 4, q.id);
    for (const option of q.options) {
      assert.ok(typeof option === "string" && option.trim().length > 0, q.id);
    }
    assert.equal(new Set(q.options.map((o) => o.trim().toLowerCase())).size, 4, q.id);
  }
});

test("answerIndex is in range", () => {
  for (const q of QUESTIONS) {
    assert.ok(Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4, q.id);
  }
});

test("every category and difficulty has at least 4 questions", () => {
  for (const category of CATEGORIES) {
    for (const difficulty of [1, 2, 3]) {
      const count = QUESTIONS.filter((q) => q.category === category && q.difficulty === difficulty).length;
      assert.ok(count >= 4, `${category} difficulty ${difficulty}: ${count}`);
    }
  }
});

test("every question is 140 characters or fewer", () => {
  for (const q of QUESTIONS) {
    assert.ok(q.question.length <= 140, `${q.id}: ${q.question.length} chars`);
  }
});

test("difficulty is 1, 2 or 3 and category is known", () => {
  for (const q of QUESTIONS) {
    assert.ok([1, 2, 3].includes(q.difficulty), q.id);
    assert.ok(CATEGORIES.includes(q.category), q.id);
  }
});
