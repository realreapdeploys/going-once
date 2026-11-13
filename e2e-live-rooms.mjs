import { chromium } from "@playwright/test";
const BASE = "https://realreapdeploys.github.io/going-once/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const browser = await chromium.launch();
const mk = async (tag) => {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${tag}] ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag} console] ${m.text()}`); });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await sleep(2500);
  for (let i = 0; i < 8; i++) {
    const close = page.locator(".modal__close").first();
    if (await close.isVisible().catch(() => false)) { await close.click({ force: true }).catch(() => {}); await sleep(250); continue; }
    break;
  }
  return page;
};
const p1 = await mk("host");
const p2 = await mk("guest");
await p1.click('[data-action="private-room"]', { timeout: 30000 });
await p1.click("text=Host a room");
await p1.fill('input[name="name"]', "Reyes");
await p1.click('button:has-text("Open the room")');
await p1.waitForSelector(".room__code", { timeout: 60000 });
const code = (await p1.textContent(".room__code") || "").trim();
console.log("· room code:", code, `(${code.length} chars)`);
const selects = p1.locator("select.room__select");
await selects.nth(0).selectOption("3");
await selects.nth(1).selectOption("easy");
await selects.nth(2).selectOption("0");
await p2.click('[data-action="private-room"]', { timeout: 30000 });
await p2.click("text=Join with a code");
await p2.fill('input[name="name"]', "Marlowe");
await p2.fill('input[name="code"]', code);
await p2.click('button:has-text("Join the room")');
await p2.waitForSelector(".room__code", { timeout: 60000 });
console.log("· both browsers seated in the room");
await p1.click('button:has-text("Open the sale")');
await p1.waitForSelector("[data-lotplate]", { timeout: 30000 });
await p2.waitForSelector("[data-lotplate]", { timeout: 30000 });
console.log("· sale opened on both browsers (live site, relay rooms)");
for (const n of [1, 2, 3]) {
  await p1.fill("[data-number]", "100"); await p1.click("[data-confirm]");
  await p2.fill("[data-number]", "150"); await p2.click("[data-confirm]");
  await sleep(800);
  for (const page of [p1, p2]) {
    const opt = page.locator('[data-option="0"]').first();
    if (await opt.isVisible().catch(() => false)) { await opt.click(); await sleep(200); const lock = page.locator("[data-lock]").first(); if (await lock.isVisible().catch(() => false)) await lock.click(); }
  }
  let turned = false;
  for (let i = 0; i < 60 && !turned; i++) {
    for (const page of [p1, p2]) {
      const no = page.locator("[data-steal-no]").first();
      if (await no.isVisible().catch(() => false)) { await no.click().catch(() => {}); await sleep(400); }
      const next = page.locator("[data-next]").first();
      if (await next.isVisible().catch(() => false) && await next.isEnabled().catch(() => false)) { await next.click().catch(() => {}); turned = true; break; }
    }
    if (!turned) await sleep(300);
  }
  console.log(`· lot ${n}: bids, answers${turned ? ", page turned" : " — STUCK"}`);
  if (!turned) break;
}
await p1.waitForSelector(".room__standings", { timeout: 30000 });
const rows = await p1.locator(".room__standings [data-standing], .room__standings li, .room__standings tr").count();
console.log("· standings shown to both players; rows:", rows);
const playAgain = p1.locator("text=/^(Play again|Re-deal the table)/").first();
console.log("· play again button present for host:", await playAgain.isVisible().catch(() => false));
if (await playAgain.isVisible().catch(() => false)) {
  await playAgain.click();
  await p1.waitForSelector("[data-lotplate]", { timeout: 30000 });
  await p2.waitForSelector("[data-lotplate]", { timeout: 30000 });
  console.log("· re-deal: fresh sale on both browsers");
}
console.log("page errors:", errors.length ? errors.join("\n") : "none");
console.log(errors.length ? "LIVE ROOMS: ERRORS" : "LIVE ROOMS PASS (live site ↔ Render relay)");
await browser.close();
process.exit(errors.length ? 1 : 0);
