// Page helpers for Astar.html: the generic room helpers from ./roomPage.js
// bound to the dev-only hook `window.__roomTest` (bottom of src/js/Astar.js),
// plus the A* input dialog, candidate-decision modal and step driver.
import { expect } from "@playwright/test";
import { createRoomPage, POLL } from "./roomPage.js";

export { CAMERA_END, sameEdge, POLL } from "./roomPage.js";

const room = createRoomPage({
  gameName: "Astar",
  path: "/Astar.html",
  hookName: "__roomTest",
  initialCounts: [5, 8], // levelConfig[1]: 5 chests, 8 edges
  tutorialCounts: [5, 7], // createSpecificGraphAstarTutorial()
});

export const {
  hook,
  hooks,
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
 * Pass { refocus: true } after a wrong answer (focus stays on OK).
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

export const decisionModal = (page) => page.locator("#candidate-decision-modal");
export const decisionButtons = (page) => page.locator("#candidate-decision-buttons button");

/** Numeric values of the candidate-decision buttons, in DOM order. */
export async function decisionValues(page) {
  return (await decisionButtons(page).allTextContents()).map(Number);
}

/** Clicks the decision button with value `value` (or the smallest when omitted). */
export async function chooseCandidate(page, value) {
  await expect(decisionModal(page)).toBeVisible();
  const values = await decisionValues(page);
  const pick = value ?? Math.min(...values);
  const idx = values.findIndex((v) => Math.abs(v - pick) < 0.001);
  expect(idx, `no decision button ${pick} in ${values}`).toBeGreaterThan(-1);
  await decisionButtons(page).nth(idx).click();
}

/**
 * After submitting the input dialog: waits until the dialog is closed or the
 * candidate-decision modal opened; if it opened, picks the smallest value.
 * Returns the decision values shown (or null).
 */
export async function resolveDecisionIfShown(page) {
  const dialog = page.locator("#input-dialog");
  await expect
    .poll(
      async () => (await decisionModal(page).isVisible()) || !(await dialog.isVisible()),
      { ...POLL, message: "input dialog neither closed nor led to a decision" }
    )
    .toBe(true);
  if (!(await decisionModal(page).isVisible())) return null;
  const values = await decisionValues(page);
  await chooseCandidate(page);
  await expect(decisionModal(page)).toBeHidden();
  return values;
}

// ---------------------------------------------------------------- step driver

/**
 * Performs one tutorial step and asserts the step index advanced.
 *   - expectedChests -> click the (first) expected chest
 *   - expectedEdges  -> click the edge, type updatedDistance (f = g + 0), OK;
 *                       resolve the candidate-decision modal if it opens.
 * Returns the decision values shown (or null).
 */
export async function driveTutorialStep(page, step, index, { submit = "ok" } = {}) {
  expect(await stepIndex(page)).toBe(index);
  let decision = null;

  if (Array.isArray(step.expectedChests)) {
    await clickChest(page, step.expectedChests[0]);
  } else if (Array.isArray(step.expectedEdges)) {
    const [u, v] = step.expectedEdges[0];
    await clickEdge(page, u, v);
    const [, value] = Object.entries(step.updatedDistance)[0];
    await submitDialog(page, value, { submit });
    decision = await resolveDecisionIfShown(page);
    await expect(page.locator("#input-dialog")).toBeHidden();
  } else {
    throw new Error(`Unknown step shape at index ${index}: ${JSON.stringify(step)}`);
  }

  await expect
    .poll(() => stepIndex(page), { ...POLL, message: `step ${index} did not advance` })
    .toBe(index + 1);
  return decision;
}

/** Drives tutorial steps [from, to); returns {index: decisionValues} for steps that showed one. */
export async function driveTutorial(page, steps, from, to, opts) {
  const decisions = {};
  for (let i = from; i < to; i++) {
    const d = await driveTutorialStep(page, steps[i], i, opts);
    if (d) decisions[i] = d;
  }
  return decisions;
}
