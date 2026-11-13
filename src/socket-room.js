// Going Once — private rooms over the house relay.
// Server-authoritative: the relay keeps the books; browsers are thin viewers.
// Same surface as the local (daily) path aside from the room-specific bits,
// so the UI swaps transport with one factory.

import { io } from "socket.io-client";

export const SOCKET_ROOM_URL = import.meta.env.VITE_ROOM_URL || null;

const TOKEN_KEY = (code) => `goingonce:socket-room:${code}`;
const cleanName = (raw) => String(raw ?? "").replace(/[<>&"]/g, "").replace(/\s+/g, " ").trim().slice(0, 24) || "Player";

const MAX_SEATS = 10;
const LOT_OPTIONS = [3, 5, 7, 10, 12, 15, 20];
const DIFFICULTIES = ["mixed", "easy", "medium", "hard"];
const BOT_ROWS = [0, 1, 2, 3, 4];

export class SocketRoomClient {
  constructor() {
    this.isSocket = true;
    this.socket = null;
    this.code = null;
    this.myId = null;
    this.hostId = null;
    this.mySeat = null;
    this.isHost = false;
    this.players = [];
    this.settings = { lotCount: 7, difficulty: "mixed", botCount: 2 };
    this.phase = "lobby"; // lobby | playing | ended
    this.outcome = null;
    this.status = "idle";
    this.error = null;
    this.startedAt = null;
    this.lastSnapshot = null;
    this.onUpdate = null;
    this.maxSeats = MAX_SEATS;
    this.lotOptions = LOT_OPTIONS;
    this.botOptions = BOT_ROWS;
    this._token = null;
  }

  notify() {
    if (this.onUpdate) this.onUpdate();
  }

  _matchRoom() {
    // The relay assigns seat ids like "h-3"; keep them for rendering.
    return this.code;
  }

  _connect(url = SOCKET_ROOM_URL) {
    return new Promise((resolve, reject) => {
      this.status = "connecting";
      this.error = null;
      this.notify();
      const socket = io(url, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 800,
        reconnectionDelayMax: 4000,
        timeout: 8000,
      });
      this.socket = socket;
      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", () => {
        this.status = "error";
        this.error = "Could not reach the saleroom. Check your connection and try again.";
        this.notify();
        reject(new Error(this.error));
      });
      socket.on("lobby", (payload) => {
        this.applyLobby(payload);
        this.notify();
      });
      socket.on("snapshot", (payload) => {
        this.lastSnapshot = {
          seq: payload.seq,
          serverNow: payload.serverNow,
          pub: payload.pov,
          deadline: payload.deadline ?? null,
          duration: payload.duration ?? null,
        };
        this.notify();
      });
      socket.on("room:closed", (payload) => {
        this.phase = "ended";
        this.outcome = payload?.reason === "kicked" ? "kicked" : "disbanded";
        this.lastSnapshot = null;
        if (this.code) try { sessionStorage.removeItem(TOKEN_KEY(this.code)); } catch { /* private mode */ }
        this.notify();
      });
      socket.on("room:host", (payload) => {
        this.hostId = payload?.seatId ?? this.hostId;
        this.isHost = payload?.seatId === this.mySeat;
        this.notify();
      });
      socket.on("room:error", (payload) => {
        this.error = payload?.message ?? "Something went wrong in the saleroom.";
        this.notify();
      });
    });
  }

  applyLobby(payload) {
    if (!payload) return;
    this.code = payload.code ?? this.code;
    this.phase = payload.status === "lobby" ? "lobby" : payload.status === "done" ? "ended" : "playing";
    this.hostId = payload.hostSeatId ?? this.hostId;
    this.mySeat = payload.you ?? this.mySeat;
    this.myId = this.mySeat;
    this.isHost = this.mySeat != null && this.mySeat === this.hostId;
    this.settings = { ...this.settings, ...(payload.settings ?? {}) };
    this.players = (payload.seats ?? []).map((seat) => ({ id: seat.id, name: seat.name }));
    if (payload.maxSeats) this.maxSeats = payload.maxSeats;
    if (Array.isArray(payload.allowedLots)) this.lotOptions = payload.allowedLots;
    this.status = "connected";
    if (this.phase === "playing" && !this.startedAt) this.startedAt = Date.now();
  }

  _ack(event, payload) {
    return new Promise((resolve, reject) => {
      const socket = this.socket;
      if (!socket || !socket.connected) return reject(new Error("Not connected to the saleroom."));
      const timer = setTimeout(() => reject(new Error("The saleroom did not answer. Try again.")), 8000);
      socket.emit(event, payload, (response) => {
        clearTimeout(timer);
        if (!response?.ok) return reject(new Error(response?.error || "That move was refused."));
        resolve(response);
      });
    });
  }

  _saveToken(code, token) {
    this._token = token;
    try { sessionStorage.setItem(TOKEN_KEY(code), token); } catch { /* private mode */ }
  }
  _readToken(code) {
    if (this._token) return this._token;
    try { return sessionStorage.getItem(TOKEN_KEY(code)); } catch { return null; }
  }

  async createRoom(name, settings = null) {
    this.myId = null;
    await this._connect();
    const request = { create: true, name: cleanName(name), settings: settings ?? this.settings };
    const response = await this._ack("join", request);
    this.code = response.code;
    this.mySeat = response.seat?.id ?? null;
    this.myId = this.mySeat;
    this.hostId = this.mySeat;
    this.isHost = true;
    this.isSocket = true;
    this.lastSnapshot = null;
    this.phase = "lobby";
    this.outcome = null;
    this.settings = { ...this.settings, ...(response.settings ?? {}) };
    this._saveToken(this.code, response.token);
    this.notify();
  }

  async joinRoom(code, name) {
    this.myId = null;
    const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    const token = this._readToken(clean);
    await this._connect();
    const response = await this._ack("join", { code: clean, name: cleanName(name), token });
    this.code = response.code;
    this.mySeat = response.seat?.id ?? null;
    this.myId = this.mySeat;
    this.isHost = false;
    this.phase = response.status === "lobby" ? "lobby" : "playing";
    this.outcome = null;
    this.lastSnapshot = response.snapshot ? {
      seq: response.snapshot.seq,
      serverNow: response.snapshot.serverNow,
      pub: response.snapshot.pov,
      deadline: response.snapshot.deadline ?? null,
      duration: response.snapshot.duration ?? null,
    } : null;
    this._saveToken(this.code, response.token ?? token);
    this.notify();
  }

  setSettings(partial) {
    void this.updateSettings(partial);
  }

  setSettings(partial) {
    void this.updateSettings(partial);
  }

  async updateSettings(partial) {
    const merged = { ...this.settings, ...(partial ?? {}) };
    // clamp bots to what the seats can hold when the table is full
    const humans = this.players.length || 1;
    if (humans + Number(merged.botCount ?? 0) > this.maxSeats) {
      merged.botCount = Math.max(0, this.maxSeats - humans);
    }
    this.settings = merged;
    this.notify();
    await this._ack("lobby:update", { settings: merged });
  }

  async startSale() {
    await this._ack("lobby:start", {});
    this.startedAt = Date.now();
  }

  kick(seatId) {
    return this._ack("lobby:kick", { seatId }).then(
      () => {},
      () => {},
    );
  }

  disband() {
    // host ends the room for everybody; fire and leave regardless of ack
    this._ack("lobby:disband", {}).catch(() => {});
    this.phase = "ended";
    this.outcome = "disbanded";
    this.notify();
  }

  endRoom() {
    this.disband();
  }

  leave() {
    if (this.socket) {
      if (this.isHost) this.disband();
      this.socket.disconnect();
    }
    if (this.code) {
      try { sessionStorage.removeItem(TOKEN_KEY(this.code)); } catch { /* private mode */ }
    }
    this.status = "idle";
    this.phase = "lobby";
    this.myId = null;
    this.hostId = null;
    this.isHost = false;
    this.players = [];
    this.lastSnapshot = null;
    this.notify();
  }

  publishAction(msg) {
    if (!msg) return;
    const map = { bid: "game:bid", answer: "game:answer", steal: "game:steal", decline: "game:decline", advance: "game:advance" };
    const event = map[msg.t];
    if (!event) return;
    if (msg.t === "bid") this._ack(event, { amount: msg.amount });
    else if (msg.t === "answer") this._ack(event, { index: msg.index });
    else if (msg.t === "steal") this._ack(event, { index: msg.index });
    else this._ack(event, {});
  }

  async playAgain() {
    await this._ack("game:playAgain", {});
    this.startedAt = Date.now();
  }
}

export default SocketRoomClient;
export const __roomConsts = { MAX_SEATS, LOT_OPTIONS, BOT_ROWS, DIFFICULTIES };
