// Validates the question bank. Exits non-zero and prints every problem found on failure.
import { QUESTIONS, CATEGORIES } from "../src/questions.js";

const problems = [];
const seenIds = new Set();
const seenText = new Set();

for (const q of QUESTIONS) {
  if (!q.id || typeof q.id !== "string") problems.push("a question has no id");
  else if (seenIds.has(q.id)) problems.push(`duplicate id: ${q.id}`);
  else seenIds.add(q.id);

  if (!CATEGORIES.includes(q.category)) problems.push(`${q.id}: unknown category ${q.category}`);
  if (![1, 2, 3].includes(q.difficulty)) problems.push(`${q.id}: bad difficulty ${q.difficulty}`);

  if (typeof q.question !== "string" || q.question.trim() === "") {
    problems.push(`${q.id}: empty question`);
  } else {
    if (q.question.length > 140) problems.push(`${q.id}: question is ${q.question.length} chars (max 140)`);
    const key = q.question.trim().toLowerCase();
    if (seenText.has(key)) problems.push(`${q.id}: duplicate question text`);
    else seenText.add(key);
  }

  if (!Array.isArray(q.options) || q.options.length !== 4) {
    problems.push(`${q.id}: needs exactly 4 options`);
  } else {
    for (const option of q.options) {
      if (typeof option !== "string" || option.trim() === "") problems.push(`${q.id}: empty option`);
    }
    const keys = q.options.map((o) => String(o).trim().toLowerCase());
    if (new Set(keys).size !== 4) problems.push(`${q.id}: options must be distinct`);
  }

  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) {
    problems.push(`${q.id}: answerIndex out of range`);
  }
}

for (const category of CATEGORIES) {
  for (const difficulty of [1, 2, 3]) {
    const count = QUESTIONS.filter((q) => q.category === category && q.difficulty === difficulty).length;
    if (count < 4) problems.push(`${category} difficulty ${difficulty}: only ${count} questions (need 4)`);
  }
}

if (problems.length) {
  console.error(`Question bank failed validation (${problems.length} problem${problems.length === 1 ? "" : "s"}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`Question bank OK: ${QUESTIONS.length} questions across ${CATEGORIES.length} categories.`);
