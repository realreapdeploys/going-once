// Bot balance harness. Plays thousands of full room sales and reports what each seat ends on,
// so a change to the bot rules can be judged on numbers rather than on feel.
//
//   node tune-bots.mjs            every player style
//   node tune-bots.mjs bank       only the bank-bidding player
import { createRoomSale, applyBids, applyAnswer, applyDecline, advance, bidBoundsFor } from "./src/room-game.js";

const SIMS = Number(process.env.SIMS ?? 300);
const round5 = (n) => Math.floor(n / 5) * 5;
const bandP = (p, d) => (d === 1 ? p + (1 - p) * 0.55 : d === 3 ? p * 0.6 : p);

const PLAYERS = [
  { id: "casual", label: "casual player (50% right, bids 30% of the bank)", base: 0.5, bid: (bank) => round5(bank * 0.3) },
  { id: "typical", label: "typical player (62% right, bids 30% of the bank)", base: 0.62, bid: (bank) => round5(bank * 0.3) },
  { id: "strong", label: "strong player (75% right, bids 30% of the bank)", base: 0.75, bid: (bank) => round5(bank * 0.3) },
  { id: "flat", label: "typical player who bids a flat 200", base: 0.62, bid: () => 200 },
  { id: "shy", label: "typical player who bids 15% of the bank", base: 0.62, bid: (bank) => round5(bank * 0.15) },
];

function playOne(seed, player) {
  const sale = createRoomSale(seed, { lotCount: 7, difficulty: "mixed", humans: ["Human"], botCount: 3 });
  let guard = 0;
  while (sale.phase !== "finished" && guard++ < 100) {
    if (sale.phase === "bidding") {
      const bank = sale.banks["h-1"];
      const { max } = bidBoundsFor(sale, "h-1");
      applyBids(sale, { "h-1": Math.max(0, Math.min(player.bid(bank, max), max)) });
    } else if (sale.phase === "answering") {
      const lot = sale.lots[sale.lotIndex];
      while (sale.phase === "answering" && (sale.current?.awaiting ?? []).length) {
        const seat = sale.current.awaiting[0];
        const p = seat === "h-1" ? bandP(player.base, lot.difficulty) : 0;
        applyAnswer(sale, seat, Math.random() < p ? lot.answerIndex : Math.floor(Math.random() * 4));
      }
    } else if (sale.phase === "stealing") {
      try { applyDecline(sale, sale.stealFor); } catch { sale.stealFor = null; sale.phase = "resolved"; }
    } else if (sale.phase === "resolved") {
      advance(sale);
    }
  }
  return sale;
}

function report(player) {
  let wins = 0, chips = 0, bidWins = 0, lots = 0;
  const botWins = new Map();
  for (let i = 0; i < SIMS; i++) {
    const sale = playOne(`${player.id}|${i}|${Math.random()}`, player);
    const row = sale.final.find((r) => r.id === "h-1");
    chips += row.chips;
    if (row.rank === 1) wins++;
    for (const r of sale.final) if (r.id !== "h-1" && r.rank === 1) botWins.set(r.name, (botWins.get(r.name) ?? 0) + 1);
    for (const rec of sale.history) { lots++; if (rec.winnerId === "h-1") bidWins++; }
  }
  const bots = [...botWins.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\n${player.label}`);
  console.log(`  wins the sale ${(wins / SIMS * 100).toFixed(1)}% of the time, ends on ${Math.round(chips / SIMS)} chips`);
  console.log(`  wins the bid on ${(bidWins / lots * 100).toFixed(0)}% of lots`);
  console.log(`  bot wins: ${bots.map(([n, v]) => `${n} ${((v / SIMS) * 100).toFixed(0)}%`).join(" · ") || "none"}`);
}

const only = process.argv[2];
for (const player of PLAYERS) if (!only || player.id === only) report(player);
