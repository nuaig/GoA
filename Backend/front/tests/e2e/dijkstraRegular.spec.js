// E2E baseline for Dijkstra regular (non-tutorial) mode, level 1.
// The graph is random; steps come from the game's DijkstraAlgorithm via the
// dev hook (regularSteps), re-read every step because chest clicks call
// resumeFromNode() which can append steps (ambiguity/tie handling).
import { test, expect } from "@playwright/test";
import {
  hook,
  stepIndex,
  openRoom,
  startRegularLevel1,
  clickChest,
  clickEdge,
  submitDialog,
} from "./support/dijkstraPage.js";

test.describe("Dijkstra regular mode", () => {
  let errors;

  test.beforeEach(async ({ page }) => {
    ({ errors } = await openRoom(page));
    await startRegularLevel1(page);
  });

  test.afterEach(() => {
    expect(errors, "uncaught page errors").toEqual([]);
  });

  test("a wrong chest click costs exactly one life", async ({ page }) => {
    const [step] = await hook(page, "regularSteps");
    expect(step.expectedChests).toEqual([0]);
    const healthBefore = await hook(page, "health");
    expect(healthBefore).toBe(4);

    const wrong = 3;
    await clickChest(page, wrong, async () => (await hook(page, "health")) !== healthBefore);
    expect(await hook(page, "health")).toBe(healthBefore - 1);
    await expect(page.locator(".Hint-Text")).toContainText("Please press on node 0 to begin.");
    await page.waitForTimeout(1_000);
    expect(await stepIndex(page)).toBe(0);
    expect(await hook(page, "isChestOpened", wrong)).toBe(false);
    expect(await hook(page, "health")).toBe(healthBefore - 1);
  });

  test("plays level 1 to completion", async ({ page }) => {
    const completion = page.locator(".modal__completion");

    for (let guard = 0; guard < 40; guard++) {
      if (await completion.isVisible()) break;
      const i = await stepIndex(page);
      const steps = await hook(page, "regularSteps");
      const step = steps[i];
      expect(step, `no generated step at index ${i}`).toBeTruthy();

      if (Array.isArray(step.expectedChests)) {
        await clickChest(page, step.expectedChests[0]);
      } else {
        // Every expected edge needs a click + its weight typed; the step
        // advances after the last one (curRoomUI.readyForNextStep).
        for (const { edge: [u, v], weight } of step.expectedEdges) {
          await clickEdge(page, u, v);
          await submitDialog(page, weight);
          await expect(page.locator("#input-dialog")).toBeHidden();
          await expect(page.locator(`#distance-${v}`)).toHaveText(String(weight));
        }
      }
      await expect
        .poll(async () => (await completion.isVisible()) || (await stepIndex(page)) === i + 1, {
          message: `regular step ${i} did not advance`,
        })
        .toBe(true);
    }

    await expect(completion).toBeVisible();
    await expect(page.locator(".modal__completion__header")).toHaveText("Congratulations!");
    await expect(page.locator(".label__completion_text")).toContainText("level 1");
    expect(await hook(page, "health")).toBe(4); // no mistakes made
    const steps = await hook(page, "regularSteps");
    expect(await stepIndex(page)).toBe(steps.length);
  });
});
