// E2E baseline for the Kruskal tutorial (Kruskal.html), driven with real mouse
// clicks on edges. Helpers live in ./support/kruskalPage.js (generic room
// helpers in ./support/roomPage.js), state is read through the dev-only hook
// window.__roomTest (bottom of src/js/kruskal.js).
//
// How a tutorial click works today (drawLines() onClick in src/js/kruskal.js):
//   - step with expectedEdge === null: nextTutorialStep() and RETURN - the real
//     Kruskal check (handleEdgeSelection) does not run, nothing is selected;
//   - otherwise: matching edge -> nextTutorialStep(), else #UI-Text = errorMessage;
//     then handleEdgeSelection() ALWAYS runs the real Kruskal check: a valid
//     edge is selected, an invalid one costs a life (also in the tutorial),
//     shows the hint list and overwrites #UI-Text.
// Each test gets a fresh page (Playwright default).
import { test, expect } from "@playwright/test";
import { tutorialSteps } from "../../src/js/kruskalTutorialSteps.js";
import {
  hook,
  stepIndex,
  openRoom,
  startTutorial,
  clickEdge,
  clickRearrange,
  waitUntilClickable,
  snapshot,
  edgeSet,
  hintIcon,
  expectTutorialCompleteModal,
} from "./support/kruskalPage.js";

const MST = edgeSet([[0, 2], [0, 1], [1, 3]]); // weight 1 + 2 + 4 = 7
const MST_WEIGHT = 7;
// Set by handleEdgeSelection() on a rejected edge while curRoomUI.isTutorial.
const TUTORIAL_WRONG_TEXT =
  "Learn from the hints below why this choice is incorrect. Continue following the instruction.";
// Edge clicked on step 0 (expectedEdge null): not in the MST, not the minimum.
const STEP0_EDGE = [2, 3];

const MISTAKE_STEP = tutorialSteps.findIndex((s) => /make a mistake/i.test(s.instruction));
const instruction = (page) => page.locator(".tutorial-instructions-modal .tuto-instruction-text");
const hint = (page) => page.locator(".Hint-Text");
/** Time for a wrongly scheduled timer (e.g. the 3 s red flash) to fire. */
const settle = (page, ms = 1_000) => page.waitForTimeout(ms);

/** Edge [u, v] the intended path clicks on step i. */
const pathEdge = (i) => tutorialSteps[i].expectedEdge?.slice(0, 2) ?? STEP0_EDGE;

/**
 * Clicks the intended-path edge of step i and asserts the step advanced.
 * Returns the state after the click.
 */
async function driveStep(page, i) {
  expect(await stepIndex(page)).toBe(i);
  await clickEdge(page, ...pathEdge(i));
  await expect.poll(() => stepIndex(page), { message: `step ${i} did not advance` }).toBe(i + 1);
  return snapshot(page);
}

async function driveSteps(page, from, to) {
  for (let i = from; i < to; i++) await driveStep(page, i);
}

/** End state after the MST is complete (clicked on the "(1,3)" step). */
async function expectCompletedMst(page, { health }) {
  await expectTutorialCompleteModal(page);
  // nextTutorialStep() runs before handleEdgeSelection(), so the last click
  // also moved the panel to the final "Voila" step (it is never clicked).
  expect(await stepIndex(page)).toBe(tutorialSteps.length - 1);
  expect(edgeSet(await hook(page, "selectedEdges"))).toEqual(MST);
  expect(await hook(page, "currentWeight")).toBe(MST_WEIGHT);
  for (const [u, v] of [[0, 2], [0, 1], [1, 3]]) {
    expect(await hook(page, "isEdgeSelected", u, v)).toBe(true);
  }
  for (const [u, v] of [[1, 2], [2, 3]]) {
    expect(await hook(page, "isEdgeSelected", u, v)).toBe(false);
  }
  expect(await page.evaluate(() => [0, 1, 2, 3].map((n) => window.__roomTest.isChestOpened(n)))).toEqual([
    true, true, true, true,
  ]);
  expect(await hook(page, "health")).toBe(health);
}

test.describe("Kruskal tutorial", () => {
  let errors;

  test.beforeEach(async ({ page }) => {
    ({ errors } = await openRoom(page));
    await startTutorial(page);
  });

  test.afterEach(() => {
    expect(errors, "uncaught page errors").toEqual([]);
  });

  test("page and spec agree on the tutorial steps", async ({ page }) => {
    expect(await hook(page, "tutorialSteps")).toEqual(JSON.parse(JSON.stringify(tutorialSteps)));
    // Shape the specs below rely on.
    expect(tutorialSteps.map((s) => s.expectedEdge)).toEqual([
      null, [0, 2, 1], [0, 1, 2], [1, 2, 3], [1, 3, 4], null,
    ]);
    expect(MISTAKE_STEP).toBe(3);
    await expect(instruction(page)).toHaveText(tutorialSteps[0].instruction);
  });

  test("completes the whole tutorial with real clicks", async ({ page }) => {
    expect(await hook(page, "health")).toBe(4);
    const healthAfter = [];

    // Step 0 (any edge): advances only, nothing selected.
    let s = await driveStep(page, 0);
    expect(s.selected).toEqual([]);
    healthAfter.push(s.health);

    // Steps 1, 2: valid Kruskal edges, selected for real.
    for (const i of [1, 2]) {
      s = await driveStep(page, i);
      expect(edgeSet(s.selected)).toContain(edgeSet([pathEdge(i)])[0]);
      expect(s.ui).toBe(`Correct! Current weight is ${s.weight}.`);
      expect(s.hint).toBe(false);
      healthAfter.push(s.health);
    }
    expect(s.weight).toBe(3);

    // Step 3 "make a mistake": advances, but the real check rejects (cycle).
    s = await driveStep(page, MISTAKE_STEP);
    expect(s.selected).toHaveLength(2);
    expect(s.hint).toBe(true);
    healthAfter.push(s.health);

    // Step 4: (1,3) completes the MST -> tutorial-complete modal.
    await driveStep(page, 4);
    healthAfter.push(await hook(page, "health"));

    // NOTE: current behavior - the scripted "make a mistake" step costs a life
    // even in the tutorial (handleEdgeSelection -> decrementHealth).
    expect(healthAfter).toEqual([4, 4, 4, 3, 3]);
    await expectCompletedMst(page, { health: 3 });
  });

  test("wrong edge on step 1 does not advance", async ({ page }) => {
    await driveStep(page, 0);
    const step = tutorialSteps[1];
    const wrong = [1, 3]; // weight 4: not the minimum, no cycle
    expect(await hook(page, "health")).toBe(4);
    await expect(hint(page)).toBeHidden();

    await clickEdge(page, ...wrong);

    // NOTE: current behavior - onClick writes step.errorMessage to #UI-Text,
    // then handleEdgeSelection() overwrites it in the same click, so the
    // step's errorMessage is never visible.
    await expect(page.locator("#UI-Text")).toHaveText(TUTORIAL_WRONG_TEXT);
    await expect(page.locator("#UI-Text")).not.toContainText(step.errorMessage);
    await expect(hint(page)).toBeVisible();
    expect(await hintIcon(page, 0)).toBe("wrong"); // not the minimum weight
    expect(await hintIcon(page, 1)).toBe("correct"); // no cycle
    await settle(page);
    expect(await stepIndex(page)).toBe(1);
    await expect(instruction(page)).toHaveText(step.instruction);
    expect(await hook(page, "isEdgeSelected", ...wrong)).toBe(false);
    expect(await hook(page, "selectedEdges")).toEqual([]);
    // NOTE: current behavior - a wrong edge costs a life in the tutorial.
    expect(await hook(page, "health")).toBe(3);

    // The correct edge still works and hides the hint list.
    await driveStep(page, 1);
    await expect(hint(page)).toBeHidden();
    expect(edgeSet(await hook(page, "selectedEdges"))).toEqual(edgeSet([[0, 2]]));
    expect(await hook(page, "health")).toBe(3);
  });

  test('"make a mistake" step: (1,2) advances, shows the cycle hint, is not selected', async ({
    page,
  }) => {
    await driveSteps(page, 0, MISTAKE_STEP);
    expect(edgeSet(await hook(page, "selectedEdges"))).toEqual(edgeSet([[0, 2], [0, 1]]));
    await expect(hint(page)).toBeHidden();

    const s = await driveStep(page, MISTAKE_STEP); // clicks (1, 2)

    await expect(instruction(page)).toHaveText(tutorialSteps[MISTAKE_STEP + 1].instruction);
    await expect(hint(page)).toBeVisible();
    await expect(hint(page).locator("li").nth(0)).toContainText("Select an edge with the minimum weight");
    await expect(hint(page).locator("li").nth(1)).toContainText("Select an edge that doesn't form a cycle");
    // Weight 3 equals the smallest never-selected weight -> "minimum" passes;
    // 1 and 2 are already connected -> cycle.
    expect(await hintIcon(page, 0)).toBe("correct");
    expect(await hintIcon(page, 1)).toBe("wrong");
    expect(s.ui).toBe(TUTORIAL_WRONG_TEXT);
    expect(await hook(page, "isEdgeSelected", 1, 2)).toBe(false);
    expect(edgeSet(s.selected)).toEqual(edgeSet([[0, 2], [0, 1]]));
    expect(s.weight).toBe(3);
    expect(s.health).toBe(3); // NOTE: current behavior - life lost in tutorial

    // Red flash ends after 3 s; the next step still completes the MST.
    await settle(page, 3_500);
    await driveStep(page, MISTAKE_STEP + 1);
    await expectCompletedMst(page, { health: 3 });
  });

  // NOTE: current behavior, possibly a bug. Step 0 (expectedEdge null) returns
  // before handleEdgeSelection(), so clicking the minimum edge (0,2) there only
  // advances the step; (0,2) is NOT selected, and step 1 can click it again.
  // (So there is no dead end today - the feared "selected on step 0, then
  // ignored on step 1" scenario does not happen.)
  test("step 0: clicking the minimum edge (0,2) only advances; it is not selected", async ({
    page,
  }) => {
    await clickEdge(page, 0, 2);
    await expect.poll(() => stepIndex(page)).toBe(1);
    const s = await snapshot(page);
    expect(s.selected).toEqual([]);
    expect(s.weight).toBe(0);
    expect(s.health).toBe(4);
    expect(s.hint).toBe(false);
    expect(await hook(page, "isEdgeSelected", 0, 2)).toBe(false);
    expect(await hook(page, "isChestOpened", 0)).toBe(false);
    expect(await hook(page, "isChestOpened", 2)).toBe(false);

    // Step 1 asks for (0,2) again; it is still clickable and now gets selected.
    await driveSteps(page, 1, tutorialSteps.length - 1);
    await expectCompletedMst(page, { health: 3 });
  });

  // NOTE: current behavior, possibly a bug. On the "make a mistake" step the
  // real check still accepts any valid Kruskal edge: clicking (1,3) there does
  // not advance the step, but it is selected, completes the MST and ends the
  // tutorial with the step panel still on step 3.
  test('"make a mistake" step: clicking (1,3) instead ends the tutorial early', async ({
    page,
  }) => {
    await driveSteps(page, 0, MISTAKE_STEP);
    await clickEdge(page, 1, 3);
    await expectTutorialCompleteModal(page);
    expect(await stepIndex(page)).toBe(MISTAKE_STEP);
    expect(edgeSet(await hook(page, "selectedEdges"))).toEqual(MST);
    expect(await hook(page, "currentWeight")).toBe(MST_WEIGHT);
    expect(await hook(page, "health")).toBe(4); // no mistake was made
  });

  test("Rearrange chests mid-tutorial does not break it", async ({ page }) => {
    const mid = MISTAKE_STEP - 1; // (0,2) selected, step 2 expects (0,1)
    await driveSteps(page, 0, mid);
    const before = await snapshot(page);

    const positions = () =>
      page.evaluate(() => [0, 1, 2, 3].map((n) => window.__roomTest.chestScreenPos(n)));
    const posBefore = await positions();

    // clickRearrange refuses if a scene object is under the button (the click
    // also reaches the game's window-level onClick raycast).
    expect(await clickRearrange(page), "Rearrange button is over a scene edge").toBe(true);

    const posAfter = await positions();
    const moved = posAfter.filter((p, n) => Math.hypot(p.x - posBefore[n].x, p.y - posBefore[n].y) > 5);
    expect(moved.length).toBeGreaterThan(0);
    await waitUntilClickable(page);
    expect(await snapshot(page)).toEqual(before); // step, health, selection unchanged
    expect(await hook(page, "isEdgeSelected", 0, 2)).toBe(true);

    // Edge positions are recomputed live by the hook.
    await driveSteps(page, mid, tutorialSteps.length - 1);
    await expectCompletedMst(page, { health: 3 });
  });
});
