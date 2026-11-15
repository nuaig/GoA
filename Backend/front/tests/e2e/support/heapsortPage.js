// Page helpers for heapsort.html: the generic room helpers from ./roomPage.js
// bound to the dev-only hook `window.__roomTest` (bottom of src/js/heapsort.js),
// plus a drag driver. Every scene interaction is a REAL mouse drag
// (page.mouse.down / move / up) handled by the game's DragControls over
// `instancedObjects` (tree-node text meshes + their invisible planes).
//
// A drag picks up tree element i at its screen centre (before the build phase
// places it, it stands on top of array cell i) and drops it on slot j. The
// drop point is slot j projected at the depth of the grabbed object, so the
// game's findClosestDebossedIndex() (0.7 threshold) resolves exactly slot j.
// In the build phase that is a placement; afterwards findClosestDebossedIndex
// skips the dragged index and the slot j is the swap partner.
import { expect } from "@playwright/test";
import { createRoomPage, POLL, note } from "./roomPage.js";

export { POLL, note };

export const TUTORIAL_ARRAY = [1, 5, 3, 4, 11]; // startTutorial callback, src/js/heapsort.js
export const LEVEL1_SIZE = 6; // levels[0] in src/js/heapsort.js
export const CAMERA_END_HS = [0, 2, 10]; // initialCameraAnimationGSAP_HS() end position

const room = createRoomPage({
  gameName: "Heapsort",
  path: "/heapsort.html",
  hookName: "__roomTest",
  initialCounts: [LEVEL1_SIZE, LEVEL1_SIZE], // random level-1 array + its slots
  tutorialCounts: [TUTORIAL_ARRAY.length, TUTORIAL_ARRAY.length],
  countHooks: ["arrayCount", "slotCount"],
  cameraEnd: CAMERA_END_HS,
});

export const {
  hook,
  hooks,
  stepIndex,
  waitUntilClickable,
  openRoom,
  startTutorial,
  startRegularLevel1,
} = room;

/** Snapshot of everything a drag can change. */
export const snapshot = (page) =>
  page.evaluate(() => {
    const t = window.__roomTest;
    return {
      step: t.stepIndex(),
      health: t.health(),
      score: t.score(),
      phase: t.phase(),
      buildIndex: t.buildIndex(),
      lastUnsorted: t.lastUnsortedIndex(),
      expectedSwap: t.expectedSwap(),
      array: t.arrayValues(),
      tree: t.treeValues(),
      ui: t.uiText(),
    };
  });

function inViewport(page, p) {
  const vp = page.viewportSize();
  return p.x >= 1 && p.y >= 1 && p.x <= vp.width - 1 && p.y <= vp.height - 1;
}

/** True when (x, y) is on the canvas itself (DragControls listens on it). */
const onCanvas = (page, { x, y }) =>
  page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName === "CANVAS", { x, y });

/** A start point that DragControls resolves to tree element `index`, plus the grabbed depth. */
async function findGrabPoint(page, index) {
  const c = await hook(page, "treeElementScreenPos", index);
  if (!c) return null;
  const offsets = [[0, 0], [0, 4], [0, -4], [4, 0], [-4, 0], [6, 6], [-6, 6], [6, -6], [-6, -6]];
  for (const [dx, dy] of offsets) {
    const p = { x: c.x + dx, y: c.y + dy };
    if (!inViewport(page, p)) continue;
    const hit = await hook(page, "pickAt", p.x, p.y);
    if (hit?.index === index && (await onCanvas(page, p))) return { ...p, z: hit.z, kind: hit.kind };
  }
  return null;
}

/**
 * Drags tree element `index` onto slot `slot` with a real mouse drag and waits
 * for `registered()`. Default "registered": any observable state changed.
 * A drag that changed nothing (e.g. DragControls missed the pointerdown) is
 * retried; a drag that changed state but not as `registered` wants is NOT
 * retried (that would stack a second action), it fails.
 */
export async function dragTo(page, index, slot, registered) {
  const what = `element ${index} -> slot ${slot}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    await waitUntilClickable(page);
    const before = JSON.stringify(await snapshot(page));
    const from = await findGrabPoint(page, index);
    if (!from) throw new Error(`no grab point for ${what}`);
    const to = await hook(page, "slotScreenPos", slot, from.z);
    if (!to || !inViewport(page, to) || !(await onCanvas(page, to))) {
      throw new Error(`slot ${slot} not reachable on the canvas: ${JSON.stringify(to)}`);
    }
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
    const changed = async () => JSON.stringify(await snapshot(page)) !== before;
    try {
      await expect.poll(registered ?? changed, { ...POLL, timeout: 3_000 }).toBe(true);
      return;
    } catch {
      if (await changed()) {
        throw new Error(`${what} changed the state but was not registered as expected`);
      }
      note("retry", `${what} drag not registered (from ${JSON.stringify(from)})`);
    }
  }
  throw new Error(`Could not drag ${what}`);
}

/** Swap tree elements a and b (drag a onto b's slot). */
export const dragSwap = (page, a, b, registered) => dragTo(page, a, b, registered);

/** Asserts the tutorial-complete modal (updateTutorialModalToBeTutorialCompleteModal). */
export async function expectTutorialCompleteModal(page) {
  const modal = page.locator(".modal__tutorial");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".tutorial__header")).toHaveText("Well done!");
  await expect(modal.locator(".label__tutorial_text")).toContainText("Heapsort");
  await expect(modal.locator(".btn__tutorial__no_or_continue")).toHaveText("Continue");
  await expect(modal.locator(".btn__tutorial__yes")).toBeHidden();
  await expect(page.locator(".tutorial-instructions-modal")).toBeHidden();
  expect(await hook(page, "isTutorial")).toBe(false);
}

/**
 * Reference heap sort: the list of actions a perfect player performs on `arr`.
 * {type: "place", index} for the build phase, {type: "swap", a, b, phase}
 * (a < b) for heapify (phase 1) and sort (phase 2). Stops as soon as the array
 * is sorted during the sort phase (the game's arraySorted() completion check).
 */
export function referenceActions(arr) {
  const a = [...arr];
  const n = a.length;
  const actions = a.map((_, index) => ({ type: "place", index }));
  const siftDown = (i, size, phase) => {
    for (;;) {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < size && a[l] > a[largest]) largest = l;
      if (r < size && a[r] > a[largest]) largest = r;
      if (largest === i) return;
      [a[i], a[largest]] = [a[largest], a[i]];
      actions.push({ type: "swap", a: i, b: largest, phase });
      if (phase === 2 && isSorted()) throw SORTED;
      i = largest;
    }
  };
  const SORTED = Symbol("sorted");
  const isSorted = () => a.every((v, i) => i === 0 || a[i - 1] <= v);
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(i, n, 1);
  try {
    for (let end = n - 1; end > 0; end--) {
      [a[0], a[end]] = [a[end], a[0]];
      actions.push({ type: "swap", a: 0, b: end, phase: 2 });
      if (isSorted()) break;
      siftDown(0, end, 2);
    }
  } catch (e) {
    if (e !== SORTED) throw e;
  }
  return { actions, sorted: a };
}
