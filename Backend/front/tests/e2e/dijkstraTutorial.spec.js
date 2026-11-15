// E2E baseline for the Dijkstra tutorial (Dijkstra.html), driven with real
// mouse clicks. Helpers + step driver live in ./support/dijkstraPage.js.
// Each test gets a fresh page (Playwright default).
import { test, expect } from "@playwright/test";
import { tutorialSteps } from "../../src/js/dijkstraTutorialSteps.js";
import {
  hook,
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
} from "./support/dijkstraPage.js";

const FINAL_DISTANCES = { 0: "0", 1: "2", 2: "1", 3: "3", 4: "4" };
const ALREADY_VISITED = "This was already visited. Please choose the correct one!";

const firstIndex = (pred, from = 0) => {
  const i = tutorialSteps.findIndex((s, idx) => idx >= from && pred(s));
  if (i === -1) throw new Error("no matching tutorial step");
  return i;
};
const isChestStep = (s) => s.type !== "info" && Array.isArray(s.expectedChests);
const isEdgeStep = (s) => s.type !== "info" && Array.isArray(s.expectedEdges);

/** Time window in which a wrongly-scheduled setTimeout(nextTutorialStep, 500) would fire. */
const settle = (page) => page.waitForTimeout(1_000);

async function expectTutorialComplete(page) {
  expect(await stepIndex(page)).toBe(tutorialSteps.length);
  // updateTutorialModalToBeTutorialCompleteModal()
  const modal = page.locator(".modal__tutorial");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".tutorial__header")).toHaveText("Well done!");
  await expect(modal.locator(".label__tutorial_text")).toContainText("Dijkstra");
  await expect(modal.locator(".btn__tutorial__no_or_continue")).toHaveText("Continue");
  await expect(modal.locator(".btn__tutorial__yes")).toBeHidden();
  await expect(page.locator(".tutorial-instructions-modal")).toBeHidden();
  expect(await hook(page, "isTutorial")).toBe(false);
  for (const [node, dist] of Object.entries(FINAL_DISTANCES)) {
    await expect(page.locator(`#distance-${node}`)).toHaveText(dist);
  }
}

test.describe("Dijkstra tutorial", () => {
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
  });

  test("completes the whole tutorial with real clicks", async ({ page }) => {
    await driveTutorial(page, tutorialSteps, 0, tutorialSteps.length);
    await expectTutorialComplete(page);
  });

  test("wrong chest on the first chest step does not advance", async ({ page }) => {
    const i = firstIndex(isChestStep);
    await driveTutorial(page, tutorialSteps, 0, i); // leading info steps (none today)
    const step = tutorialSteps[i];
    const wrong = [3, 4, 1, 2, 0].find((n) => !step.expectedChests.includes(n));
    const healthBefore = await hook(page, "health");
    const hint = page.locator(".Hint-Text");
    await expect(hint).toBeHidden();

    await clickChest(page, wrong, () => hint.isVisible());
    await expect(hint).toContainText(step.errorMessage);
    await settle(page);
    expect(await stepIndex(page)).toBe(i);
    expect(await hook(page, "isChestOpened", wrong)).toBe(false);
    expect(await hook(page, "health")).toBe(healthBefore); // no life lost in tutorial

    await driveTutorialStep(page, step, i); // correct chest still works
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
    await expect(hint).toContainText(step.errorMessage);
    await expect(page.locator("#input-dialog")).toBeHidden();
    await settle(page);
    expect(await stepIndex(page)).toBe(i);
    expect(await hook(page, "health")).toBe(healthBefore);

    await driveTutorialStep(page, step, i);
  });

  test("wrong typed distance keeps the dialog open; right value advances", async ({ page }) => {
    const i = firstIndex(isEdgeStep);
    await driveTutorial(page, tutorialSteps, 0, i);
    const step = tutorialSteps[i];
    const [node, value] = Object.entries(step.updatedDistance)[0];
    const cell = page.locator(`#distance-${node}`);
    const cellBefore = await cell.textContent();
    const healthBefore = await hook(page, "health");

    await clickEdge(page, ...step.expectedEdges[0]);
    await submitDialog(page, Number(value) + 10);

    // Current behaviour: dialog stays open with the wrong value, modal stays "open".
    const dialog = page.locator("#input-dialog");
    await expect(page.locator(".Hint-Text")).toBeVisible();
    await expect(page.locator(".Hint-Text")).toContainText(step.errorMessage);
    await expect(page.locator("#UI-Text")).toHaveText("Incorrect input. Try again.");
    await expect(dialog).toBeVisible();
    await expect(page.locator("#dialog-input")).toHaveValue(String(Number(value) + 10));
    expect(await hook(page, "isModalOpen")).toBe(true);
    await settle(page);
    expect(await stepIndex(page)).toBe(i);
    await expect(cell).toHaveText(cellBefore);
    expect(await hook(page, "health")).toBe(healthBefore);

    // Retry in the same dialog with the right value (input is no longer focused).
    await expect(page.locator("#dialog-input")).not.toBeFocused();
    await submitDialog(page, value, { refocus: true });
    await expect(dialog).toBeHidden();
    await expect(cell).toHaveText(String(value));
    await expect.poll(() => stepIndex(page)).toBe(i + 1);
  });

  test("clicking an already-visited chest does not advance", async ({ page }) => {
    const first = firstIndex(isChestStep);
    const i = firstIndex(isChestStep, first + 1); // second chest step: a chest is already open
    await driveTutorial(page, tutorialSteps, 0, i);
    const visited = tutorialSteps[first].expectedChests[0];
    expect(await hook(page, "isChestOpened", visited)).toBe(true);
    const healthBefore = await hook(page, "health");
    const hint = page.locator(".Hint-Text");
    await expect(hint).toBeHidden();

    await clickChest(page, visited, () => hint.isVisible());
    await expect(hint).toHaveText(ALREADY_VISITED);
    await settle(page);
    expect(await stepIndex(page)).toBe(i);
    expect(await hook(page, "health")).toBe(healthBefore);

    await driveTutorialStep(page, tutorialSteps[i], i);
  });

  test("pressing Enter in the dialog works like OK", async ({ page }) => {
    // Drive the whole tutorial submitting every distance with Enter.
    await driveTutorial(page, tutorialSteps, 0, tutorialSteps.length, { submit: "enter" });
    await expectTutorialComplete(page);
  });

  test("Rearrange chests mid-tutorial does not break it", async ({ page }) => {
    const mid = Math.floor(tutorialSteps.length / 2);
    await driveTutorial(page, tutorialSteps, 0, mid);

    const positions = () =>
      page.evaluate(() => [0, 1, 2, 3, 4].map((n) => window.__dijkstraTest.chestScreenPos(n)));
    const before = await positions();
    const healthBefore = await hook(page, "health");

    // clickRearrange refuses if a scene object is under the button (the click
    // also reaches the game's window-level onClick raycast).
    expect(await clickRearrange(page), "Rearrange button is over a scene object").toBe(true);

    const after = await positions();
    const moved = after.filter((p, n) => Math.hypot(p.x - before[n].x, p.y - before[n].y) > 5);
    expect(moved.length).toBeGreaterThan(0);
    await waitUntilClickable(page);
    expect(await stepIndex(page)).toBe(mid);
    expect(await hook(page, "health")).toBe(healthBefore);

    // Visited chests stay visited; positions are recomputed live by the hook.
    await driveTutorial(page, tutorialSteps, mid, tutorialSteps.length);
    await expectTutorialComplete(page);
  });
});
