/* Going Once — private room service.
 * Server-authoritative: the daemon holds the sale, the auctioneer clocks and
 * the truth. Clients are thin viewers; host privileges (lobby controls) move
 * to the next-joined connected player when the host drops. Rooms are
 * ephemeral: nothing is written to disk, ever.
 */
import http from "node:http";
import crypto from "node:crypto";
import { Server } from "socket.io";
import {
  createRoomSale,
  applyBids,
  applyAnswer,
  applySteal,
  applyDecline,
  advance,
  povSnapshot,
  BID_MS,
  ANSWER_MS,
  STEAL_MS,
} from "../src/room-game.js";
import { START_CHIPS } from "../src/engine.js";

const PORT = Number(process.env.PORT) || 3001;
const MAX_SEATS = 10;            // humans + bots, combined
const MAX_LOTS = 20;
const MAX_BOTS = 4;
const MIN_LOTS = 3;
const ALLOWED_LOTS = [3, 5, 7, 10, 12, 15, 20];
const ALLOWED_DIFFICULTY = new Set(["mixed", "easy", "medium", "hard"]);
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0, 1
const ROOM_TTL_MS = 45 * 60 * 1000;
const CLOSE_GRACE_MS = 60 * 1000;

const rooms = new Map(); // code -> room
const seatIndex = new Map(); // token -> { code, seatId }

/* ------------------------------------------------------------ utilities */

const now = () => Date.now();
const roomCode = () => {
  let code = "";
  for (let i = 0; i < 5; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return code;
};
const cleanName = (raw) =>
  String(raw ?? "")
    .replace(/[<>&"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24) || `Player`;
const token = () => crypto.randomBytes(18).toString("hex");

function publicSeat(room, seat) {
  return {
    id: seat.id,
    kind: seat.kind,
    name: seat.name,
    connected: seat.connected,
    ready: seat.ready,
  };
}

function lobbyState(room, youSeatId) {
  return {
    code: room.code,
    status: room.status,
    hostSeatId: room.hostSeatId,
    you: youSeatId,
    settings: { ...room.settings },
    seats: room.seats.map((s) => publicSeat(room, s)),
    maxSeats: MAX_SEATS,
    maxLots: MAX_LOTS,
    allowedLots: ALLOWED_LOTS,
  };
}

function humanSeats(room) {
  return room.seats.filter((s) => s.kind === "human");
}
function connectedHumans(room) {
  return humanSeats(room).filter((s) => s.connected);
}
function seatById(room, seatId) {
  return room.seats.find((s) => s.id === seatId) || null;
}

function snapshotFor(room, seatId) {
  if (!room.sale) return null;
  return povSnapshot(room.sale, seatId, Array.from(room.locked));
}
const PHASE_MS = { bidding: BID_MS, answering: ANSWER_MS, stealing: STEAL_MS };
function currentDeadline(room) {
  if (!room.sale) return null;
  const ms = PHASE_MS[room.sale.phase];
  if (!ms) return null;
  if (room.deadlineAt && now() < room.deadlineAt) return { deadline: room.deadlineAt, duration: ms };
  // Phase began when timers were armed; keep the original absolute deadline if we still have one.
  if (room.deadlineAt) return { deadline: room.deadlineAt, duration: ms };
  room.deadlineAt = now() + ms;
  return { deadline: room.deadlineAt, duration: ms };
}

function broadcastSnapshots(io, room) {
  if (!room.sale) return;
  room.seq += 1;
  const clock = currentDeadline(room);
  for (const s of room.seats) {
    if (s.kind !== "human" || !s.connected) continue;
    io.to(s.socketId).emit("snapshot", {
      seq: room.seq,
      serverNow: now(),
      pov: snapshotFor(room, s.id),
      deadline: clock?.deadline ?? null,
      duration: clock?.duration ?? null,
    });
  }
}
function broadcastLobby(io, room) {
  for (const s of room.seats) {
    if (s.kind !== "human" || !s.connected) continue;
    io.to(s.socketId).emit("lobby", lobbyState(room, s.id));
  }
}
function broadcastClosed(io, room, reason) {
  for (const s of room.seats) {
    if (s.kind === "human" && s.socketId) io.to(s.socketId).emit("room:closed", { reason });
  }
}

function clearRoomTimers(room) {
  for (const t of room.timers) clearTimeout(t);
  room.timers = [];
}

function destroyRoom(io, room, reason = "house") {
  clearRoomTimers(room);
  broadcastClosed(io, room, reason);
  for (const s of room.seats) {
    if (s.token && seatIndex.get(s.token)?.code === room.code) seatIndex.delete(s.token);
  }
  rooms.delete(room.code);
  console.log(`[room ${room.code}] closed (${reason})`);
}

/* Pick the next host when the current one drops: oldest connected human. */
function promoteHost(io, room) {
  if (seatById(room, room.hostSeatId)?.connected && seatById(room, room.hostSeatId)?.kind === "human") return;
  const next = room.seats
    .filter((s) => s.kind === "human" && s.connected)
    .sort((a, b) => a.joinedAt - b.joinedAt)[0];
  room.hostSeatId = next ? next.id : room.hostSeatId;
  if (next) {
    console.log(`[room ${room.code}] host passes to ${next.name} (${next.id})`);
    io.to(next.socketId).emit("room:host", { seatId: next.id, name: next.name });
  }
}

/* ------------------------------------------------------ engine handling */

function startTimers(io, room) {
  clearRoomTimers(room);
  const sale = room.sale;
  if (sale.phase === "bidding") {
    room.deadlineAt = now() + BID_MS;
    room.timers.push(setTimeout(() => settleBidding(io, room), BID_MS));
  } else if (sale.phase === "answering") {
    room.deadlineAt = now() + ANSWER_MS;
    room.timers.push(setTimeout(() => settleAnswers(io, room), ANSWER_MS));
  } else if (sale.phase === "stealing") {
    room.deadlineAt = now() + STEAL_MS;
    room.timers.push(setTimeout(() => settleSteal(io, room), STEAL_MS));
  } else {
    room.deadlineAt = null;
  }
}

function seatListDelta(io, room) {
  broadcastSnapshots(io, room);
  startTimers(io, room);
}

function settleBidding(io, room) {
  const sale = room.sale;
  if (!sale || sale.phase !== "bidding") return;
  const bids = {};
  for (const id of room.locked.keys()) {
    const amount = room.locked.get(id);
    if (Number.isFinite(amount)) bids[id] = amount;
  }
  room.locked.clear();
  applyBids(sale, bids);
  afterEngineChange(io, room);
}

function settleAnswers(io, room) {
  const sale = room.sale;
  if (!sale || sale.phase !== "answering") return;
  const awaiting = [...(sale.current?.awaiting ?? [])];
  for (const seatId of awaiting) {
    try { applyAnswer(sale, seatId, null); } catch (err) { console.warn(`[room ${room.code}] auto answer ${seatId}:`, err.message); }
    if (sale.phase !== "answering") break;
  }
  afterEngineChange(io, room);
}

function settleSteal(io, room) {
  const sale = room.sale;
  if (!sale || sale.phase !== "stealing") return;
  try { applyDecline(sale, sale.stealFor); } catch (err) { console.warn(`[room ${room.code}] auto decline:`, err.message); }
  afterEngineChange(io, room);
}

function afterEngineChange(io, room) {
  const sale = room.sale;
  if (sale.phase === "finished") {
    room.status = "done";
    clearRoomTimers(room);
    broadcastSnapshots(io, room);
    io.to(ioRoom(room.code)).emit("room:done", { standings: sale.final });
    console.log(`[room ${room.code}] sale finished`);
    return;
  }
  broadcastSnapshots(io, room);
  startTimers(io, room);
}

function ioRoom(code) { return `code:${code}`; }

function newSaleFor(room) {
  const humans = humanSeats(room).map((s) => s.name);
  return createRoomSale(
    `going-once-match:${crypto.randomBytes(12).toString("hex")}`,
    { lotCount: room.settings.lotCount, difficulty: room.settings.difficulty, humans, botCount: room.settings.botCount }
  );
}

/* ------------------------------------------------------------ handlers */

const server = http.createServer((req, res) => {
    if (req.url === "/healthz" && req.method === "GET") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, rooms: rooms.size, uptime: process.uptime() }));
      return;
    }
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end("Going Once — room service. Live over WebSocket.\n");
  },
);

const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST"] },
  pingInterval: 10000,
  pingTimeout: 8000,
  maxHttpBufferSize: 32 * 1024,
});

io.on("connection", (socket) => {
  let room = null;
  let seatId = null;

  const fail = (msg) => socket.emit("room:error", { message: msg });

  socket.on("join", (payload, ack) => {
    const done = typeof ack === "function" ? ack : () => {};
    const { code, create = false, name, token: retok, settings } = payload ?? {};
    const cleanCode = String(code ?? "").trim().toUpperCase();

    if (create) {
      const freshCode = cleanCode && /^[A-Z0-9]{4,8}$/.test(cleanCode) ? cleanCode : roomCode();
      if (rooms.has(freshCode)) return done({ ok: false, error: "That table code is taken — try another." });
      const seat = { id: "h-1", kind: "human", name: cleanName(name), connected: true, ready: false, joinedAt: now(), socketId: socket.id, token: token() };
      const fresh = {
        code: freshCode,
        status: "lobby",
        hostSeatId: "h-1",
        settings: {
          lotCount: clampLot(settings?.lotCount),
          difficulty: clampDifficulty(settings?.difficulty),
          botCount: clampBots(settings?.botCount),
        },
        seats: [seat],
        sale: null,
        locked: new Map(),
        timers: [],
        seq: 0,
        createdAt: now(),
        emptySince: null,
      };
      rooms.set(freshCode, fresh);
      seatIndex.set(seat.token, { code: freshCode, seatId: "h-1" });
      room = fresh;
      seatId = "h-1";
      socket.join(ioRoom(freshCode));
      broadcastLobby(io, fresh);
      return done({ ok: true, created: true, code: freshCode, seat: publicSeat(fresh, seat), token: seat.token, status: "lobby" });
    }

    const existing = cleanCode ? rooms.get(cleanCode) : null;
    if (!existing) return done({ ok: false, error: "That table doesn't exist any more." });

    // Reclaim a seat with the reconnect token.
    if (retok) {
      const claim = seatIndex.get(retok);
      if (claim && claim.code === cleanCode) {
        const s = seatById(existing, claim.seatId);
        if (s) {
          if (s.socketId) io.to(s.socketId).emit("room:error", { message: "You were signed out: this table opened elsewhere." });
          s.connected = true;
          s.socketId = socket.id;
          room = existing;
          seatId = s.id;
          socket.join(ioRoom(cleanCode));
          const payloadOut = { ok: true, created: false, code: cleanCode, seat: publicSeat(existing, s), token: s.token, status: existing.status };
          if (existing.sale) payloadOut.snapshot = { seq: existing.seq, serverNow: now(), pov: snapshotFor(existing, s.id) };
          broadcastLobby(io, existing);
          return done(payloadOut);
        }
      }
      return done({ ok: false, error: "That seat is gone forever. Ask for a new room." });
    }

    if (existing.status !== "lobby") return done({ ok: false, error: "This sale has already started. Ask the house for a fresh table." });
    const humans = humanSeats(existing);
    if (humans.length >= MAX_SEATS) {
      return done({ ok: false, error: `This table is full (${MAX_SEATS} players). Try another room.` });
    }
    const nextId = `h-${Math.max(...existing.seats.map((s) => Number(String(s.id).replace(/\D/g, "")) || 0), 0) + 1}`;
    const seat = { id: nextId, kind: "human", name: cleanName(name), connected: true, ready: false, joinedAt: now(), socketId: socket.id, token: token() };
    existing.seats.push(seat);
    existing.emptySince = null;
    seatIndex.set(seat.token, { code: cleanCode, seatId: nextId });
    room = existing;
    seatId = nextId;
    socket.join(ioRoom(cleanCode));
    if (seat.socketId) broadcastLobby(io, existing);
    return done({ ok: true, created: false, code: cleanCode, seat: publicSeat(existing, seat), token: seat.token, status: "lobby" });
  });

  socket.on("lobby:update", (payload, ack) => {
    const done = typeof ack === "function" ? ack : () => {};
    if (!room) return done({ ok: false });
    if (room.hostSeatId !== seatId) return done({ ok: false, error: "Only the house can change this hand." });
    if (room.status !== "lobby") return done({ ok: false, error: "The sale has already started." });
    const lotCount = clampLot(payload?.settings?.lotCount);
    const difficulty = clampDifficulty(payload?.settings?.difficulty);
    const botCount = clampBots(payload?.settings?.botCount);
    room.settings = { lotCount, difficulty, botCount };
    broadcastLobby(io, room);
    return done({ ok: true });
  });

  socket.on("lobby:kick", (payload, ack) => {
    const done = typeof ack === "function" ? ack : () => {};
    if (!room) return done({ ok: false });
    if (room.hostSeatId !== seatId) return done({ ok: false, error: "Only the house can ask a player to leave." });
    if (room.status !== "lobby") return done({ ok: false, error: "A sale already started." });
    const target = String(payload?.seatId ?? "");
    const s = seatById(room, target);
    if (!s || s.kind !== "human") return done({ ok: false, error: "No such player." });
    if (target === room.hostSeatId) return done({ ok: false, error: "The house can't kick itself." });
    if (s.socketId) io.to(s.socketId).emit("room:closed", { reason: "kicked", by: seatById(room, seatId)?.name });
    if (s.token) seatIndex.delete(s.token);
    room.seats = room.seats.filter((x) => x !== s);
    if (room.seats.length === 0) return destroyRoom(io, room, "empty");
    broadcastLobby(io, room);
    return done({ ok: true });
  });

  socket.on("lobby:start", (_p, ack) => {
    const done = typeof ack === "function" ? ack : () => {};
    if (!room) return done({ ok: false });
    if (room.hostSeatId !== seatId) return done({ ok: false, error: "Only the house rings the gong." });
    if (room.status !== "lobby") return done({ ok: false, error: "This sale already started." });
    const humans = connectedHumans(room);
    if (humans.length < 1) return done({ ok: false, error: "No one is seated." });
    room.sale = newSaleFor(room);
    room.status = "sale";
    room.locked.clear();
    broadcastLobby(io, room);
    afterEngineChange(io, room);
    console.log(`[room ${room.code}] sale started (${room.settings.lotCount} lots, ${room.settings.difficulty}, ${room.settings.botCount} bots, ${humans.length} humans)`);
    return done({ ok: true });
  });

  socket.on("game:bid", (payload, ack) => {
    const done = typeof ack === "function" ? ack : () => {};
    if (!room || !room.sale) return done({ ok: false });
    if (room.sale.phase !== "bidding") return done({ ok: false, error: "Bidding is closed." });
    if (room.locked.has(seatId)) return done({ ok: false, error: "Your bid is already locked in." });
    const amount = Number(payload?.amount);
    if (!Number.isFinite(amount) || amount < 0) return done({ ok: false, error: "That's not a bid." });
    room.locked.set(seatId, Math.floor(amount));
    broadcastSnapshots(io, room);
    if (connectedHumans(room).every((s) => room.locked.has(s.id))) {
      const bids = {};
      for (const [id, v] of room.locked) bids[id] = v;
      room.locked.clear();
      applyBids(room.sale, bids);
      afterEngineChange(io, room);
    } else {
      startTimers(io, room);
    }
    return done({ ok: true });
  });

  socket.on("game:answer", (payload, ack) => {
    const done = typeof ack === "function" ? ack : () => {};
    if (!room || !room.sale) return done({ ok: false });
    if (room.sale.phase !== "answering") return done({ ok: false, error: "Not the time." });
    const index = payload?.index === null ? null : Number(payload?.index);
    try { applyAnswer(room.sale, seatId, index); } catch (err) { return done({ ok: false, error: err.message }); }
    afterEngineChange(io, room);
    return done({ ok: true });
  });

  socket.on("game:steal", (payload, ack) => {
    const done = typeof ack === "function" ? ack : () => {};
    if (!room || !room.sale) return done({ ok: false });
    if (room.sale.phase !== "stealing") return done({ ok: false, error: "Not the time." });
    const index = Number(payload?.index);
    try { applySteal(room.sale, seatId, index); } catch (err) { return done({ ok: false, error: err.message }); }
    afterEngineChange(io, room);
    return done({ ok: true });
  });

  socket.on("game:decline", (_p, ack) => {
    const done = typeof ack === "function" ? ack : () => {};
    if (!room || !room.sale) return done({ ok: false });
    if (room.sale.phase !== "stealing") return done({ ok: false, error: "Not the time." });
    try { applyDecline(room.sale, seatId); } catch (err) { return done({ ok: false, error: err.message }); }
    afterEngineChange(io, room);
    return done({ ok: true });
  });

  socket.on("game:advance", (_p, ack) => {
    const done = typeof ack === "function" ? ack : () => {};
    if (!room || !room.sale) return done({ ok: false });
    if (room.sale.phase !== "resolved") return done({ ok: false, error: "The dust hasn't settled." });
    try { advance(room.sale); } catch (err) { return done({ ok: false, error: err.message }); }
    afterEngineChange(io, room);
    return done({ ok: true });
  });

  socket.on("game:playAgain", (_p, ack) => {
    const done = typeof ack === "function" ? ack : () => {};
    if (!room) return done({ ok: false });
    if (room.hostSeatId !== seatId) return done({ ok: false, error: "Only the house can re-deal." });
    if (room.status !== "done") return done({ ok: false, error: "Finish this sale first." });
    if (connectedHumans(room).length < 1) return done({ ok: false, error: "Nobody is left to re-deal to." });
    room.sale = newSaleFor(room);
    room.status = "sale";
    room.locked.clear();
    broadcastLobby(io, room);
    afterEngineChange(io, room);
    return done({ ok: true });
  });

  socket.on("lobby:disband", (_p, ack) => {
    const done = typeof ack === "function" ? ack : () => {};
    if (!room) return done({ ok: false });
    if (room.hostSeatId !== seatId) return done({ ok: false, error: "Only the house can close the room." });
    destroyRoom(io, room, "disbanded");
    return done({ ok: true });
  });

  socket.on("disconnect", () => {
    if (!room) return;
    const s = seatById(room, seatId);
    if (s) { s.connected = false; s.socketId = null; }
    console.log(`[room ${room.code}] ${s?.name ?? seatId} left`);
    const remaining = connectedHumans(room);
    if (remaining.length === 0) {
      room.emptySince = now();
    }
    promoteHost(io, room);
    broadcastLobby(io, room);
    if (room.sale && (room.sale.phase === "answering" || room.sale.phase === "stealing")) {
      // A dropped answer/steal resolves the same as a slow one.
      remaining.length || clearRoomTimers(room);
      startTimers(io, room);
    }
  });
});

const clampLot = (v) => (ALLOWED_LOTS.includes(Number(v)) ? Number(v) : 7);
const clampDifficulty = (v) => (ALLOWED_DIFFICULTY.has(String(v ?? "mixed")) ? String(v) : "mixed");
const clampBots = (v) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(MAX_BOTS, Math.max(0, n)) : 0;
};

/* Garbage-collect dead rooms. */
setInterval(() => {
  for (const [code, room] of rooms) {
    if (room.emptySince && now() - room.emptySince > CLOSE_GRACE_MS) destroyRoom(io, room, "empty");
    else if (now() - room.createdAt > ROOM_TTL_MS) destroyRoom(io, room, "house");
  }
}, 60 * 1000).unref();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Going Once room service listening on 0.0.0.0:${PORT} (${START_CHIPS} chip stake)`);
});
