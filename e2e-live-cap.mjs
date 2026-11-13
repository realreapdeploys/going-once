import { chromium } from "@playwright/test";
const BASE = "https://realreapdeploys.github.io/going-once/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const open = async (name) => {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await sleep(2200);
  for (let i = 0; i < 6; i++) {
    const close = page.locator(".modal__close").first();
    if (await close.isVisible().catch(() => false)) { await close.click({ force: true }).catch(() => {}); await sleep(200); continue; }
    break;
  }
  return page;
};
const host = await open("host");
await host.click('[data-action="private-room"]');
await host.click("text=Host a room");
await host.fill('input[name="name"]', "Reyes");
await host.click('button:has-text("Open the room")');
await host.waitForSelector(".room__code", { timeout: 60000 });
const code = (await host.textContent(".room__code") || "").trim();
const lotSel = host.locator("select.room__select").nth(0);
const lotValues = await lotSel.locator("option").evaluateAll((els) => els.map((e) => e.value));
const botSel = host.locator("select.room__select").nth(2);
const botValues = await botSel.locator("option").evaluateAll((els) => els.map((e) => e.value));
console.log("· room", code, "| lot options:", lotValues.join(","), "| bot options:", botValues.join(","));
await lotSel.selectOption("20");
await sleep(1500);
const lotAfter = await lotSel.inputValue();
console.log("· 20-question sale selected in the UI:", lotAfter === "20");
const capCopy = await host.evaluate(() => document.body.innerText.match(/At the table:[^\n]*/i)?.[0] ?? "not found");
console.log("· seat copy:", capCopy);
const pages = [];
for (let i = 2; i <= 11; i++) {
  const p = await open(`guest${i}`);
  await p.click('[data-action="private-room"]');
  await p.click("text=Join with a code");
  await p.fill('input[name="name"]', `Guest${i}`);
  await p.fill('input[name="code"]', code);
  await p.click('button:has-text("Join the room")');
  const joined = await p.waitForSelector(".room__code", { timeout: 20000 }).then(() => true).catch(() => false);
  console.log(`· seat ${i}: ${joined ? "joined" : "refused"}`);
  pages.push({ p, joined });
}
const seated = pages.filter((x) => x.joined).length + 1;
const refusedCount = pages.filter((x) => !x.joined).length;
const expectedRefusals = pages.length - (10 - 1);
console.log("· total seated:", seated, "(host + guests)");
console.log("· refused:", refusedCount, "| expected refusals:", expectedRefusals);
console.log(seated === 10 && refusedCount === expectedRefusals ? "SEAT CAP PASS" : "SEAT CAP CHECK FAILED");
await browser.close();
