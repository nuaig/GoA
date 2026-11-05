// E2E baseline for the Heapsort tutorial (heapsort.html), driven with real
// mouse drags (DragControls). Helpers live in ./support/heapsortPage.js, state
// is read through the dev-only hook window.__roomTest (bottom of src/js/heapsort.js).
//
// How a tutorial drag works today (controls "dragend" in src/js/heapsort.js):
//   - step with expectedAction === null (step 0): the element snaps back,
//     nextTutorialStep() and RETURN - the real game check does not run;
//   - otherwise the REAL game check runs (handleStepOnePlacement /
//     handleStepTwoAndThreePlacement). expectedAction is never compared: ANY
//     correct game action advances the tutorial step, a wrong one costs a life
//     (decrementHealth runs in the tutorial too) and the step stays.
// Each test gets a fresh page (Playwright default).
import { test, expect } from "@playwright/test";
import { tutorialSteps } from "../../src/js/heapsortTutorialSteps.js";
import {
  hook,
  stepIndex,
  openRoom,
  startTutorial,
  dragTo,
  dragSwap,
  snapshot,
  expectTutorialCompleteModal,
  TUTORIAL_ARRAY,
} from "./support/heapsortPage.js";

const BUILD_STEPS = [1, 2, 3, 4, 5];
const HEAPIFY_STEPS = [6, 7, 8];
const SORT_STEPS = [9, 10, 11, 12, 13, 14, 15];
const LAST_STEP = tutorialSteps.length - 1;

const instruction = (page) => page.locator(".tutorial-instructions-modal .tuto-instruction-text");
const uiText = (page) => page.locator("#UI-Text");
const sameValues = (a, b) => [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join();

/** The swap (indices, a < b) the game accepts next, as the hook reports it. */
async function nextSwap(page) {
  const { phase, expectedSwap, lastUnsorted } = await snapshot(page);
  // Sort phase with no pending reheapify swap: root <-> last unsorted (checkAndHandleSwap).
  if (phase === 2 && expectedSwap === null) return [0, lastUnsorted - 1];
  return expectedSwap;
}

/** Performs the intended action of tutorial step i and asserts the step advanced. */
async function driveStep(page, i) {
  expect(await stepIndex(page)).toBe(i);
  const last = i === LAST_STEP;
  // Registered only once the step advanced (the last step cannot advance:
  // the sorted array is the signal), so a missed drag is retried.
  const advanced = last
    ? () => hook(page, "isSorted")
    : async () => (await stepIndex(page)) === i + 1;
  if (i === 0) {
    await dragTo(page, 0, 0, advanced);
  } else if (BUILD_STEPS.includes(i)) {
    const index = i - 1;
    expect(await hook(page, "buildIndex")).toBe(index);
    expect(tutorialSteps[i].expectedAction).toEqual([TUTORIAL_ARRAY[index]]);
    await dragTo(page, index, index, advanced);
    expect((await hook(page, "treeValues"))[index]).toBe(TUTORIAL_ARRAY[index]);
  } else {
    const [a, b] = await nextSwap(page);
    const before = await hook(page, "arrayValues");
    // The game's next swap is the one the step text describes.
    expect(sameValues([before[a], before[b]], tutorialSteps[i].expectedAction)).toBe(true);
    await dragSwap(page, a, b, advanced);
    const after = await hook(page, "arrayValues");
    [before[a], before[b]] = [before[b], before[a]];
    expect(after).toEqual(before);
  }
  if (!last) await expect(instruction(page)).toHaveText(tutorialSteps[i + 1].instruction);
}

async function driveSteps(page, from, to) {
  for (let i = from; i < to; i++) await driveStep(page, i);
}

test.describe("Heapsort tutorial", () => {
  let errors;

  test.beforeEach(async ({ page }) => {
    ({ errors } = await openRoom(page));
    await startTutorial(page);
  });

  test.afterEach(() => {
    expect(errors, "uncaught page errors").toEqual([]);
  });

  test("page uses the extracted tutorial steps", async ({ page }) => {
    expect(await hook(page, "tutorialSteps")).toEqual(tutorialSteps);
    expect(tutorialSteps).toHaveLength(16);
    expect(tutorialSteps[0].expectedAction).toBeNull();
    await expect(instruction(page)).toHaveText(tutorialSteps[0].instruction);
    const s = await snapshot(page);
    expect(s).toMatchObject({
      step: 0,
      health: 4,
      phase: 0,
      buildIndex: 0,
      array: TUTORIAL_ARRAY,
      tree: [null, null, null, null, null],
    });
  });

  test("full tutorial with real drags ends at the tutorial-complete modal", async ({ page }) => {
    // Step 0: a drag even onto the matching slot only snaps back and advances.
    await driveStep(page, 0);
    expect(await snapshot(page)).toMatchObject({
      step: 1,
      health: 4,
      phase: 0,
      buildIndex: 0,
      tree: [null, null, null, null, null],
    });

    await driveSteps(page, 1, 6);
    expect(await snapshot(page)).toMatchObject({
      step: 6,
      health: 4,
      phase: 1, // all 5 placed -> advanceStep()
      array: TUTORIAL_ARRAY,
      tree: TUTORIAL_ARRAY,
      expectedSwap: [1, 4], // 5 <-> 11
    });

    await driveSteps(page, 6, 9);
    expect(await snapshot(page)).toMatchObject({
      step: 9,
      health: 4,
      phase: 2, // max heap -> advanceStep()
      array: [11, 5, 3, 4, 1],
      expectedSwap: null,
      lastUnsorted: 5,
    });
    expect(await hook(page, "isMaxHeap")).toBe(true);

    await driveSteps(page, 9, 16);
    await expectTutorialCompleteModal(page);
    const end = await snapshot(page);
    expect(end).toMatchObject({
      step: LAST_STEP, // nextTutorialStep() stops at the last step
      health: 4,
      phase: 2, // the tutorial completion RETURNs before advanceStep()
      array: [1, 3, 4, 5, 11],
      tree: [1, 3, 4, 5, 11],
      lastUnsorted: 1,
    });
    expect(await hook(page, "currentLevel")).toBeNull(); // set to null on tutorial completion
    expect(await hook(page, "completionModalOpen")).toBe(false);
    expect(BUILD_STEPS.length + HEAPIFY_STEPS.length + SORT_STEPS.length + 1).toBe(16);
  });

  test("wrong placement in the build phase costs a life and keeps the step", async ({ page }) => {
    await driveStep(page, 0);

    // Right slot, wrong turn (index 1 before index 0).
    await dragTo(page, 1, 1);
    expect(await snapshot(page)).toMatchObject({
      step: 1,
      health: 3, // decrementHealth() also in the tutorial
      buildIndex: 0,
      tree: [null, null, null, null, null],
    });
    await expect(uiText(page)).toHaveText(
      "Wrong Move! Please check if there are any remaining nodes to the left of this node."
    );

    // Right turn, wrong slot.
    await dragTo(page, 0, 2);
    expect(await snapshot(page)).toMatchObject({
      step: 1,
      health: 2,
      buildIndex: 0,
      tree: [null, null, null, null, null],
    });
    await expect(uiText(page)).toHaveText(
      "Wrong Move! Iterate through the array and add each element from left to right at each level, starting from the top and moving down to correctly build the heap!"
    );

    // The tutorial goes on.
    await driveStep(page, 1);
    expect(await snapshot(page)).toMatchObject({ step: 2, health: 2, buildIndex: 1 });
    await expect(uiText(page)).toHaveText("Correct! Node 0 is correctly swapped.");
  });

  test("wrong swap in the heapify phase costs a life and keeps the step", async ({ page }) => {
    await driveSteps(page, 0, 6);
    expect(await snapshot(page)).toMatchObject({ step: 6, phase: 1, health: 4 });

    // 5 (index 1) <-> 4 (index 3): the parent is already larger than that child.
    await dragSwap(page, 1, 3);
    expect(await snapshot(page)).toMatchObject({
      step: 6,
      health: 3,
      phase: 1,
      array: TUTORIAL_ARRAY, // snapped back, nothing swapped
      tree: TUTORIAL_ARRAY,
      expectedSwap: [1, 4],
    });
    await expect(uiText(page)).toHaveText(
      "Wrong Move! There's no need to swap if the parent node is larger than the child"
    );

    await driveStep(page, 6);
    expect(await snapshot(page)).toMatchObject({ step: 7, health: 3, array: [1, 11, 3, 4, 5] });
  });
});
