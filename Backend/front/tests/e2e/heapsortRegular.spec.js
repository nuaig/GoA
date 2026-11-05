// E2E baseline for Heapsort regular (non-tutorial) mode, level 1.
// The array is random (6 values in 1..99); it is read through the dev hook
// and the expected actions are computed here with a reference heap sort
// (referenceActions in ./support/heapsortPage.js). Before every drag the
// reference action is checked against the game's own expectation
// (buildIndex / expectedSwap from the hook), then performed with a real drag.
import { test, expect } from "@playwright/test";
import {
  hook,
  openRoom,
  startRegularLevel1,
  dragTo,
  snapshot,
  referenceActions,
  LEVEL1_SIZE,
} from "./support/heapsortPage.js";

const LEVEL1_MAX_SCORE = 40; // levelMaxScores[1] in src/js/heapsort.js
// checkLevelCompletionAndUpdate(): floor(max * ((health + 1) * 0.1 + 1)).
const finalScore = (health) => Math.floor(LEVEL1_MAX_SCORE * ((health + 1) * 0.1 + 1));

/** Plays `actions` with real drags, asserting the game expects each one first. */
async function playActions(page, actions) {
  for (const act of actions) {
    const s = await snapshot(page);
    if (act.type === "place") {
      expect(s.phase).toBe(0);
      expect(s.buildIndex).toBe(act.index);
      await dragTo(page, act.index, act.index, async () => (await hook(page, "buildIndex")) === act.index + 1);
      continue;
    }
    expect(s.phase, `phase for swap ${act.a}<->${act.b}`).toBe(act.phase);
    const gameSwap =
      s.phase === 2 && s.expectedSwap === null ? [0, s.lastUnsorted - 1] : s.expectedSwap;
    expect(gameSwap).toEqual([act.a, act.b]);
    const want = [...s.array];
    [want[act.a], want[act.b]] = [want[act.b], want[act.a]];
    await dragTo(page, act.a, act.b, async () =>
      JSON.stringify(await hook(page, "arrayValues")) === JSON.stringify(want)
    );
  }
}

test.describe("Heapsort regular level 1", () => {
  let errors;

  test.beforeEach(async ({ page }) => {
    ({ errors } = await openRoom(page));
    await startRegularLevel1(page);
  });

  test.afterEach(() => {
    expect(errors, "uncaught page errors").toEqual([]);
  });

  test("played to completion with real drags posts a successful game session", async ({ page }) => {
    const start = await snapshot(page);
    expect(start).toMatchObject({ health: 4, phase: 0, buildIndex: 0, score: 0 });
    expect(start.array).toHaveLength(LEVEL1_SIZE);
    expect(start.tree).toEqual(Array(LEVEL1_SIZE).fill(null));

    const { actions, sorted } = referenceActions(start.array);
    expect(sorted).toEqual([...start.array].sort((a, b) => a - b));
    console.log(`[e2e info] level 1 array ${JSON.stringify(start.array)}, ${actions.length} actions`);

    const sessionPost = page.waitForRequest(
      (r) => r.method() === "POST" && new URL(r.url()).pathname === "/api/gamesessions"
    );
    await playActions(page, actions);

    const body = (await sessionPost).postDataJSON();
    expect(body.gameSession).toMatchObject({
      success: true,
      final_score: finalScore(4),
      total_mistakes: 0,
    });
    expect(body.userId).toBe("test-user");

    const modal = page.locator(".modal__completion");
    await expect(modal).toBeVisible();
    await expect(modal.locator(".modal__completion__header")).toHaveText("Congratulations!");
    await expect(modal.locator(".label__final_score span")).toHaveText(String(finalScore(4)));
    expect(await snapshot(page)).toMatchObject({
      health: 4,
      phase: 3, // advanceStep() after the regular completion
      array: sorted,
      tree: sorted,
      score: finalScore(4),
    });
    expect(await hook(page, "isTutorial")).toBe(false);
  });

  test("one wrong action costs exactly one life", async ({ page }) => {
    // Index 1 before index 0: right slot, wrong turn.
    await dragTo(page, 1, 1);
    expect(await snapshot(page)).toMatchObject({
      health: 3,
      phase: 0,
      buildIndex: 0,
      score: 0,
      tree: Array(LEVEL1_SIZE).fill(null),
    });
    await expect(page.locator("#UI-Text")).toHaveText(
      "Wrong Move! Please check if there are any remaining nodes to the left of this node."
    );
    await expect(page.locator(".modal__completion")).toBeHidden();

    // A correct action afterwards keeps the remaining lives.
    await dragTo(page, 0, 0, async () => (await hook(page, "buildIndex")) === 1);
    expect(await snapshot(page)).toMatchObject({ health: 3, buildIndex: 1 });
  });
});
