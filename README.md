# Going Once

**The daily auction of general knowledge.** A once-a-day trivia game for one player against three
bot rivals, styled as a slightly shady old-world auction house printed as a paper catalogue.
Everyone gets the same sale each day: same lots, same rivals, same seeds.

You start with 1,000 chips. Seven lots a day. For each lot you see only the category and the
difficulty, never the question. Bid in secret, read your rivals' tells, and if you win the lot you
have to answer for it. Lot seven is **The Hammer**, a final all-play wager. Your final chip total is
your score.

Fully static: no accounts, no server, no tracking. Progress lives in your browser's local storage.

## Running it

Requires Node 20.19 or newer.

```bash
npm install
npm run dev        # dev server on http://localhost:5173
```

Other scripts:

```bash
npm test                 # node --test: engine, progress, store, timing, bidmath, format, questions
npm run validate:questions   # question bank sanity check, exits non-zero on failure
npm run build            # production build into dist/
npm run preview          # serve the production build
npm run e2e              # Playwright smoke test (needs a one-off `npx playwright install chromium`)
```

## How the daily seed works

The date string (`YYYY-MM-DD`, the player's local date) seeds everything. Sale No. 1 is
**2026-11-14**; each local midnight a new sale opens. `buildDay(date)` derives the sale number,
the seven lots (category, difficulty, question, option order) and the three rivals from that seed,
so every player worldwide gets an identical day. Rival behaviour (who bids what, who bluffs, who
knows the answer) is fixed per day and per seed, which is why bids are comparable and share text
spoilers nothing.

**Dev override:** in `npm run dev` only, `?date=YYYY-MM-DD` pins the day and uses a separate
storage key (`goingonce:dev`), with a small banner on screen. Ignored in production builds.

## The game in one paragraph

Bid 0 (pass) to half your purse (rounded down to a multiple of 5) on lots 1-6. Highest bid of at
least 5 wins; ties break by a seeded order. The winner answers. Right gains the bid, wrong loses
it — and if a rival winner answers wrongly and you were runner-up, you may **steal** the lot: the
question with the winner's pick already struck out. A right steal pays your own bid plus half the
failed bid; a wrong steal costs your own bid. The Hammer (lot 7) waives the house limit: everyone
wagers at least a quarter of their purse and everyone answers. Twenty seconds per answer; timeout
is wrong; banks never go below zero; all bids are multiples of 5.

## Adding questions

Questions live in `src/questions.js`. Each one:

```js
{ id: "sci-2-1", category: "Science", difficulty: 2,
  question: "What is the chemical symbol for gold?",
  options: ["Au", "Ag", "Gd", "Go"], answerIndex: 0 }
```

- `id`: unique, convention `<cat>-<difficulty>-<n>`; never reuse an id.
- `category`: one of the nine in `CATEGORIES` (Geography, History, Science, Sport, Film & TV, Music, Technology, Arts & Literature, Video Games & Streaming).
- `difficulty`: `1` Common, `2` Uncommon, `3` Rare. Every category x difficulty cell must keep at
  least 4 questions.
- `question`: 140 characters or fewer, no duplicate text across the bank.
- `options`: exactly 4, all non-empty, all distinct. `answerIndex`: 0-3.

Verify with `npm run validate:questions` (also covered by `tests/questions.test.js`).

## Adding a rival

Rivals live in `src/roster.js`. A rival entry needs an id, name, title, tagline, per-category
skill levels (used by `answerProbability` and `describeSkills`), boldness, a bluff tendency and an
SVG portrait. The day's engine picks three of the roster by seed. Nothing else needs wiring up;
the UI reads everything from the engine state and the roster, and the ledger row is generated from
the same skills object.

## Private rooms

The cover has a "Private room" button. One player hosts: they get a five-character room code,
pick the number of questions in the sale (3, 5, 7 or 10), the difficulty (a bit of everything /
common / uncommon / rare) and **how many bots fill the empty seats (0–3)**, and can remove players
or disband the room while it is still in the lobby. Anyone with the code and the link can join,
whatever their network — school and office wifi included: the room rides a public MQTT relay over
WebSocket (broker.emqx.io with test.mosquitto.org as a fallback), so no unusual ports and no
accounts are involved.

How it actually works, honestly: it is a genuinely shared sale, not separate parallel ones. The
host's browser runs the auctioneer — the deterministic engine with the room seed — and every
device at the table renders the same lots, bids and verdicts in real time. Guests send their
paddles over the relay; the host clamps, validates, resolves and broadcasts. Nobody can skip
ahead: answering order, the Hammer lot and the page turns belong to the room, and the host alone
advances between lots. Bots play their own deterministic rolls inside the host's engine, so they
never double-act or desync. Unbid lots pass automatically after the 45-second clock, unanswered
lots are marked wrong after 20, and a steal is declined if the runner-up falls silent for 12 — a
couch of phones will not stall the table. A bot winner resolves instantly on the host; at the
Hammer everyone who wagered answers.

Answers, bot rolls and other players' in-flight bids never leave the host's device: snapshots
are stripped to what the room may see (bids stay sealed until the lot closes, `answerIndex` for
the current lot is withheld until it resolves).

There is no shared game server, no anti-cheat beyond the host's honesty, and a host who closes
their tab ends the sale for everyone (guests simply fall back to the cover). Fine for a laugh
with friends; not for money on the line. Rooms are ephemeral and nothing about them is stored.

For anything real, run your own relay (a few lines of config on any machine with a TLS WebSocket
frontend) or swap `src/room.js` for a WebSocket server of your own. The public brokers are free
for everyone and rate-limited; do not hammer them.

## Persistence

One localStorage key: `goingonce:v1`, value `{ profile, saves: { "YYYY-MM-DD": { engineVersion,
actions, timer } } }`. Games are stored as **action lists** and restored with `replay(date,
actions)`, so a tampered save can at worst be rejected — never trusted. Only the last 14 days of
saves are kept. Any access failure (storage unavailable, full, corrupt) falls back to in-memory
for the session and shows one quiet line on the cover: *"The house cannot save your progress on
this device."* The game remains fully playable. Reloading mid-answer restores the timer from
`startedAt` and never grants extra time or a second attempt; reloading after the final lot restores
the results screen.

## Testing

`npm test` runs node:test suites for the engine, progress/reputation logic, the store (including
corrupt and throwing storage, pruning and replay rejection), timing, bid math and formatting.
`npm run e2e` plays a complete sale end-to-end in Chromium (passing once, bidding, answering,
stealing when offered, the Hammer) at 390x844 and 1280x800, plus a `prefers-reduced-motion` pass.
It fails on any console error or uncaught exception. The e2e pins the day with the dev-only
`?date=` parameter; Playwright's fake clock is deliberately not used because it freezes the app's
timers.

## Deployment

The build is fully static (`dist/`), with a relative base (`base: "./"` in `vite.config.js`), so it
can be served from any path on any static host (GitHub Pages, Netlify, S3, nginx...). Deploy with:
`npm run build` and publish `dist/`. This repository is set up for GitHub Pages via a GitHub
Actions workflow (`.github/workflows/deploy.yml`): every push to `main` rebuilds and redeploys.

## Room relay (Socket.io) — optional

Private rooms can also run on a small Socket.io service in `server/`: the service is the
authoritative host for the shared sale (it owns the engine), supports up to 10 seats
(humans + bots combined), 3/5/7/10/12/15/20-lot sales, mid-sale host failover to the
next connected human, reconnect tokens kept in `sessionStorage`, and a "Re-deal the table"
button on the final standings for the room's host. Public relays never see answers: the
server sends each client a single-player POV snapshot.

Deploy (Render, free plan, no card required):
1. Connect this repository as a Web Service, Root Directory `server`.
2. Language Node; Build Command `npm install`; Start Command `node server.js`.
3. Free plan is fine (the service idles only after 15 minutes without traffic; matches
   keep it awake). Cold starts are 30-60s on the first connection after a nap.
4. Point the site at the relay by building with `VITE_ROOM_URL=wss://<your-service>.onrender.com`.
   Without that variable (e.g. on the public Pages build) the game keeps the zero-config
   MQTT rooms, so this service is strictly optional.

Local run: `node server/server.js` (default port 3001, `PORT` to override), then build and
preview with `VITE_ROOM_URL=ws://127.0.0.1:3001 npm run build && npm run preview`.
`server/test-integration.mjs` exercises the relay end-to-end (seat cap, host failover,
reconnect, resolution).

## Decisions (where the brief was silent)

- **First-visit intro:** for a brand-new profile, the How to play modal opens automatically about
  0.7s after the cover appears, and once after "Take a paddle" is pressed. `seenIntro` is stored in
  the profile so it never shows again.
- **Boot after a finished day:** on load, a day whose game is finished goes straight to the results
  screen (the sale is restored from the action list). The cover's "See today's result" button exists
  for the rare case where the engine save was discarded but the profile still records the day.
- **`?date` and storage:** the dev date parameter uses a separate key (`goingonce:dev`) and is
  ignored in production. Production never reads it; all production saves live under `goingonce:v1`.
- **Skip behaviour:** any click, tap, Space or Enter fast-forwards a reveal sequence; the final
  frame is always rendered from the engine state, never from animation leftovers.
- **Timer:** driven by `requestAnimationFrame` reading `Date.now()` and clamped by `remainingMs`,
  so background tabs and clock changes cannot break it.
- **Layout of the bid dock:** the paddle control sits in a `.dock` section under the lot grid rather
  than inside it, pinned near the bottom of the viewport on phones with safe-area padding.
- **Clipboard:** `navigator.clipboard` with a textarea + `execCommand("copy")` fallback; if both
  fail, the share text is shown in a selectable box.
- **Dark mode:** `prefers-color-scheme` only, no toggle. Palette swaps via custom properties.

## Engine changes

None to game rules, numbers or formulas. Reported issues fixed during the build (all outside the
engine, listed for honesty):

- `src/store.js` crashed (`Cannot set properties of null`) when storage was unavailable, instead of
  falling back to memory — fixed by keeping `lastProblem` outside the memory snapshot.
- The dev-date override never actually switched to the `goingonce:dev` storage key — fixed via
  `createStore(storage, key)`.
- The bid control was constructed but never mounted — fixed.
- The resolved lot had no "Turn the page" / "Close the sale" button — fixed.
- `src/bidmath.js` truncated numeric strings like `"1e9"` before exponentiation — it now accepts
  valid JS numbers in strings first, then strips stray characters.

## Known limitations

- Multiplayer is casual: no accounts, no anti-cheat, no sale history. The hosted room relay
  is server-authoritative (see "Room relay" below), but the public build still defaults to
  the MQTT room race; whichever transport the live site uses is shown at room creation.
- The room race gives everyone the same lots but not a shared table (MQTT path): you never
  see each other's bids or answers live. The shared table exists on the relay path.
- 
- The bank is ~1,280 questions across 9 categories x 3 difficulties (built-in classics, the extra bank and the modern pack), and it was written by a machine.
  Most facts are high-confidence but the bank has not had a full human fact-check — treat it as a
  good draft, not gospel, and verify anything you hear quoted in a pub argument.
- No accounts, leaderboards or sync: progress is per device, per browser.
- Share text is copied to the clipboard or shown selectable; there is no share sheet integration.
