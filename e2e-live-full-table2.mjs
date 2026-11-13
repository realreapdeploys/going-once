// Ten humans at one table, bid → answer → turn the page, using a single page that is
// allowed to run its own timers (headless Chromium throttles background pages, which
// stalls a lot only when the smoke itself is starved).
import { chromium } from "@playwright/test";
const BASE = process.env.SMOKE_BASE ?? "https://realreapdeploys.github.io/going-once/";
const RELAY = process.env.SMOKE_RELAY ?? "https://going-once-xelh.onrender.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const errors = [];
const browser = await chromium.launch({ args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });

const open = async (tag) => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${tag}] ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag} console] ${m.text()}`); });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await sleep(2300);
  for (let i = 0; i < 6; i++) {
    const c = page.locator(".modal__close").first();
    if (await c.isVisible().catch(() => false)) { await c.click({ force: true }).catch(() => {}); await sleep(180); continue; }
    break;
  }
  return page;
};

const wake = await fetch(`${RELAY}/healthz`).then((r) => r.json()).catch(() => null);
log("relay awake:", Boolean(wake?.ok));

const host = await open("host");
await host.click('[data-action="private-room"]');
await host.click("text=Host a room");
await host.fill('input[name="name"]', "Reyes");
await host.click('button:has-text("Open the room")');
await host.waitForSelector(".room__code", { timeout: 90000 });
const code = (await host.textContent(".room__code") || "").trim();
const sel = host.locator("select.room__select");
await sel.nth(0).selectOption("5"); await sleep(500);
await sel.nth(2).selectOption("2"); await sleep(700);
log("room", code, "| lots:", await sel.nth(0).inputValue(), "| bots:", await sel.nth(2).inputValue());

const everyone = [host];
for (let i = 2; i <= 10; i++) {
  const p = await open(`g${i}`);
  await p.click('[data-action="private-room"]');
  await p.click("text=Join with a code");
  await p.fill('input[name="name"]', `Guest${i}`);
  await p.fill('input[name="code"]', code);
  await p.click('button:has-text("Join the room")');
  const ok = await p.waitForSelector(".room__code", { timeout: 25000 }).then(() => true).catch(() => false);
  if (ok) everyone.push(p);
}
log(`${everyone.length} humans seated (+2 bots)`);
await host.click('button:has-text("Open the sale")');
for (const p of everyone) await p.waitForSelector("[data-lotplate]", { timeout: 40000 });
log("sale open on all", everyone.length, "browsers");

const state = (p) => p.evaluate(() => ({
  opts: document.querySelectorAll("[data-option]").length,
  lock: Boolean(document.querySelector("[data-lock]")),
  lockEnabled: document.querySelector("[data-lock]") ? !document.querySelector("[data-lock]").disabled : null,
  next: Boolean(document.querySelector("[data-next]")),
  steal: Boolean(document.querySelector("[data-steal-no]")),
  bid: Boolean(document.querySelector("[data-confirm]")),
  bidEnabled: document.querySelector("[data-confirm]") ? !document.querySelector("[data-confirm]").disabled : null,
  lot: Number(document.querySelector("[data-lotplate]")?.innerText.replace(/\s+/g, " ").match(/Lot\s*(\d+)/)?.[1] ?? 0),
  standings: Boolean(document.querySelector(".room__standings")),
  timer: document.querySelector(".dock__timer, [data-timer]")?.innerText ?? null,
})).catch(() => null);

let closed = 0;
for (let round = 1; round <= 5; round++) {
  for (const [idx, p] of everyone.entries()) {
    const st = await state(p);
    if (st?.bidEnabled) {
      await p.locator("[data-number]").first().fill(String(40 + idx * 5)).catch(() => {});
      await p.locator("[data-confirm]").first().click().catch(() => {});
    }
  }
  let done = false;
  for (let tick = 0; tick < 200 && !done; tick++) {
    for (const p of everyone) {
      const st = await state(p);
      if (!st) continue;
      if (st.standings) { done = true; break; }
      if (st.steal) { await p.locator("[data-steal-no]").first().click().catch(() => {}); await sleep(250); continue; }
      if (st.lock && st.lockEnabled) {
        const opt = p.locator('[data-option="0"]').first();
        if (await opt.isVisible().catch(() => false)) { await opt.click().catch(() => {}); await sleep(120); }
        await p.locator("[data-lock]").first().click().catch(() => {});
        await sleep(300);
        continue;
      }
      if (st.next) {
        const before = st.lot;
        await p.locator("[data-next]").first().click().catch(() => {});
        for (let w = 0; w < 50; w++) {
          const now = await state(host);
          if (now && (now.lot !== before || now.standings)) break;
          await sleep(200);
        }
        done = true;
        break;
      }
    }
    if (!done) await sleep(250);
  }
  const st = await state(host);
  log(`round ${round}: lot on host screen ${st?.lot} | standings ${st?.standings}`);
  if (!done) { log("STUCK at round", round, JSON.stringify(st)); break; }
  closed = round;
  if (st?.standings) break;
}

const standings = await host.locator(".room__standings").isVisible().catch(() => false);
const rows = await host.locator(".room__standings [data-standing], .room__standings li").count();
log(`standings on host: ${standings} | rows: ${rows}`);
if (standings) {
  const onAll = [];
  for (const p of everyone) onAll.push(await p.locator(".room__standings").isVisible().catch(() => false));
  log(`standings on ${onAll.filter(Boolean).length}/${everyone.length} screens`);
  const again = host.locator("text=/^(Play again|Re-deal the table)/").first();
  if (await again.isVisible().catch(() => false)) {
    await again.click();
    const fresh = await host.waitForSelector("[data-lotplate]", { timeout: 40000 }).then(() => true).catch(() => false);
    const guestFresh = await everyone[1].waitForSelector("[data-lotplate]", { timeout: 40000 }).then(() => true).catch(() => false);
    log("play again → fresh sale on host:", fresh, "| guest:", guestFresh);
  }
}
log("errors:", errors.length ? errors.slice(0, 5).join("\n") : "none");
log(errors.length ? "FULL TABLE: ERRORS" : "FULL TABLE PASS");
await browser.close();
process.exit(errors.length ? 1 : 0);
