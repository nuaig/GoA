// E2E baseline for A* regular (non-tutorial) mode, level 1.
// The graph is random; steps come from the game's AstarAlgorithm via the dev
// hook (regularSteps), re-read every step because chest clicks call
// resumeFromNode() which can append steps (tie handling).
import { test, expect } from "@playwright/test";
import {
  hook,
  hooks,
  stepIndex,
  openRoom,
  startRegularLevel1,
  clickChest,
  clickEdge,
  submitDialog,
  resolveDecisionIfShown,
} from "./support/astarPage.js";

test.describe("A* regular mode", () => {
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
    await expect(page.locator(".Hint-Text")).toContainText("Please press on node S to begin.");
    await page.waitForTimeout(1_000);
    expect(await stepIndex(page)).toBe(0);
    expect(await hook(page, "isChestOpened", wrong)).toBe(false);
    expect(await hook(page, "health")).toBe(healthBefore - 1);
  });

  test("plays level 1 to completion", async ({ page }) => {
    const [start, goal, weight] = await hooks(page, ["startNode", "goalNode", "heuristicWeight"]);
    expect(start).toBe(0);
    expect(goal).not.toBe(0);
    expect(weight).toBe(1); // default Euclidean heuristic

    const sessionPost = page.waitForRequest(
      (r) => r.method() === "POST" && new URL(r.url()).pathname === "/api/gamesessions"
    );
    const completion = page.locator(".modal__completion");
    let decisions = 0;

    for (let guard = 0; guard < 40; guard++) {
      if (await completion.isVisible()) break;
      const i = await stepIndex(page);
      const steps = await hook(page, "regularSteps");
      const step = steps[i];
      expect(step, `no generated step at index ${i}`).toBeTruthy();

      if (Array.isArray(step.expectedChests)) {
        await clickChest(page, step.expectedChests[0]);
      } else {
        // Every expected edge needs a click + its f typed; when the target
        // already has a candidate the decision modal asks for the smallest.
        for (const { edge: [u, v], newF } of step.expectedEdges) {
          await clickEdge(page, u, v);
          await submitDialog(page, Number(Number(newF).toFixed(2)));
          if (await resolveDecisionIfShown(page)) decisions++;
          await expect(page.locator("#input-dialog")).toBeHidden();
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
    expect(steps.at(-1).expectedChests).toEqual([goal]);
    expect(await hook(page, "settled")).toContainEqual(expect.objectContaining({ node: goal }));
    console.log(`[e2e info] decision modals resolved: ${decisions}`);

    const body = (await sessionPost).postDataJSON();
    expect(body).toMatchObject({ userId: "test-user", gameSession: { success: true, final_score: 60 } });
  });
});
