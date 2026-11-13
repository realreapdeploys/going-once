// Going Once: the host's loop. Lives on the host's browser; the sale is
// deterministic from the seed plus the humans' actions. Bots play themselves.

import {
  createRoomSale,
  applyBids,
  applyAnswer,
  applySteal,
  applyDecline,
  advance,
  povSnapshot,
  BID_MS,
  STEAL_MS,
  ANSWER_MS,
} from "./room-game.js";

const PHASE_MS = { bidding: BID_MS, answering: ANSWER_MS, stealing: STEAL_MS };

export class RoomHost {
  constructor(client, { onUpdate } = {}) {
    this.client = client; // the host's own RoomClient (seat h-1)
    this.onUpdate = onUpdate || null; // app hook: called after every broadcast
    this.sale = null;
    this.locked = new Map(); // seat -> amount (bidding phase)
    this.answered = new Set(); // seats already answered this lot (hammer)
    this.deadline = null;
    this.seq = 0;
    this.seed = null;
    this.timer = null;
  }

  get phase() {
    return this.sale ? this.sale.phase : null;
  }

  start() {
    const players = this.client.players; // host is players[0]
    this.seed = `${this.client.code}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const settings = this.client.settings;
    this.sale = createRoomSale(this.seed, {
      lotCount: settings.lotCount,
      difficulty: settings.difficulty,
      humans: players.map((p) => p.name),
      botCount: settings.botCount,
    });
    // Bind seats to client ids so every device knows its seat.
    this.sale.seats.forEach((seat, i) => {
      if (seat.kind === "human") seat.playerId = players[i].id;
    });
    this.client.beginSale({ seed: this.seed, settings, seats: this.sale.seats });
    this._enterPhase();
    this._broadcast();
  }

  handle(msg) {
    if (!this.sale) return;
    const player = this.client.players.find((p) => p.id === msg.from);
    if (!player) return;
    const seat = this.sale.seats.find((s) => s.playerId === player.id);
    if (!seat || seat.kind !== "human") return;
    try {
      switch (msg.t) {
        case "bid": this.noteBid(seat.id, msg.amount); break;
        case "answer": this.noteAnswer(seat.id, msg.index); break;
        case "steal": this.noteSteal(seat.id, msg.index); break;
        case "decline": this.noteDecline(seat.id); break;
        default: return;
      }
    } catch (error) {
      /* a late or illegal action is simply ignored, but never silently */
      console.error("[room] action ignored:", msg && msg.t, error);
    }
  }

  noteBid(seat, amount) {
    const sale = this.sale;
    if (!sale || sale.phase !== "bidding") return;
    if (this.locked.has(seat)) return;
    this.locked.set(seat, Math.max(0, Number(amount) || 0));
    const humans = sale.humans;
    if (humans.every((id) => this.locked.has(id))) {
      this._applyBids();
      return;
    }
    this._broadcast();
  }

  noteAnswer(seat, index) {
    const sale = this.sale;
    if (!sale || sale.phase !== "answering") return;
    applyAnswer(sale, seat, index);
    this._afterMutation();
  }

  noteSteal(seat, index) {
    const sale = this.sale;
    if (!sale || sale.phase !== "stealing") return;
    applySteal(sale, seat, index);
    this._afterMutation();
  }

  noteDecline(seat) {
    const sale = this.sale;
    if (!sale || sale.phase !== "stealing") return;
    applyDecline(sale, seat);
    this._afterMutation();
  }

  nextLot() {
    const sale = this.sale;
    if (!sale || sale.phase !== "resolved") return;
    advance(sale);
    this._enterPhase();
    this._broadcast();
  }

  /** The POV the host's own device renders. */
  hostSnapshot() {
    return povSnapshot(this.sale, "h-1", this.locked.keys());
  }

  /** Stripped public snapshot for every device in the room. */
  publicSnapshot() {
    // povSnapshot with a seat id no seat ever has: strips, renames nothing.
    return povSnapshot(this.sale, "noseat", this.locked.keys());
  }

  _applyBids() {
    const bids = {};
    for (const [seat, amount] of this.locked) bids[seat] = amount;
    for (const id of this.sale.humans) if (!(id in bids)) bids[id] = 0;
    applyBids(this.sale, bids);
    this._afterMutation();
  }

  _afterMutation() {
    if (this.sale.phase === "stealing" || this.sale.phase === "answering") {
      // still awaiting answers (hammer) or a steal; keep the clock running
      if (!this.deadline) this._enterPhaseClock();
    } else if (this.sale.phase === "resolved" || this.sale.phase === "finished") {
      this._stopClock();
    }
    this._broadcast();
  }

  _enterPhase() {
    this.locked = new Map();
    this._enterPhaseClock();
  }

  _enterPhaseClock() {
    this._stopClock();
    const ms = PHASE_MS[this.sale.phase];
    this.deadline = ms ? Date.now() + ms : null;
    if (this.deadline) this.timer = setInterval(() => this._tick(), 300);
  }

  _stopClock() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.deadline = null;
  }

  _tick() {
    if (!this.deadline || Date.now() < this.deadline) return;
    const sale = this.sale;
    this._stopClock();
    try {
      if (sale.phase === "bidding") {
        this._applyBids();
        return;
      }
      if (sale.phase === "answering") {
        for (const seat of [...(sale.current?.awaiting ?? [])]) {
          try { applyAnswer(sale, seat, null); } catch { /* skip */ }
        }
        this._afterMutation();
        return;
      }
      if (sale.phase === "stealing" && sale.stealFor) {
        applyDecline(sale, sale.stealFor);
        this._afterMutation();
        return;
      }
    } catch {
      /* a broken timer must never wedge the room; the next action or tick still applies */
      this._broadcast();
    }
  }

  _broadcast() {
    const pub = this.publicSnapshot();
    this.client.publishSnapshot({ seq: ++this.seq, deadline: this.deadline, duration: this.deadline ? PHASE_MS[this.sale.phase] || null : null, pub });
    if (this.onUpdate) this.onUpdate();
  }
}
