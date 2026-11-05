// Page helpers for Dijkstra.html: the generic room helpers from ./roomPage.js
// bound to the dev-only hook `window.__dijkstraTest` (bottom of
// src/js/dijkstra.js), plus the Dijkstra-specific input dialog and step driver.
import { expect } from "@playwright/test";
import { createRoomPage, POLL } from "./roomPage.js";

export { CAMERA_END, sameEdge } from "./roomPage.js";

const room = createRoomPage({
  gameName: "Dijkstra",
  path: "/Dijkstra.html",
  hookName: "__dijkstraTest",
  initialCounts: [5, 8], // level 1: 5 chests, 8 edges
  tutorialCounts: [5, 7], // createSpecificGraphDijkstraTutorial()
});

export const {
  hook,
  stepIndex,
  waitUntilClickable,
  waitForCameraToSettle,
  findChestPoint,
  findEdgePoint,
  clickRearrange,
  clickAnyEdge,
  openRoom,
  startTutorial,
  startRegularLevel1,
} = room;

/** Clicks chest `node`; `registered` defaults to "chest got opened". */
export const clickChest = (page, node, registered) =>
  room.clickChest(page, node, registered ?? (() => hook(page, "isChestOpened", node)));

/** Clicks edge (u, v); `registered` defaults to "input dialog opened". */
export const clickEdge = (page, u, v, registered) =>
  room.clickEdge(page, u, v, registered ?? (() => page.locator("#input-dialog").isVisible()));

/**
 * Types into the open input dialog and submits with OK (default) or Enter.
 * showInputDialog() focuses the input; after a wrong answer submitted with OK
 * the focus stays on the OK button, so pass { refocus: true } to click into
 * the input first (as a user would).
 */
export async function submitDialog(page, value, { submit = "ok", refocus = false } = {}) {
  const input = page.locator("#dialog-input");
  if (refocus) await input.click();
  await expect(input).toBeFocused();
  await input.fill("");
  await input.pressSequentially(String(value));
  if (submit === "enter") await input.press("Enter");
  else await page.locator("#dialog-ok-btn").click();
}

// ---------------------------------------------------------------- step driver

/**
 * Performs one tutorial step and asserts the step index advanced.
 *   - type: "info"   -> click `.tutorial-instructions-modal .tuto-next-btn`
 *   - expectedChests -> click the (first) expected chest
 *   - expectedEdges  -> click the edge, type updatedDistance, OK (or Enter)
 */
export async function driveTutorialStep(page, step, index, { submit = "ok" } = {}) {
  expect(await stepIndex(page)).toBe(index);

  if (step.type === "info") {
    await page.locator(".tutorial-instructions-modal .tuto-next-btn").click();
  } else if (Array.isArray(step.expectedChests)) {
    await clickChest(page, step.expectedChests[0]);
  } else if (Array.isArray(step.expectedEdges)) {
    const [u, v] = step.expectedEdges[0];
    await clickEdge(page, u, v);
    const [node, value] = Object.entries(step.updatedDistance)[0];
    await submitDialog(page, value, { submit });
    await expect(page.locator("#input-dialog")).toBeHidden();
    await expect(page.locator(`#distance-${node}`)).toHaveText(String(value));
  } else {
    throw new Error(`Unknown step shape at index ${index}: ${JSON.stringify(step)}`);
  }

  // Chest steps advance via setTimeout(nextTutorialStep, 500); edge steps immediately.
  await expect
    .poll(() => stepIndex(page), { ...POLL, message: `step ${index} did not advance` })
    .toBe(index + 1);
}

/** Drives tutorial steps [from, to). */
export async function driveTutorial(page, steps, from, to, opts) {
  for (let i = from; i < to; i++) await driveTutorialStep(page, steps[i], i, opts);
}
