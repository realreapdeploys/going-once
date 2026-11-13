import { chromium } from "@playwright/test";
const BASE = "https://realreapdeploys.github.io/going-once/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await sleep(2500);
for (let i = 0; i < 6; i++) {
  const c = page.locator(".modal__close").first();
  if (await c.isVisible().catch(() => false)) { await c.click({ force: true }).catch(() => {}); await sleep(200); continue; }
  break;
}
await page.click("text=Take a paddle");
await page.waitForSelector("[data-lotplate]", { timeout: 30000 });
console.log("· daily sale opened");
let lots = 0;
for (let lot = 1; lot <= 7; lot++) {
  const plate = await page.locator("[data-lotplate]").textContent().catch(() => "");
  // bid low, answer, decline steal, turn the page
  const num = page.locator("[data-number]").first();
  if (await num.isVisible().catch(() => false)) { await num.fill("1"); await page.locator("[data-confirm]").first().click().catch(() => {}); }
  await sleep(700);
  for (let i = 0; i < 40; i++) {
    const opt = page.locator('[data-option="0"]').first();
    if (await opt.isVisible().catch(() => false)) { await opt.click().catch(() => {}); await sleep(200); }
    const lock = page.locator("[data-lock]").first();
    if (await lock.isVisible().catch(() => false) && await lock.isEnabled().catch(() => false)) { await lock.click().catch(() => {}); await sleep(500); }
    const no = page.locator("[data-steal-no]").first();
    if (await no.isVisible().catch(() => false)) { await no.click().catch(() => {}); await sleep(400); continue; }
    const next = page.locator("[data-next]").first();
    if (await next.isVisible().catch(() => false) && await next.isEnabled().catch(() => false)) { await next.click().catch(() => {}); lots++; break; }
    if (await page.locator(".verdict--final, [data-results]").first().isVisible().catch(() => false)) break;
    await sleep(300);
  }
  await sleep(900);
  console.log(`· lot ${lot} done (plate: ${String(plate).trim().slice(0, 24)})`);
  if (await page.locator(".cover, [data-screen='results'], .results").first().isVisible().catch(() => false)) break;
}
const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 200));
console.log("· final screen:", body);
console.log("errors:", errors.length ? errors.join("\n") : "none");
console.log(errors.length ? "DAILY: ERRORS" : "DAILY PASS");
await browser.close();
