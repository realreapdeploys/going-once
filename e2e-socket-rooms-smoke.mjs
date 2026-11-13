/* Going Once — live smoke: two browsers, one house-relay room, full sale.
 * Run with the local preview on 5512 and the room server on 3001. */
import { chromium } from "@playwright/test";

const BASE = "http://127.0.0.1:5512";
const log = (...a) => console.log("·", ...a);
const fail = (msg) => { console.error("SMOKE FAIL:", msg); if (errors.length) console.error("PAGE ERRORS:\n" + errors.join("\n")); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const closeIntros = async (page) => {
  for (let i = 0; i < 8; i++) {
    const closeBtn = page.locator(".modal__close").first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
      await sleep(200);
      continue;
    }
    const overlay = page.locator(".overlay").first();
    if (await overlay.isVisible().catch(() => false)) {
      await overlay.click({ position: { x: 10, y: 10 } }).catch(() => {});
      await sleep(200);
      continue;
    }
    return;
  }
};

const browser = await chromium.launch();
const errors = [];
const watch = (page, tag) => {
  page.on("pageerror", (err) => errors.push(`[${tag} pageerror] ${err.message}`));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(`[${tag} console] ${msg.text()}`); });
};

const ctx1 = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const ctx2 = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const page1 = await ctx1.newPage();
const page2 = await ctx2.newPage();
watch(page1, "host");
watch(page2, "guest");

// --- cover → private room → host
await page1.goto(BASE, { waitUntil: "networkidle" });
await sleep(1100); // the cover auto-opens the intro ~700ms after boot on new profiles
await closeIntros(page1);
await closeIntros(page1);
await page1.click('[data-action="private-room"]');
await page1.click("text=Host a room");
await page1.fill('input[name="name"]', "Reyes");
await page1.click('button:has-text("Open the room")');
await page1.waitForSelector(".room__code", { timeout: 15000 });
const code = (await page1.textContent(".room__code") || "").trim();
log("room code:", code);
if (!/^[A-Z0-9]{5}$/.test(code)) fail(`bad room code "${code}"`);

// host sets 3 lots, easy, no bots
const selects = page1.locator("select.room__select");
await selects.nth(0).selectOption("3");
await selects.nth(1).selectOption("easy");
await selects.nth(2).selectOption("0");
log("settings: 3 questions, easy, players only");

// --- guest joins
await page2.goto(BASE, { waitUntil: "networkidle" });
await sleep(1100);
await closeIntros(page2);
await closeIntros(page2);
await page2.click('[data-action="private-room"]');
await page2.click("text=Join with a code");
await page2.fill('input[name="name"]', "Marlowe");
await page2.fill('input[name="code"]', code);
await page2.click('button:has-text("Join the room")');
await page2.waitForSelector(".room__code", { timeout: 15000 });
await sleep(400);
const playerCount = await page1.locator(".room__players .room__player-name").count();
log("players at the table (host view):", playerCount);
if (playerCount !== 2) fail(`host sees ${playerCount} players, expected 2`);

// --- open the sale
await page1.click('button:has-text("Open the sale")');
await page1.waitForSelector("[data-lotplate]", { timeout: 15000 });
await page2.waitForSelector("[data-lotplate]", { timeout: 15000 });
log("sale open on both browsers");

const answerRound = async (round) => {
  // bids: host 100, guest 150 — guest wins each regular lot
  await page1.fill("[data-number]", "100");
  await page1.click('[data-confirm]');
  await page2.fill("[data-number]", "150");
  await page2.click('[data-confirm]');
  log(`lot ${round}: bids placed (100 / 150)`);
  await sleep(600);
  // whoever is awaiting answers clicks option 0; then confirm
  for (const [tag, page] of [["host", page1], ["guest", page2]]) {
    const option = page.locator('[data-option="0"]').first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
      await sleep(150);
      const lock = page.locator('[data-lock]').first();
      if (await lock.isVisible().catch(() => false)) await lock.click();
      log(`lot ${round}: ${tag} answered`);
    }
  }
  await sleep(600);
  await page1.screenshot({ path: `/tmp/lot${round}-host.png`, fullPage: true }).catch(() => {});
  await page2.screenshot({ path: `/tmp/lot${round}-guest.png`, fullPage: true }).catch(() => {});
  const diag = await page1.evaluate(() => ({
    next: Boolean(document.querySelector("[data-next]")),
    stealNo: Boolean(document.querySelector("[data-steal-no]")),
    stealGo: Boolean(document.querySelector("[data-steal-go]")),
    optionsInDom: document.querySelectorAll("[data-option]").length,
    qpanel: document.querySelector("[data-question]")?.textContent?.trim().slice(0, 90) ?? null,
    overlay: document.querySelector(".overlay") ? "open" : "none",
    dockLocked: Boolean(document.querySelector(".dock__locked")),
  }));
  console.log("resolution diag (host page):", JSON.stringify(diag));
  // steal or resolution: drain \_ steals / page turns across both pages
  for (let i = 0; i < 40; i++) {
    const stealNo = page1.locator("[data-steal-no]");
    const guestStealNo = page2.locator("[data-steal-no]");
    if (await stealNo.isVisible().catch(() => false)) { await stealNo.click(); log(`lot ${round}: host declined steal`); await sleep(400); continue; }
    if (await guestStealNo.isVisible().catch(() => false)) { await guestStealNo.click(); log(`lot ${round}: guest declined steal`); await sleep(400); continue; }
    const nextBtn = page1.locator("[data-next]");
    if (await nextBtn.isVisible().catch(() => false) && await nextBtn.isEnabled().catch(() => false)) { await nextBtn.click(); log(`lot ${round}: page turned`); return; }
    const standings = page1.locator(".room__standings");
    if (await standings.isVisible().catch(() => false)) return; // final lot done
    await sleep(400);
  }
  fail(`lot ${round}: stuck in resolution`);
};

await answerRound(1);
await answerRound(2);
await answerRound(3); // hammer — both humans answer

// --- standings on both sides
await page1.waitForSelector(".room__standings", { timeout: 20000 });
await page2.waitForSelector(".room__standings", { timeout: 20000 });
const rows1 = await page1.locator(".room__standings li").count();
const rows2 = await page2.locator(".room__standings li").count();
log("standings rows:", rows1, "/", rows2);
if (rows1 !== 2 || rows2 !== 2) fail("standings incomplete");

// --- host re-deals; both tables return to lot 0
const reDeal = page1.locator("button:has-text('Re-deal the table')");
await reDeal.waitFor({ state: "visible", timeout: 10000 });
await reDeal.click();
await page1.waitForSelector("[data-lotplate]", { timeout: 15000 });
await page2.waitForSelector("[data-lotplate]", { timeout: 15000 });
log("re-deal worked — fresh sale on both browsers");

await page1.screenshot({ path: "/tmp/room-host-final.png" });
await page2.screenshot({ path: "/tmp/room-guest-final.png" });
await browser.close();

if (errors.length) {
  console.error("PAGE ERRORS:\n" + errors.join("\n"));
  process.exit(2);
}
console.log("LIVE ROOM SMOKE PASS");
process.exit(0);
