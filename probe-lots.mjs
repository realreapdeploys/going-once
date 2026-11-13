import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:5512/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
const logs = [];
page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
page.on("requestfailed", (r) => logs.push(`reqfail: ${r.url()} ${r.failure()?.errorText}`));
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await sleep(2500);
for (let i = 0; i < 6; i++) {
  const c = page.locator(".modal__close").first();
  if (await c.isVisible().catch(() => false)) { await c.click({ force: true }).catch(() => {}); await sleep(200); continue; }
  break;
}
await page.click('[data-action="private-room"]');
await page.click("text=Host a room");
await page.fill('input[name="name"]', "Reyes");
await page.click('button:has-text("Open the room")');
await page.waitForSelector(".room__code", { timeout: 60000 });
const sel = page.locator("select.room__select").nth(0);
console.log("value before:", await sel.inputValue());
console.log("is <select>?", await sel.evaluate((e) => e.tagName + " / " + e.className));
await page.evaluate(() => {
  const s = document.querySelectorAll("select.room__select")[0];
  window.__settingsCalls = [];
  s.addEventListener("change", (e) => window.__settingsCalls.push(e.target.value), true);
});
await sel.selectOption("20");
await sleep(500);
console.log("change events seen:", await page.evaluate(() => window.__settingsCalls));
console.log("options:", await sel.evaluate((e) => [...e.options].map((o) => o.value).join(",")));
console.log("selectedIndex:", await sel.evaluate((e) => e.selectedIndex));
for (const ms of [300, 1000, 2500, 5000]) {
  await sleep(ms);
  console.log(`after +${ms}ms value:`, await sel.inputValue());
}
console.log("lobby line:", await page.evaluate(() => document.querySelector(".room__table-line")?.textContent ?? "missing"));
console.log("console:", logs.filter((l) => !l.startsWith("debug")).slice(-8).join("\n") || "quiet");
await browser.close();
