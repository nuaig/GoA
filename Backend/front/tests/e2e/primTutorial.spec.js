// E2E baseline for the Prim tutorial (Prim.html), driven with real mouse
// clicks on edges. Helpers live in ./support/primPage.js (shared MST helpers in
// ./support/mstPage.js, generic room helpers in ./support/roomPage.js), state
// is read through the dev-only hook window.__roomTest (bottom of src/js/prim.js).
//
// How a tutorial click works today (drawLines() onClick in src/js/prim.js):
//   - step with expectedEdge === null: nextTutorialStep() and RETURN - the real
//     Prim check (handleEdgeSelection) does not run, nothing is selected;
//   - otherwise: matching edge -> nextTutorialStep(), else #UI-Text = errorMessage;
//     then handleEdgeSelection() ALWAYS runs the real Prim check: a valid
//     edge is selected, an invalid one costs a life (also in the tutorial),
//     shows the hint list (incl. .Prim-Hint) and overwrites #UI-Text.
// Tutorial graph: createSpecificGraphPrimTutorial(), start node 0 (primSetup()).
// Each test gets a fresh page (Playwright default).
import { test, expect } from "@playwright/test";
import { tutorialSteps } from "../../src/js/primTutorialSteps.js";
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
} from "./support/primPage.js";

const MST_EDGES = [[0, 2], [0, 1], [1, 3], [1, 4]]; // weight 1 + 3 + 2 + 6 = 12
const MST = edgeSet(MST_EDGES);
const MST_WEIGHT = 12;
// Set by handleEdgeSelection() on a rejected edge while curRoomUI.isTutorial.
const TUTORIAL_WRONG_TEXT =
  "Learn from the hints below why this choice is incorrect. Continue following the instruction.";
// Edge clicked on step 0 (expectedEdge null): not in the MST.
const STEP0_EDGE = [3, 4];

const MISTAKE_STEPS = tutorialSteps
  .map((s, i) => (/make a mistake/i.test(s.instruction) ? i : -1))
  .filter((i) => i >= 0);
const instruction = (page) => page.locator(".tutorial-instructions-modal .tuto-instruction-text");
const nextButton = (page) => page.locator(".tutorial-instructions-modal .tuto-next-btn");
const hint = (page) => page.locator(".Hint-Text");
const hintIcons = (page) => Promise.all([0, 1, 2].map((i) => hintIcon(page, i)));
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
  if (tutorialSteps[i].type === "info") {
    await nextButton(page).click();
    await expect.poll(() => stepIndex(page), { message: `step ${i} did not advance` }).toBe(i + 1);
    return snapshot(page);
  }
  // Registered only once the step has advanced, so a missed click is retried.
  await clickEdge(page, ...pathEdge(i), async () => (await stepIndex(page)) === i + 1);
  await expect.poll(() => stepIndex(page), { message: `step ${i} did not advance` }).toBe(i + 1);
  return snapshot(page);
}

async function driveSteps(page, from, to) {
  for (let i = from; i < to; i++) await driveStep(page, i);
}

/** End state after the MST is complete (clicked on the "(1,4)" step). */
async function expectCompletedMst(page, { health }) {
  await expectTutorialCompleteModal(page);
  // nextTutorialStep() runs before handleEdgeSelection(), so the last click
  // also moved the panel to the final "Voila" step (it is never clicked).
  expect(await stepIndex(page)).toBe(tutorialSteps.length - 1);
  expect(edgeSet(await hook(page, "selectedEdges"))).toEqual(MST);
  expect(await hook(page, "currentWeight")).toBe(MST_WEIGHT);
  for (const [u, v] of MST_EDGES) expect(await hook(page, "isEdgeSelected", u, v)).toBe(true);
  for (const [u, v] of [[1, 2], [2, 3], [3, 4]]) {
    expect(await hook(page, "isEdgeSelected", u, v)).toBe(false);
  }
  expect(await hook(page, "treeNodes")).toEqual([0, 1, 2, 3, 4]);
  expect(
    await page.evaluate(() => [0, 1, 2, 3, 4].map((n) => window.__roomTest.isChestOpened(n)))
  ).toEqual([true, true, true, true, true]);
  expect(await hook(page, "health")).toBe(health);
}

test.describe("Prim tutorial", () => {
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
      null, [0, 2, 1], [1, 3, 2], [0, 1, 3], [1, 3, 2], [1, 2, 4], [1, 4, 6], null,
    ]);
    expect(MISTAKE_STEPS).toEqual([2, 5]);
    await expect(instruction(page)).toHaveText(tutorialSteps[0].instruction);
    // Start node 0: its chest is open from the start, the tree is {0}.
    expect(await hook(page, "treeNodes")).toEqual([0]);
    expect(await hook(page, "isChestOpened", 0)).toBe(true);
    expect(await hook(page, "isChestOpened", 1)).toBe(false);
    // Step 0 is the intro info page, so the Next button is shown.
    await expect(nextButton(page)).toBeVisible();
  });

  test("completes the whole tutorial with real clicks", async ({ page }) => {
    expect(await hook(page, "health")).toBe(4);
    const healthAfter = [];

    // Step 0 (expectedEdge null): any edge advances, nothing is selected.
    let s = await driveStep(page, 0);
    expect(s.selected).toEqual([]);
    expect(await hook(page, "isEdgeSelected", ...STEP0_EDGE)).toBe(false);
    healthAfter.push(s.health);

    for (let i = 1; i < tutorialSteps.length - 1; i++) {
      s = await driveStep(page, i);
      healthAfter.push(s.health);
      if (MISTAKE_STEPS.includes(i)) {
        // "make a mistake": advances, but the real check rejects it.
        expect(s.hint).toBe(true);
        expect(s.ui).toBe(TUTORIAL_WRONG_TEXT);
        expect(await hook(page, "isEdgeSelected", ...pathEdge(i))).toBe(false);
      } else if (i < tutorialSteps.length - 2) {
        expect(await hook(page, "isEdgeSelected", ...pathEdge(i))).toBe(true);
        expect(s.ui).toBe(`Correct! Current weight is ${s.weight}.`);
        expect(s.hint).toBe(false);
      }
    }

    // NOTE: current behavior - each scripted "make a mistake" step costs a life
    // even in the tutorial (handleEdgeSelection -> decrementHealth).
    expect(healthAfter).toEqual([4, 4, 3, 3, 3, 2, 2]);
    await expectCompletedMst(page, { health: 2 });
  });

  test("wrong edge on step 1 does not advance", async ({ page }) => {
    await driveStep(page, 0);
    const step = tutorialSteps[1];
    const wrong = [0, 1]; // weight 3: touches the tree but is not the minimum
    expect(await hook(page, "health")).toBe(4);
    await expect(hint(page)).toBeHidden();

    await clickEdge(page, ...wrong);

    // NOTE: current behavior - onClick writes step.errorMessage to #UI-Text,
    // then handleEdgeSelection() overwrites it in the same click, so the
    // step's errorMessage is never visible.
    await expect(page.locator("#UI-Text")).toHaveText(TUTORIAL_WRONG_TEXT);
    await expect(page.locator("#UI-Text")).not.toContainText(step.errorMessage);
    await expect(hint(page)).toBeVisible();
    await expect(page.locator(".Prim-Hint")).toBeVisible();
    // [min weight, no cycle, touches tree]
    expect(await hintIcons(page)).toEqual(["wrong", "correct", "correct"]);
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

  test('"make a mistake" step 2: (1,3) advances, shows the not-connected hint, is not selected', async ({
    page,
  }) => {
    await driveSteps(page, 0, 2);
    expect(edgeSet(await hook(page, "selectedEdges"))).toEqual(edgeSet([[0, 2]]));
    await expect(hint(page)).toBeHidden();

    const s = await driveStep(page, 2); // clicks (1, 3)

    await expect(instruction(page)).toHaveText(tutorialSteps[3].instruction);
    await expect(hint(page)).toBeVisible();
    await expect(page.locator(".Prim-Hint")).toBeVisible();
    // Weight 2 is the smallest never-selected weight -> "minimum" passes
    // (selectEdge compares with the global unselected minimum); no cycle;
    // neither 1 nor 3 is in the tree {0, 2} -> "touches tree" fails.
    expect(await hintIcons(page)).toEqual(["correct", "correct", "wrong"]);
    expect(s.ui).toBe(TUTORIAL_WRONG_TEXT);
    expect(await hook(page, "isEdgeSelected", 1, 3)).toBe(false);
    expect(edgeSet(s.selected)).toEqual(edgeSet([[0, 2]]));
    expect(await hook(page, "treeNodes")).toEqual([0, 2]);
    expect(s.weight).toBe(1);
    expect(s.health).toBe(3); // NOTE: current behavior - life lost in tutorial

    // Red flash ends after 3 s; the rest of the path still completes the MST.
    await settle(page, 3_500);
    await driveSteps(page, 3, tutorialSteps.length - 1);
    await expectCompletedMst(page, { health: 2 });
  });

  test('"make a mistake" step 5: (1,2) advances, shows the cycle hint, is not selected', async ({
    page,
  }) => {
    await driveSteps(page, 0, 5);
    expect(edgeSet(await hook(page, "selectedEdges"))).toEqual(edgeSet([[0, 2], [0, 1], [1, 3]]));
    expect(await hook(page, "health")).toBe(3);

    const s = await driveStep(page, 5); // clicks (1, 2)

    await expect(instruction(page)).toHaveText(tutorialSteps[6].instruction);
    await expect(hint(page)).toBeVisible();
    await expect(hint(page).locator("li").nth(0)).toContainText("minimum weight");
    await expect(hint(page).locator("li").nth(1)).toContainText("cycle");
    await expect(page.locator(".Prim-Hint")).toBeVisible();
    // Weight 4 is the smallest never-selected weight -> "minimum" passes;
    // 1 and 2 are both in the tree -> cycle; it touches the tree.
    expect(await hintIcons(page)).toEqual(["correct", "wrong", "correct"]);
    expect(s.ui).toBe(TUTORIAL_WRONG_TEXT);
    expect(await hook(page, "isEdgeSelected", 1, 2)).toBe(false);
    expect(s.weight).toBe(6);
    expect(s.health).toBe(2); // NOTE: current behavior - life lost in tutorial

    await settle(page, 3_500);
    await driveStep(page, 6);
    await expectCompletedMst(page, { health: 2 });
  });

  // NOTE: current behavior, possibly a bug. On the "make a mistake" step 2 the
  // real check still accepts any valid Prim edge: clicking (0,1) there does
  // not advance the step, but it is selected and overwrites #UI-Text.
  test('"make a mistake" step 2: clicking (0,1) instead is selected without advancing', async ({
    page,
  }) => {
    await driveSteps(page, 0, 2);
    await clickEdge(page, 0, 1);
    await settle(page);
    const s = await snapshot(page);
    expect(s.step).toBe(2);
    expect(edgeSet(s.selected)).toEqual(edgeSet([[0, 2], [0, 1]]));
    expect(s.weight).toBe(4);
    expect(s.health).toBe(4); // no mistake was made
    expect(s.ui).toBe("Correct! Current weight is 4."); // step errorMessage overwritten
    await expect(instruction(page)).toHaveText(tutorialSteps[2].instruction);
  });

  test("starts on the intro page with a Next button", async ({ page }) => {
    expect(tutorialSteps[0].type).toBe("info");
    await expect(nextButton(page)).toBeVisible();
    await expect(instruction(page)).toHaveText("Read the notes below, then press Next.");
    const explanation = page.locator(".tutorial-instructions-modal .tuto-explanation-text");
    await expect(explanation).toContainText("Rearrange chests");
    await expect(explanation).toContainText("Click for help");
    await expect(explanation).toContainText('node 0 (marked "Start")');
  });

  test("clicking an edge on the intro page only shows a hint", async ({ page }) => {
    await clickEdge(page, 0, 2, async () => (await snapshot(page)).ui === tutorialSteps[0].errorMessage);
    await page.waitForTimeout(1_000);
    const s = await snapshot(page);
    expect(s.step).toBe(0);
    expect(s.selected).toEqual([]);
    expect(s.health).toBe(4);
    expect(await hook(page, "isEdgeSelected", 0, 2)).toBe(false);
    await expect(nextButton(page)).toBeVisible();
  });

  test("Next moves to Step 1, hides itself and selects nothing", async ({ page }) => {
    await nextButton(page).click();
    await expect.poll(() => stepIndex(page)).toBe(1);
    await expect(nextButton(page)).toBeHidden();
    await expect(instruction(page)).toHaveText(tutorialSteps[1].instruction);
    expect((await snapshot(page)).selected).toEqual([]);
    await driveStep(page, 1);
    expect(await hook(page, "isEdgeSelected", 0, 2)).toBe(true);
  });

  test("Rearrange chests mid-tutorial does not break it", async ({ page }) => {
    const mid = 2; // (0,2) selected, step 2 expects the (1,3) mistake
    await driveSteps(page, 0, mid);
    const before = await snapshot(page);

    const positions = () =>
      page.evaluate(() => [0, 1, 2, 3, 4].map((n) => window.__roomTest.chestScreenPos(n)));
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

    // The "Start" ring and label follow chest 0.
    const { chest, ring, label } = await hook(page, "startMarkers");
    expect(ring[0]).toBeCloseTo(chest[0]);
    expect(ring[1]).toBeCloseTo(chest[1] + 0.1);
    expect(ring[2]).toBeCloseTo(chest[2]);
    expect(label[0]).toBeCloseTo(chest[0]);
    expect(label[1]).toBeCloseTo(chest[1] + 4);
    expect(label[2]).toBeCloseTo(chest[2]);

    // Edge positions are recomputed live by the hook.
    await driveSteps(page, mid, tutorialSteps.length - 1);
    await expectCompletedMst(page, { health: 2 });
  });
});
