import { test, expect } from "@playwright/test";

const FIXED_DATE = "2026-11-14"; // Sale No. 1 in the dev build.

function trackProblems(page) {
  const problems = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

async function closeIntroIfOpen(page) {
  // The intro modal auto-opens ~320ms after "Take a paddle" on a fresh profile.
  // It is expected for a first-time player, so wait for it deterministically.
  const dialog = page.getByRole("dialog");
  try {
    await dialog.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    return; // seen before: no intro on this device
  }
  await page.keyboard.press("Escape");
  try {
    await dialog.waitFor({ state: "detached", timeout: 3000 });
    return;
  } catch {
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden({ timeout: 3000 });
  }
}

/**
 * Play one complete sale, passing on the first lot and bidding afterwards.
 * Handles the three ways a lot can end for the player: answering, stealing or waiting.
 */
async function playSale(page) {
  for (let lot = 0; lot < 7; lot += 1) {
    // Bidding phase (or we are already past it).
    const confirm = page.locator("[data-confirm]");
    await confirm.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});

    if (await confirm.isVisible().catch(() => false)) {
      const label = (await confirm.textContent()) || "";
      if (label.includes("Hammer")) {
        await page.locator('[data-pick="min"]').click();
      } else if (lot === 0) {
        await page.locator('[data-pick="pass"]').click();
      } else {
        await page.locator('[data-pick="quarter"]').click();
      }
      await confirm.click();
    }

    // Resolve whatever happens next: answer, steal, or watch the room.
    const nextButton = page.getByRole("button", { name: /Turn the page|Close the sale/ });
    const stealGo = page.locator("[data-steal-go]");
    const options = page.locator("[data-option]");
    const lock = page.locator("[data-lock]");

    for (let t = 0; t < 80; t += 1) {
      if (await page.getByRole("dialog").isVisible().catch(() => false)) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(120);
        continue;
      }
      if (await nextButton.isVisible().catch(() => false)) break;

      if (await stealGo.isVisible().catch(() => false)) {
        await stealGo.click();
        continue;
      }

      const firstOption = options.first();
      if (await firstOption.isVisible().catch(() => false)) {
        // During the steal the failed pick is disabled; pick the first enabled option.
        const enabled = page.locator("[data-option]:not([disabled])").first();
        await enabled.click();
        if (await lock.isVisible().catch(() => false)) {
          await lock.click();
        }
        continue;
      }

      // No decision pending: fast forward the sequence.
      await page.keyboard.press(" ");
      await page.waitForTimeout(120);
    }

    await expect(nextButton).toBeVisible({ timeout: 10000 });
    await nextButton.click();
    await page.waitForTimeout(100);
  }
}

async function expectResults(page) {
  await expect(page.getByRole("heading", { name: "The Sale Closes" })).toBeVisible({ timeout: 15000 });
}

for (const viewport of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
]) {
  test(`a complete sale can be played on ${viewport.name}`, async ({ page }) => {
    const problems = trackProblems(page);
    await page.setViewportSize(viewport);
    await page.goto(`/?date=${FIXED_DATE}`);

    await expect(page.getByRole("heading", { name: "Going Once" })).toBeVisible();
    // The intro may open on its own for a first-time player; dismiss it first.
    await closeIntroIfOpen(page);
    await page.getByRole("button", { name: "Take a paddle" }).click();
    await closeIntroIfOpen(page);

    await playSale(page);
    await expectResults(page);

    // Share text can be copied.
    await page.getByRole("button", { name: "Copy result" }).click();
    await expect(page.getByText("Copied to the clipboard")).toBeVisible({ timeout: 5000 });

    // Reloading keeps the finished sale: the app restores the results screen.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectResults(page);

    expect(problems, problems.join("\n")).toEqual([]);
  });
}

test("a complete sale can be played with reduced motion", async ({ page }) => {
  const problems = trackProblems(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/?date=${FIXED_DATE}`);

  await closeIntroIfOpen(page);
  await page.getByRole("button", { name: "Take a paddle" }).click();
  await closeIntroIfOpen(page);

  await playSale(page);
  await expectResults(page);

  expect(problems, problems.join("\n")).toEqual([]);
});
