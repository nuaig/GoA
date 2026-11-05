// E2E baseline for the A* tutorial (Astar.html), driven with real mouse
// clicks. Helpers + step driver live in ./support/astarPage.js.
// Tutorial graph: createSpecificGraphAstarTutorial(), S=0, G=4, h=0.
import { test, expect } from "@playwright/test";
import { tutorialSteps } from "../../src/js/astarTutorialSteps.js";
import {
  hook,
  hooks,
  stepIndex,
  openRoom,
  startTutorial,
  driveTutorialStep,
  driveTutorial,
  clickChest,
  clickEdge,
  clickAnyEdge,
  clickRearrange,
  submitDialog,
  sameEdge,
  waitUntilClickable,
  decisionModal,
  decisionValues,
  chooseCandidate,
} from "./support/astarPage.js";

const firstIndex = (pred, from = 0) => {
  const i = tutorialSteps.findIndex((s, idx) => idx >= from && pred(s));
  if (i === -1) throw new Error("no matching tutorial step");
  return i;
};
const isEdgeStep = (s) => Array.isArray(s.expectedEdges);
// Edge step whose candidate differs from the already-known g -> decision modal.
const DECISION_STEP = 6; // edge (2,1): known g(1)=2, candidate 4

/** Time window in which a wrongly-scheduled step advance would fire. */
const settle = (page) => page.waitForTimeout(1_000);

async function expectTutorialComplete(page) {
  expect(await stepIndex(page)).toBe(tutorialSteps.length);
  const modal = page.locator(".modal__tutorial");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".tutorial__header")).toHaveText("Well done!");
  await expect(modal.locator(".label__tutorial_text")).toContainText("Astar");
  await expect(modal.locator(".btn__tutorial__no_or_continue")).toHaveText("Continue");
  await expect(modal.locator(".btn__tutorial__yes")).toBeHidden();
  await expect(page.locator(".tutorial-instructions-modal")).toBeHidden();
  expect(await hook(page, "isTutorial")).toBe(false);

  // Every node settled with its shortest g.
  expect(await hook(page, "settled")).toEqual([
    { node: 0, g: 0 },
    { node: 2, g: 1 },
    { node: 1, g: 2 },
    { node: 3, g: 3 },
    { node: 4, g: 4 },
  ]);
  const queue = await hook(page, "priorityQueue");
  const persistent = queue.filter((e) => !e.transient);
  expect(persistent.every((e) => e.visited)).toBe(true);
  expect(persistent.map((e) => [e.node, e.g]).sort((a, b) => a[0] - b[0])).toEqual([
    [0, 0], [1, 2], [2, 1], [3, 3], [4, 4],
  ]);
  // Current behaviour: the losing candidates from the two decision steps stay
  // in the queue as transient rows after their node is visited.
  expect(queue.filter((e) => e.transient)).toEqual([
    { node: 1, g: 4, h: 0, f: 4, visited: false, transient: true },
    { node: 3, g: 6, h: 0, f: 6, visited: false, transient: true },
  ]);
  await expect(page.locator("#priority-queue-body tr")).toHaveCount(2);
}

test.describe("A* tutorial", () => {
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
    expect(await hooks(page, ["startNode", "goalNode", "heuristicWeight"])).toEqual([0, 4, 0]);
    expect(await hook(page, "graphEdges")).toEqual([
      [0, 1, 2], [0, 2, 1], [1, 2, 3], [1, 3, 4], [2, 3, 2], [2, 4, 3], [3, 4, 1],
    ]);
    // Known text bug: the step labels skip "Step 9".
    const labels = tutorialSteps.map((s) => Number(s.instruction.match(/^Step (\d+):/)[1]));
    expect(labels).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12]);
    await expect(page.locator(".tuto-instruction-text")).toHaveText(tutorialSteps[0].instruction);
    await expect(page.locator("#heuristicWeightInput")).toBeDisabled();
    await expect(page.locator("#heuristicWeightInput")).toHaveValue("0");
  });

  test("completes the whole tutorial with real clicks", async ({ page }) => {
    const decisions = await driveTutorial(page, tutorialSteps, 0, tutorialSteps.length);
    // Decision modal appears exactly where the candidate differs from known g.
    expect(decisions).toEqual({ 6: [2, 4], 8: [3, 6] });
    await expectTutorialComplete(page);
  });

  test("wrong node at step 0 does not advance", async ({ page }) => {
    const step = tutorialSteps[0];
    const healthBefore = await hook(page, "health");
    const hint = page.locator(".Hint-Text");
    await expect(hint).toBeHidden();

    await clickChest(page, 3, () => hint.isVisible());
    await expect(hint).toHaveText(step.errorMessage);
    await settle(page);
    expect(await stepIndex(page)).toBe(0);
    expect(await hook(page, "isChestOpened", 3)).toBe(false);
    expect(await hook(page, "health")).toBe(healthBefore); // no life lost in tutorial

    await driveTutorialStep(page, step, 0);
    expect(await hook(page, "settled")).toEqual([{ node: 0, g: 0 }]);
  });

  test("wrong edge on an edge step does not advance", async ({ page }) => {
    const i = firstIndex(isEdgeStep);
    await driveTutorial(page, tutorialSteps, 0, i);
    const step = tutorialSteps[i];
    const wrongEdges = (await hook(page, "graphEdges"))
      .map(([u, v]) => [u, v])
      .filter((e) => !step.expectedEdges.some((x) => sameEdge(e, x)));
    const healthBefore = await hook(page, "health");
    const hint = page.locator(".Hint-Text");
    await expect(hint).toBeHidden();

    await clickAnyEdge(page, wrongEdges, () => hint.isVisible());
    await expect(hint).toHaveText(step.errorMessage);
    await expect(page.locator("#input-dialog")).toBeHidden();
    await settle(page);
    expect(await stepIndex(page)).toBe(i);
    expect(await hook(page, "health")).toBe(healthBefore);

    await driveTutorialStep(page, step, i);
  });

  test("wrong typed value keeps the dialog open; right value advances", async ({ page }) => {
    const i = firstIndex(isEdgeStep);
    await driveTutorial(page, tutorialSteps, 0, i);
    const step = tutorialSteps[i];
    const [node, value] = Object.entries(step.updatedDistance)[0];
    const healthBefore = await hook(page, "health");
    const queueBefore = await hook(page, "priorityQueue");

    await clickEdge(page, ...step.expectedEdges[0]);
    await submitDialog(page, Number(value) + 10);

    const dialog = page.locator("#input-dialog");
    await expect(page.locator(".Hint-Text")).toHaveText(step.errorMessage);
    await expect(page.locator("#UI-Text")).toHaveText("Incorrect input. Try again.");
    await expect(dialog).toBeVisible();
    await expect(decisionModal(page)).toBeHidden();
    expect(await hook(page, "isModalOpen")).toBe(true);
    await settle(page);
    expect(await stepIndex(page)).toBe(i);
    expect(await hook(page, "priorityQueue")).toEqual(queueBefore);
    expect(await hook(page, "health")).toBe(healthBefore);

    await submitDialog(page, value, { refocus: true });
    await expect(dialog).toBeHidden();
    await expect.poll(() => stepIndex(page)).toBe(i + 1);
    const row = (await hook(page, "priorityQueue")).find((e) => e.node === Number(node));
    expect(row).toMatchObject({ g: Number(value), f: Number(value), visited: false });
  });

  test("choosing the larger candidate does not advance", async ({ page }) => {
    const i = DECISION_STEP;
    await driveTutorial(page, tutorialSteps, 0, i);
    const step = tutorialSteps[i];
    const healthBefore = await hook(page, "health");

    await clickEdge(page, ...step.expectedEdges[0]);
    // Typing the currently known g(1)=2 is accepted too and still asks.
    await submitDialog(page, 2);
    await expect(decisionModal(page)).toBeVisible();
    await expect(page.locator("#input-dialog")).toBeHidden();
    expect(await hook(page, "isDecisionModalOpen")).toBe(true);
    expect(await decisionValues(page)).toEqual([2, 4]);
    await expect(page.locator("#candidate-decision-message")).toContainText(
      "Choose the smallest value: 2.00."
    );

    await chooseCandidate(page, 4);
    await expect(page.locator(".Hint-Text")).toHaveText(step.errorMessage);
    await expect(page.locator("#UI-Text")).toHaveText("Keep the smaller value in the queue for A*.");
    await settle(page);
    await expect(decisionModal(page)).toBeVisible();
    expect(await stepIndex(page)).toBe(i);
    expect(await hook(page, "isModalOpen")).toBe(true);
    expect(await hook(page, "health")).toBe(healthBefore);

    await chooseCandidate(page, 2);
    await expect(decisionModal(page)).toBeHidden();
    await expect.poll(() => stepIndex(page)).toBe(i + 1);
    expect(await hook(page, "isDecisionModalOpen")).toBe(false);
    const rows = (await hook(page, "priorityQueue")).filter((e) => e.node === 1);
    expect(rows).toEqual([
      { node: 1, g: 2, h: 0, f: 2, visited: false, transient: false },
      { node: 1, g: 4, h: 0, f: 4, visited: false, transient: true },
    ]);
  });

  test("Rearrange chests mid-tutorial does not break it", async ({ page }) => {
    const mid = Math.floor(tutorialSteps.length / 2);
    await driveTutorial(page, tutorialSteps, 0, mid);

    const positions = () =>
      page.evaluate(() => [0, 1, 2, 3, 4].map((n) => window.__roomTest.chestScreenPos(n)));
    const before = await positions();
    const healthBefore = await hook(page, "health");

    expect(await clickRearrange(page), "Rearrange button is over a scene object").toBe(true);

    const after = await positions();
    const moved = after.filter((p, n) => Math.hypot(p.x - before[n].x, p.y - before[n].y) > 5);
    expect(moved.length).toBeGreaterThan(0);
    await waitUntilClickable(page);
    expect(await stepIndex(page)).toBe(mid);
    expect(await hook(page, "health")).toBe(healthBefore);

    await driveTutorial(page, tutorialSteps, mid, tutorialSteps.length);
    await expectTutorialComplete(page);
  });
});
