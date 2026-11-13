// Going Once: private rooms over a public MQTT relay (WebSocket, TLS), so rooms
// work on networks that block game-specific ports. Star design: the host is
// authoritative for the lobby (settings, kick, disband, start); every player's
// sale is played locally and results are self-reported. Casual, no accounts,
// no anti-cheat — fine for a friendly competition, not for leagues.

import mqtt from "mqtt";
const { connect } = mqtt;

const BROKERS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://test.mosquitto.org:8081",
];

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0, 1
const TOPIC_IN_SUFFIX = "in";   // clients -> host (and finish aggregation)
const TOPIC_OUT_SUFFIX = "out"; // host -> everyone

const clampBots = (n) => Math.max(0, Math.min(3, Math.floor(Number(n)) || 0));

function randomId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeRoomCode() {
  let code = "";
  const bytes = new Uint32Array(5);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 5; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

function topicFor(code, which) {
  return `goingonce/rooms/${code}/${which}`;
}

export class RoomClient {
  constructor() {
    this.client = null;
    this.code = null;
    this.roomSeed = null;
    this.myId = randomId();
    this.myName = "";
    this.isHost = false;
    this.hostId = null;
    this.players = [];           // [{ id, name }]
    this.settings = { lotCount: 7, difficulty: "mixed", botCount: 2 };
    this.phase = "lobby";        // lobby | playing | ended
    this.outcome = null;         // null | "disbanded" | "kicked"
    this.finishes = new Map();   // id -> { id, name, chips }
    this.status = "idle";        // idle | connecting | connected | error
    this.error = null;
    this.broker = null;
    this.startedAt = null;       // when the sale started (for the results timer)
    this.onUpdate = null;        // set by the UI; called after any change
    this._brokerIndex = 0;
  }

  get finishCount() {
    let count = 0;
    for (const p of this.players) if (this.finishes.has(p.id)) count += 1;
    return count;
  }

  get allFinished() {
    return this.players.length > 0 && this.finishCount === this.players.length;
  }

  notify() {
    if (this.onUpdate) this.onUpdate();
  }

  _connect(code) {
    return new Promise((resolve, reject) => {
      this.status = "connecting";
      this.error = null;
      this.notify();
      const url = BROKERS[this._brokerIndex];
      const clientId = `goingonce-${this.myId}`;
      let settled = false;
      let timer = null;
      const client = connect(url, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 0,      // one shot: manual failover between brokers
        protocolVersion: 4,      // MQTT 3.1.1, widest broker support
        keepalive: 30,
      });
      client.on("connect", () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.client = client;
        this.broker = url;
        this.code = code;
        this.status = "connected";
        client.subscribe([topicFor(code, TOPIC_IN_SUFFIX), topicFor(code, TOPIC_OUT_SUFFIX)], () => {
          this.notify();
          resolve();
        });
        client.on("message", (topic, payload) => this._handleMessage(topic, payload));
      });
      const fail = (message) => {
        try { client.end(true); } catch { /* already gone */ }
        if (settled) return;
        if (this._brokerIndex + 1 < BROKERS.length) {
          this._brokerIndex += 1;
          this._connect(code).then(resolve, reject);
          return;
        }
        settled = true;
        clearTimeout(timer);
        this.status = "error";
        this.error = message || "Could not reach the relay. Check your connection and try again.";
        this.notify();
        reject(new Error(this.error));
      };
      client.on("error", () => fail("Could not reach the relay. Check your connection and try again."));
      timer = setTimeout(() => fail("The relay is not answering. Check your connection and try again."), 9000);
    });
  }

  async createRoom(name) {
    this.myName = String(name || "").trim().slice(0, 24) || "Player";
    this.isHost = true;
    this.hostId = this.myId;
    this.players = [{ id: this.myId, name: this.myName }];
    this.phase = "lobby";
    this.outcome = null;
    this.finishes = new Map();
    this._brokerIndex = 0;
    await this._connect(makeRoomCode());
    this._broadcastLobby();
    this.notify();
  }

  async joinRoom(code, name) {
    const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length !== 5) {
      this.error = "A room code is five letters and digits.";
      this.status = "error";
      this.notify();
      throw new Error(this.error);
    }
    this.myName = String(name || "").trim().slice(0, 24) || "Player";
    this.isHost = false;
    this.hostId = null;
    this.players = [];
    this.phase = "lobby";
    this.outcome = null;
    this.finishes = new Map();
    this._brokerIndex = 0;
    await this._connect(clean);
    this._send(TOPIC_IN_SUFFIX, { t: "hello", id: this.myId, name: this.myName });
    // If no host answers, the code is wrong or the room is gone.
    setTimeout(() => {
      if (this.hostId === null && this.phase === "lobby") {
        this.status = "error";
        this.error = `No room found for code ${clean}. Check the code with your host.`;
        this.notify();
      }
    }, 7000);
    this.notify();
  }

  setSettings(patch) {
    if (!this.isHost || this.phase !== "lobby") return;
    const next = { ...this.settings, ...patch };
    next.lotCount = Math.max(2, Math.min(12, Math.floor(Number(next.lotCount)) || 7));
    if (!["easy", "medium", "hard", "mixed"].includes(next.difficulty)) next.difficulty = "mixed";
    next.botCount = clampBots(next.botCount);
    this.settings = next;
    this._broadcastLobby();
  }

  beginSale({ seed, settings, seats }) {
    if (!this.isHost || this.phase !== "lobby") return;
    this.phase = "playing";
    this.startedAt = Date.now();
    this.roomSeed = seed;
    this.settings = settings;
    this.seats = seats;
    this.mySeat = (seats.find((s) => s.kind === "human" && s.playerId === this.myId) || seats[0]).id;
    this.lastSnapshot = null;
    this._send(TOPIC_OUT_SUFFIX, { t: "start", hostId: this.hostId, seed, settings, seats });
    this._broadcastLobby();
    this.notify();
  }

  publishSnapshot({ seq, deadline, duration, pub }) {
    if (!this.isHost) return;
    this._send(TOPIC_OUT_SUFFIX, { t: "snapshot", hostId: this.hostId, from: this.hostId, seq, deadline, duration, pub });
  }

  publishAction(msg) {
    this._send(TOPIC_IN_SUFFIX, { ...msg, t: msg.t, from: this.myId });
  }

  endRoom() {
    if (!this.isHost) return;
    this._send(TOPIC_OUT_SUFFIX, { t: "disband", hostId: this.hostId });
    this.phase = "ended";
    this.outcome = "disbanded";
    this._teardown();
    this.notify();
  }

  kick(id) {
    if (!this.isHost || this.phase !== "lobby") return;
    this.players = this.players.filter((p) => p.id !== id);
    this._send(TOPIC_OUT_SUFFIX, { t: "kick", hostId: this.hostId, id });
    this._broadcastLobby();
    this.notify();
  }

  disband() {
    if (!this.isHost || this.phase !== "lobby") return;
    this._send(TOPIC_OUT_SUFFIX, { t: "disband", hostId: this.hostId });
    this.phase = "ended";
    this.outcome = "disbanded";
    this.notify();
  }

  leave() {
    this._send(TOPIC_IN_SUFFIX, { t: "bye", id: this.myId });
    this._teardown();
  }

  finish(chips) {
    if (this.phase !== "playing") return;
    const entry = { id: this.myId, name: this.myName, chips: Math.round(chips) };
    this.finishes.set(this.myId, entry);
    this._send(TOPIC_IN_SUFFIX, { t: "finish", ...entry });
    this.notify();
  }

  results() {
    const rows = [];
    for (const p of this.players) {
      const f = this.finishes.get(p.id);
      rows.push({ id: p.id, name: p.name, chips: f ? f.chips : null, finished: Boolean(f) });
    }
    rows.sort((a, b) => (b.chips ?? -1) - (a.chips ?? -1));
    return rows;
  }

  _broadcastLobby() {
    this._send(TOPIC_OUT_SUFFIX, {
      t: "lobby",
      hostId: this.hostId,
      players: this.players,
      settings: this.settings,
      phase: this.phase,
    });
  }

  _send(which, message) {
    if (!this.client) return;
    try {
      this.client.publish(topicFor(this.code, which), JSON.stringify(message), { qos: 0, retain: false });
    } catch {
      /* relay hiccup: the UI shows status on the next round-trip */
    }
  }

  _handleMessage(topic, payload) {
    let msg;
    try {
      msg = JSON.parse(payload.toString());
    } catch {
      return;
    }
    const inTopic = topic.endsWith("/in");
    if (inTopic && this.hostEngine && msg.t !== "hello" && msg.t !== "bye") {
      this.hostEngine.handle(msg);
      return;
    }
    if (!inTopic && msg.t === "snapshot" && !this.isHost) {
      if (this.hostId && msg.hostId !== this.hostId) return;
      this.lastSnapshot = msg;
      this.notify();
      return;
    }
    if (inTopic && msg.t === "hello") {
      if (!this.isHost || this.phase !== "lobby") return;
      if (!this.players.some((p) => p.id === msg.id)) {
        this.players.push({ id: msg.id, name: String(msg.name || "Player").slice(0, 24) });
      }
      this._broadcastLobby();
      this.notify();
      return;
    }
    if (inTopic && msg.t === "bye") {
      if (!this.isHost || this.phase !== "lobby") return;
      this.players = this.players.filter((p) => p.id !== msg.id);
      this._broadcastLobby();
      this.notify();
      return;
    }
    if (inTopic && msg.t === "finish") {
      if (!this.players.some((p) => p.id === msg.id)) return;
      this.finishes.set(msg.id, { id: msg.id, name: String(msg.name || "Player").slice(0, 24), chips: Number(msg.chips) || 0 });
      this.notify();
      return;
    }
    if (!inTopic && msg.t === "lobby" && !this.isHost) {
      this.hostId = msg.hostId;
      this.players = Array.isArray(msg.players) ? msg.players : [];
      this.settings = msg.settings || this.settings;
      if (this.phase !== "ended") this.phase = msg.phase || "lobby";
      this.status = "connected";
      this.error = null;
      this.notify();
      return;
    }
    if (!inTopic && msg.t === "start" && !this.isHost) {
      if (this.hostId && msg.hostId !== this.hostId) return; // not our host
      this.phase = "playing";
      this.roomSeed = msg.seed;
      this.settings = msg.settings || this.settings;
      this.seats = msg.seats || [];
      this.mySeat = (this.seats.find((s) => s.kind === "human" && s.playerId === this.myId) || {}).id || null;
      this.startedAt = Date.now();
      this.lastSnapshot = null;
      this.notify();
      return;
    }
    if (!inTopic && msg.t === "kick" && !this.isHost) {
      if (this.hostId && msg.hostId !== this.hostId) return;
      if (msg.id === this.myId) {
        this.phase = "ended";
        this.outcome = "kicked";
        this._teardown();
        this.notify();
      }
      return;
    }
    if (!inTopic && msg.t === "disband" && !this.isHost) {
      if (this.hostId && msg.hostId !== this.hostId) return;
      this.phase = "ended";
      this.outcome = "disbanded";
      this._teardown();
      this.notify();
    }
  }

  _teardown() {
    if (this.client) {
      try { this.client.end(true); } catch { /* gone */ }
    }
    this.client = null;
  }
}
