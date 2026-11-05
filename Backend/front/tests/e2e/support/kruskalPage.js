// Page helpers for Kruskal.html: the generic room helpers from ./roomPage.js
// bound to the dev-only hook `window.__roomTest` (bottom of src/js/kruskal.js).
// Kruskal's onClick raycasts only edges, so every scene click is an edge click.
import { expect } from "@playwright/test";
import { createRoomPage, POLL, sameEdge } from "./roomPage.js";

export { sameEdge };

const room = createRoomPage({
  gameName: "Kruskal",
  path: "/Kruskal.html",
  hookName: "__roomTest",
  initialCounts: [5, 8], // levelConfig[1]: 5 chests, 8 edges
  tutorialCounts: [4, 5], // createSpecificGraphKruskalTutorial()
});

export const {
  hook,
  hooks,
  stepIndex,
  waitUntilClickable,
  findEdgePoint,
  clickRearrange,
  clickAnyEdge,
  openRoom,
  startTutorial,
  startRegularLevel1,
} = room;

/** Snapshot of the state a Kruskal click can change. */
export const snapshot = (page) =>
  page.evaluate(() => {
    const t = window.__roomTest;
    return {
      step: t.stepIndex(),
      health: t.health(),
      selected: t.selectedEdges(),
      weight: t.currentWeight(),
      hint: t.hintVisible(),
      ui: t.uiText(),
    };
  });

/**
 * Clicks edge (u, v). A click is "registered" when it changed any observable
 * state (step, health, selection, #UI-Text, hint list) - every click on an
 * unselected edge does at least one of those. Pass `registered` to override.
 */
export async function clickEdge(page, u, v, registered) {
  const before = JSON.stringify(await snapshot(page));
  return room.clickEdge(
    page,
    u,
    v,
    registered ?? (async () => JSON.stringify(await snapshot(page)) !== before)
  );
}

/**
 * Settings -> "Restart Level": resetLevel() builds a NEW random graph for the
 * current level (resetScene() runs synchronously inside the click handler).
 */
export async function restartLevel(page, counts = [5, 8] /* level 1 */) {
  await waitUntilClickable(page);
  await page.locator(".settings__icon").click();
  await expect(page.locator(".modal__settings")).toBeVisible();
  await page.locator(".btn__setting__restart").click();
  await expect(page.locator(".modal__settings")).toBeHidden();
  await expect
    .poll(() => hooks(page, ["chestCount", "edgeCount", "health"]), {
      timeout: 90_000,
      message: "restarted level graph never loaded",
    })
    .toEqual([...counts, 4]);
  await waitUntilClickable(page);
}

/** Edge (u, v) of `edges` ([u, v, w][]) normalised for set comparison. */
export const edgeKey = ([u, v]) => (u < v ? `${u}-${v}` : `${v}-${u}`);
export const edgeSet = (edges) => edges.map(edgeKey).sort();

/** Asserts the tutorial-complete modal (updateTutorialModalToBeTutorialCompleteModal). */
export async function expectTutorialCompleteModal(page) {
  const modal = page.locator(".modal__tutorial");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".tutorial__header")).toHaveText("Well done!");
  await expect(modal.locator(".label__tutorial_text")).toContainText("Kruskal");
  await expect(modal.locator(".btn__tutorial__no_or_continue")).toHaveText("Continue");
  await expect(modal.locator(".btn__tutorial__yes")).toBeHidden();
  await expect(page.locator(".tutorial-instructions-modal")).toBeHidden();
  expect(await hook(page, "isTutorial")).toBe(false);
}

/** Hint list item i (0: min weight, 1: no cycle) -> "wrong" | "correct" | "both" | "none". */
export const hintIcon = (page, i) =>
  page.evaluate((i) => {
    const li = document.querySelectorAll(".Hint-Text li")[i];
    const wrong = !li.querySelector("svg:first-child").classList.contains("hidden");
    const correct = !li.querySelector("svg:nth-child(2)").classList.contains("hidden");
    return wrong && correct ? "both" : wrong ? "wrong" : correct ? "correct" : "none";
  }, i);

export { POLL };
