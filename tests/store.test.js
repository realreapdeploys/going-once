import { test } from "node:test";
import assert from "node:assert/strict";

import { createStore, STORAGE_KEY, KEEP_DAYS, pruneSaves, validateSave } from "../src/store.js";
import { emptyProfile } from "../src/progress.js";
import { ENGINE_VERSION, addDays } from "../src/engine.js";

const TODAY = "2026-11-20";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}

function throwingStorage() {
  return {
    getItem() {
      throw new Error("nope");
    },
    setItem() {
      throw new Error("nope");
    },
    removeItem() {
      throw new Error("nope");
    },
  };
}

test("fresh storage loads an empty profile and no saves", () => {
  const store = createStore(memoryStorage());
  const { profile, saves, persistent } = store.load(TODAY);
  assert.equal(persistent, true);
  assert.deepEqual(saves, {});
  assert.equal(profile.played, 0);
  assert.equal(profile.soundOn, true);
  assert.deepEqual(profile.history, []);
});

test("round trip: save then load returns the same data", () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  store.load(TODAY);
  const profile = { ...emptyProfile(), soundOn: false };
  const saves = {
    [TODAY]: { engineVersion: ENGINE_VERSION, actions: [{ type: "bid", amount: 100 }], timer: null },
  };
  store.save({ profile, saves });

  const store2 = createStore(storage);
  const loaded = store2.load(TODAY);
  assert.equal(loaded.persistent, true);
  assert.equal(loaded.profile.soundOn, false);
  assert.deepEqual(loaded.saves[TODAY].actions, [{ type: "bid", amount: 100 }]);
});

test("corrupt JSON falls back to fresh state and never throws", () => {
  const store = createStore(memoryStorage({ [STORAGE_KEY]: "{not json" }));
  const { profile, saves, persistent } = store.load(TODAY);
  assert.deepEqual(saves, {});
  assert.equal(persistent, false);
  assert.equal(typeof profile, "object");
});

test("wrong shapes fall back to fresh state", () => {
  for (const bad of ['"hello"', "[1,2,3]", "42", "null"]) {
    const store = createStore(memoryStorage({ [STORAGE_KEY]: bad }));
    const { saves } = store.load(TODAY);
    assert.deepEqual(saves, {});
  }
});

test("a storage object that throws on read stays playable in memory", () => {
  const store = createStore(throwingStorage());
  const { saves, persistent } = store.load(TODAY);
  assert.deepEqual(saves, {});
  assert.equal(persistent, false);
  // writes do not throw either
  const ok = store.save({ profile: emptyProfile(), saves: {} });
  assert.equal(ok, false);
});

test("a storage object that throws on write reports non persistent but keeps memory", () => {
  const storage = memoryStorage();
  storage.setItem = () => {
    throw new Error("quota");
  };
  const store = createStore(storage);
  store.load(TODAY);
  const ok = store.saveProfile(emptyProfile());
  assert.equal(ok, false);
  assert.equal(store.persistent, false);
});

test("pruning keeps only the last 14 days", () => {
  const saves = {};
  for (let i = 0; i < 30; i += 1) {
    const date = addDays(TODAY, -i);
    saves[date] = { engineVersion: ENGINE_VERSION, actions: [], timer: null };
  }
  const pruned = pruneSaves(saves, TODAY);
  assert.equal(Object.keys(pruned).length, KEEP_DAYS);
  assert.ok(pruned[TODAY]);
  assert.ok(!pruned[addDays(TODAY, -KEEP_DAYS)]);
});

test("a day that fails to replay is discarded but other days survive", () => {
  const yesterday = addDays(TODAY, -1);
  const saves = {
    [TODAY]: { engineVersion: ENGINE_VERSION, actions: [{ type: "bid", amount: 999999 }], timer: null },
    [yesterday]: { engineVersion: ENGINE_VERSION, actions: [], timer: null },
  };
  const raw = JSON.stringify({ profile: emptyProfile(), saves });
  const store = createStore(memoryStorage({ [STORAGE_KEY]: raw }));
  const loaded = store.load(TODAY);
  assert.equal(loaded.saves[TODAY], undefined);
  assert.ok(loaded.saves[yesterday]);
});

test("a day from another engine version is discarded", () => {
  const { save } = validateSave({ engineVersion: 999, actions: [], timer: null });
  assert.equal(save, null);
});

test("malformed actions are rejected", () => {
  for (const actions of [
    [{ type: "explode" }],
    [{ type: "bid", amount: -5 }],
    [{ type: "bid", amount: 3.5 }],
    [{ type: "answer", index: 9 }],
    [{ type: "answer", index: "a" }],
    ["not an action"],
  ]) {
    const { save } = validateSave({ engineVersion: ENGINE_VERSION, actions, timer: null });
    assert.equal(save, null, JSON.stringify(actions));
  }
});

test("malformed timers are rejected", () => {
  for (const timer of [
    { stage: "bidding", lotIndex: 0, startedAt: 1 },
    { stage: "answering", lotIndex: -1, startedAt: 1 },
    { stage: "answering", lotIndex: 0, startedAt: "soon" },
    42,
  ]) {
    const { save } = validateSave({ engineVersion: ENGINE_VERSION, actions: [], timer });
    assert.equal(save, null, JSON.stringify(timer));
  }
});
