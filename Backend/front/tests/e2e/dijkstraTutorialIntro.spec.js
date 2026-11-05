// E2E tests for the Dijkstra tutorial intro page (an info step with a Next
// button) and the walk-through panel layout. The full tutorial run lives in
// dijkstraTutorial.spec.js.
import { test, expect } from "@playwright/test";
import { tutorialSteps } from "../../src/js/dijkstraTutorialSteps.js";
import {
  hook,
  stepIndex,
  openRoom,
  startTutorial,
  startRegularLevel1,
  findChestPoint,
  findEdgePoint,
  waitUntilClickable,
  driveTutorialStep,
} from "./support/dijkstraPage.js";

const panel = (page) => page.locator(".tutorial-instructions-modal");
const nextBtn = (page) => panel(page).locator(".tuto-next-btn");
const settle = (page) => page.waitForTimeout(1_000);

test.describe("Dijkstra tutorial intro page", () => {
  let errors;

  test.beforeEach(async ({ page }) => {
    ({ errors } = await openRoom(page));
  });

  test.afterEach(() => {
    expect(errors, "uncaught page errors").toEqual([]);
  });

  test("the tutorial starts on the intro page with a Next button", async ({ page }) => {
    expect(tutorialSteps[0].type).toBe("info");
    await startTutorial(page);
    expect(await stepIndex(page)).toBe(0);
    await expect(panel(page)).toBeVisible();
    await expect(nextBtn(page)).toBeVisible();
    await expect(panel(page).locator(".tuto-instruction-text")).toHaveText(
      "Read the notes below, then press Next."
    );
    const explanation = panel(page).locator(".tuto-explanation-text");
    await expect(explanation).toContainText("Rearrange chests");
    await expect(explanation).toContainText("Click for help");
    await expect(explanation).toContainText("infinity");
  });

  test("clicking a chest on the intro page does nothing but show a hint", async ({ page }) => {
    await startTutorial(page);
    const healthBefore = await hook(page, "health");
    await waitUntilClickable(page);
    const p = await findChestPoint(page, 0);
    expect(p, "chest 0 should be clickable on screen").not.toBeNull();
    await page.mouse.click(p.x, p.y);
    await settle(page);

    expect(await hook(page, "isChestOpened", 0)).toBe(false);
    expect(await stepIndex(page)).toBe(0);
    expect(await hook(page, "health")).toBe(healthBefore);
    await expect(page.locator(".Hint-Text")).toBeVisible();
    await expect(page.locator(".Hint-Text")).toContainText(tutorialSteps[0].errorMessage);
    await expect(nextBtn(page)).toBeVisible();
  });

  test("clicking an edge on the intro page does not open the input dialog", async ({ page }) => {
    await startTutorial(page);
    await waitUntilClickable(page);
    const p = await findEdgePoint(page, 0, 2);
    expect(p, "edge (0, 2) should be clickable on screen").not.toBeNull();
    await page.mouse.click(p.x, p.y);
    await settle(page);

    await expect(page.locator("#input-dialog")).toBeHidden();
    expect(await hook(page, "isModalOpen")).toBe(false);
    expect(await stepIndex(page)).toBe(0);
  });

  test("Next moves to Step 0, hides itself and opens no chest", async ({ page }) => {
    await startTutorial(page);
    await nextBtn(page).click();
    await expect.poll(() => stepIndex(page)).toBe(1);
    await expect(nextBtn(page)).toBeHidden();
    await expect(panel(page).locator(".tuto-instruction-text")).toHaveText(
      tutorialSteps[1].instruction
    );
    await settle(page);
    for (let i = 0; i < 5; i++) {
      expect(await hook(page, "isChestOpened", i)).toBe(false);
    }
    // The first real step still works right after the intro.
    await driveTutorialStep(page, tutorialSteps[1], 1);
    expect(await hook(page, "isChestOpened", 0)).toBe(true);
  });

  test("long explanations wrap and scroll inside the panel; Next stays clickable", async ({ page }) => {
    await startTutorial(page);
    const metrics = await page.evaluate(() => {
      const block = document.querySelector(".tutorial-instructions-modal .code-block");
      const btn = document.querySelector(".tutorial-instructions-modal .tuto-next-btn");
      const r = btn.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        horizontalOverflow: block.scrollWidth - block.clientWidth,
        overflowY: getComputedStyle(block).overflowY,
        buttonOnTop: hit === btn,
        buttonInViewport: r.bottom <= window.innerHeight && r.top >= 0,
      };
    });
    expect(metrics.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(metrics.overflowY).toBe("auto");
    expect(metrics.buttonOnTop).toBe(true);
    expect(metrics.buttonInViewport).toBe(true);
  });

  for (const size of [{ width: 1600, height: 900 }, { width: 1280, height: 720 }]) {
    test(`panel does not overlap the graph tables at ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size);
      await startTutorial(page);
      // Check the intro (longest text) and the first edge step.
      for (let i = 0; i < 3; i++) {
        await expect(page.locator("#tables-container")).toBeVisible();
        const gap = await page.evaluate(() => {
          const panelBox = document
            .querySelector(".tutorial-instructions-modal")
            .getBoundingClientRect();
          const tables = [...document.querySelectorAll("#tables-container *")]
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.width > 0 && r.height > 0);
          const tablesTop = Math.min(...tables.map((r) => r.top));
          return tablesTop - panelBox.bottom;
        });
        expect(gap, `panel overlaps tables on step ${i}`).toBeGreaterThanOrEqual(0);
        if (i < 2) await driveTutorialStep(page, tutorialSteps[i], i);
      }
    });
  }

  test("regular levels never show the Next button", async ({ page }) => {
    await startRegularLevel1(page);
    await expect(nextBtn(page)).toBeHidden();
  });
});
