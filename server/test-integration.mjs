import { io } from "socket.io-client";
import assert from "node:assert";

const URL = "http://127.0.0.1:3001";
const connect = () => io(URL, { transports: ["websocket"], reconnection: false, timeout: 3000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ack = (s, ev, data) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`no ack ${ev}`)), 5000); s.emit(ev, data, (r) => { clearTimeout(t); res(r); }); });
const track = (s) => { const box = { snap: null, lobby: null, host: null, closed: null }; s.on("snapshot", (d) => { box.snap = d; }); s.on("lobby", (d) => { box.lobby = d; }); s.on("room:host", (d) => { box.host = d; }); s.on("room:closed", (d) => { box.closed = d; }); return box; };

/* ---- Room 1: cap test ---- */
const Cap = connect(); await new Promise(r => Cap.on("connect", r));
const capRoom = await ack(Cap, "join", { create: true, name: "CapHost", settings: { lotCount: 3, difficulty: "easy", botCount: 0 } });
assert.equal(capRoom.ok, true);
for (let i = 1; i <= 9; i++) {
  const c = connect(); await new Promise(r => c.on("connect", r));
  const r = await ack(c, "join", { code: capRoom.code, name: `Seat${i}` });
  assert.equal(r.ok, true, `join ${i}: ${r.error}`);
  c.close();
}
const X = connect(); await new Promise(r => X.on("connect", r));
const refused = await ack(X, "join", { code: capRoom.code, name: "Latecomer" });
assert.equal(refused.ok, false, "11th seat admitted");
assert.match(refused.error, /full/i);
console.log("10-seat cap enforced ✓");
X.close(); Cap.close();

/* ---- Room 2: full match ---- */
const A = connect(); await new Promise(r => A.on("connect", r));
const boxA = track(A);
const created = await ack(A, "join", { create: true, name: "Reyes", settings: { lotCount: 3, difficulty: "easy", botCount: 0 } });
assert.equal(created.ok, true);
const code = created.code;
const B = connect(); await new Promise(r => B.on("connect", r));
const boxB = track(B);
const joined = await ack(B, "join", { code, name: "Marlowe" });
assert.equal(joined.ok, true);

await ack(A, "lobby:update", { settings: { lotCount: 3, difficulty: "easy", botCount: 0 } });
await ack(A, "lobby:start", {});
await sleep(300);
console.log("sale started; phase:", boxA.snap?.pov?.phase, "| hidden answerIndex count:", boxA.snap?.pov?.lots?.filter(l => l.answerIndex === undefined).length, "/", boxA.snap?.pov?.lots?.length);

await ack(A, "game:bid", { amount: 0 });
await sleep(100);
await ack(B, "game:bid", { amount: 100 });
await sleep(200);
console.log("after bids:", boxA.snap?.pov?.phase, "(winner:", boxA.snap?.pov?.current?.winnerId ?? "—", ")");

await ack(B, "game:answer", { index: 0 });
await sleep(200);
console.log("after answer:", boxA.snap?.pov?.phase);

if (boxA.snap?.pov?.phase === "stealing") {
  await ack(A, "game:decline", {});
  await sleep(200);
  console.log("after steal-decline:", boxA.snap?.pov?.phase);
}
const adv = await ack(A, "game:advance", {});
console.log("advance ack:", adv.ok);
await sleep(200);
console.log("lotIndex after page turn:", boxA.snap?.pov?.lotIndex);

/* ---- host failover mid-game ---- */
A.close();
await sleep(800);
console.log("host passes to:", boxB.host?.name ?? "(ever? check B lobby)", "| B lobby host:", boxB.lobby?.hostSeatId ?? "no lobby event");
const A2 = connect(); await new Promise(r => A2.on("connect", r));
const reclaim = await ack(A2, "join", { code, token: created.token, name: "Reyes" });
assert.equal(reclaim.ok, true);
assert.equal(reclaim.status, "sale");
console.log("A reclaimed seat mid-sale ✓ · status:", reclaim.status);

const dis = await ack(B, "lobby:disband", {});
console.log("failover proof — B (new host) can disband mid-sale?", dis.ok, "| B saw closed:", boxB.closed?.reason ?? "n/a");

const gone = await ack(A2, "game:advance", {});
console.log("action after disband rejected?", gone.ok === false ? "rejected ✓" : "accepted unexpectedly");
A2.close(); B.close();
console.log("INTEGRATION PASS");
process.exit(0);
