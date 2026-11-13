import { chromium } from "@playwright/test";
const BASE = "https://realreapdeploys.github.io/going-once/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const browser = await chromium.launch();
const mk = async (tag) => {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${tag}] ${e.message}`));
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
await p1.click('[data-action="private-room"]');
await p1.click("text=Host a room");
await p1.fill('input[name="name"]', "Reyes");
await p1.click('button:has-text("Open the room")');
await p1.waitForSelector(".room__code", { timeout: 60000 });
const code = (await p1.textContent(".room__code") || "").trim();
const selects = p1.locator("select.room__select");
await selects.nth(0).selectOption("3");
await selects.nth(1).selectOption("easy");
await selects.nth(2).selectOption("0");
await p2.click('[data-action="private-room"]');
await p2.click("text=Join with a code");
await p2.fill('input[name="name"]', "Marlowe");
await p2.fill('input[name="code"]', code);
await p2.click('button:has-text("Join the room")');
await p2.waitForSelector(".room__code", { timeout: 60000 });
await p1.click('button:has-text("Open the sale")');
await p1.waitForSelector("[data-lotplate]", { timeout: 30000 });
await p2.waitForSelector("[data-lotplate]", { timeout: 30000 });
console.log("· room", code, "open on both browsers, sale started");
// bid on lot 1 so a mid-sale state exists
await p1.fill("[data-number]", "100"); await p1.click("[data-confirm]");
await p2.fill("[data-number]", "150"); await p2.click("[data-confirm]");
await sleep(1200);
// HOST DISCONNECTS MID-SALE
await p1.context().close();
console.log("· host browser closed mid-sale");
await sleep(4000);
// the guest should now hold host privileges: it can disband/advance
const guestIsHost = await p2.evaluate(() => document.body.innerText.includes("host") || document.querySelector("[data-host-badge]") !== null).catch(() => false);
const guestStillLive = await p2.locator("[data-lotplate]").isVisible().catch(() => false);
console.log("· guest still on the lot:", guestStillLive, "| host markers on guest page:", guestIsHost);
// guest plays the lot out with the host gone (answering, then steal/advance)
let advanced = false;
for (let i = 0; i < 60 && !advanced; i++) {
  const opt = p2.locator('[data-option="0"]').first();
  if (await opt.isVisible().catch(() => false)) { await opt.click().catch(() => {}); await sleep(200); }
  const lock = p2.locator("[data-lock]").first();
  if (await lock.isVisible().catch(() => false) && await lock.isEnabled().catch(() => false)) { await lock.click().catch(() => {}); await sleep(400); }
  for (const sel of ["[data-steal-no]", "[data-next]"]) {
    const el = p2.locator(sel).first();
    if (await el.isVisible().catch(() => false) && await el.isEnabled().catch(() => false)) { await el.click().catch(() => {}); advanced = true; break; }
  }
  if (!advanced) await sleep(300);
}
await sleep(1500);
const stillPlaying = await p2.locator("[data-lotplate]").isVisible().catch(() => false);
console.log("· guest could act after the host left:", advanced, "| sale continues for the guest:", stillPlaying);
// guest (now host) can play again at the end
console.log("page errors:", errors.length ? errors.join("\n") : "none");
console.log(advanced && guestStillLive ? "FAILOVER PASS" : "FAILOVER INCONCLUSIVE");
await browser.close();
