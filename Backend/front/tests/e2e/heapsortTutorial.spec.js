// E2E baseline for the Heapsort tutorial (heapsort.html), driven with real
// mouse drags (DragControls). Helpers live in ./support/heapsortPage.js, state
// is read through the dev-only hook window.__roomTest (bottom of src/js/heapsort.js).
//
// How a tutorial drag works today (controls "dragend" in src/js/heapsort.js):
//   - type "info": the element snaps back with an errorMessage; no advance.
//   - expectedAction === null (legacy): snap back and advance (unused now that
//     the intro is type "info").
//   - otherwise the REAL game check runs (handleStepOnePlacement /
//     handleStepTwoAndThreePlacement). expectedAction is never compared: ANY
//     correct game action advances the tutorial step; a wrong one snaps back
//     and keeps the step, but does not cost a life in the tutorial.
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
const nextButton = (page) => page.locator(".tutorial-instructions-modal .tuto-next-btn");
// Instructions may contain <br>; the page shows them as line breaks.
const plain = (html) => html.replace(/<br>/g, "");
const backButton = (page) => page.locator(".tutorial-instructions-modal .tuto-back-btn");
const resultText = (page) => page.locator(".tutorial-instructions-modal .tuto-result-text");
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
  // A correct move no longer advances by itself: the page shows its result and
  // waits for Next (the last page opens the completion modal instead).
  const advanced = () => hook(page, "stepDone");
  if (tutorialSteps[i].type === "info") {
    await nextButton(page).click();
    await expect.poll(() => stepIndex(page), { message: `step ${i} did not advance` }).toBe(i + 1);
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
  if (tutorialSteps[i].type !== "info") {
    expect(await stepIndex(page)).toBe(i); // still on the page
    await expect(nextButton(page)).toBeVisible();
    if (tutorialSteps[i].result) await expect(resultText(page)).toBeVisible();
    if (last) {
      // The last page shows the sorted array and an End button; End opens the
      // "Well done" modal.
      await expect(nextButton(page)).toHaveText("End");
      await expect(resultText(page)).toContainText("The array is now sorted");
      expect(await hook(page, "completionModalOpen")).toBe(false);
      expect(await hook(page, "isSorted")).toBe(true);
    }
    await nextButton(page).click();
    if (!last) {
      await expect.poll(() => stepIndex(page), { message: `step ${i} did not advance` }).toBe(i + 1);
    }
  }
  if (!last) {
    await expect(instruction(page)).toHaveText(plain(tutorialSteps[i + 1].instruction));
    await expect(resultText(page)).toBeHidden();
  }
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
    await expect(instruction(page)).toHaveText(plain(tutorialSteps[0].instruction));
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
    // Step 0: the intro page; Next advances, nothing is placed.
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

  test("Back returns to the previous page with the tree as it was, on every page", async ({ page }) => {
    const state = async () => {
      const { step, phase, buildIndex, lastUnsorted, expectedSwap, array, tree } = await snapshot(page);
      return { step, phase, buildIndex, lastUnsorted, expectedSwap, array, tree };
    };
    await expect(backButton(page)).toBeHidden(); // nothing before the intro page
    const seen = [];
    for (let i = 0; i < LAST_STEP; i++) {
      seen[i] = await state();
      await driveStep(page, i);
    }
    seen[LAST_STEP] = await state();
    await expect(backButton(page)).toBeVisible();

    // Walk all the way back; every page must show its original text and tree.
    for (let i = LAST_STEP - 1; i >= 0; i--) {
      await backButton(page).click();
      await expect.poll(() => stepIndex(page), { message: `Back to ${i}` }).toBe(i);
      await expect(instruction(page)).toHaveText(plain(tutorialSteps[i].instruction));
      expect(await state(), `state on page ${i} after Back`).toEqual(seen[i]);
      if (i === 0) await expect(backButton(page)).toBeHidden();
      else await expect(backButton(page)).toBeVisible();
    }
    expect(await hook(page, "health")).toBe(4);

    // And the tutorial can still be finished from the intro page.
    await driveSteps(page, 0, 16);
    await expectTutorialCompleteModal(page);
  });

  test("panel order: Instruction first on the intro page, Explanation first after", async ({ page }) => {
    const order = () =>
      page.locator(".tutorial-instructions-modal .code-block").evaluate((pre) =>
        [...pre.querySelectorAll("strong")].map((e) => e.textContent.trim())
      );
    expect(await order()).toEqual(["Instruction:", "Explanation:"]);
    await driveStep(page, 0);
    expect(await order()).toEqual(["Explanation:", "Instruction:"]);
    await backButton(page).click();
    await expect.poll(() => stepIndex(page)).toBe(0);
    expect(await order()).toEqual(["Instruction:", "Explanation:"]);
  });

  test("after a correct move the page shows its result and waits for Next", async ({ page }) => {
    await driveStep(page, 0);
    await driveSteps(page, 1, 6);
    expect(await stepIndex(page)).toBe(6);
    await expect(resultText(page)).toBeHidden();
    await expect(nextButton(page)).toBeHidden();

    const [a, b] = await nextSwap(page);
    await dragSwap(page, a, b, () => hook(page, "stepDone"));
    expect(await stepIndex(page)).toBe(6); // did not advance by itself
    await expect(resultText(page)).toBeVisible();
    await expect(resultText(page)).toContainText("After the swap, the array becomes:");
    await expect(resultText(page)).toContainText("[1, 11, 3, 4, 5]");
    await expect(nextButton(page)).toBeVisible();

    // Another drag on this page snaps back: the move is already made.
    const before = await hook(page, "arrayValues");
    await dragSwap(page, 0, 1, () => hook(page, "uiText").then((t) => t === "Press Next to continue."));
    expect(await hook(page, "arrayValues")).toEqual(before);

    await nextButton(page).click();
    await expect.poll(() => stepIndex(page)).toBe(7);
    await expect(resultText(page)).toBeHidden();
    await expect(nextButton(page)).toBeHidden();
  });

  test("Back sits on the left and Next on the right of the panel", async ({ page }) => {
    await driveStep(page, 0);
    const box = async (loc) => loc.boundingBox();
    const modal = await box(page.locator(".tutorial-instructions-modal"));
    const mid = modal.x + modal.width / 2;
    // Page 1: only Back is shown (left half).
    expect((await box(backButton(page))).x).toBeLessThan(mid);
    await driveSteps(page, 1, 2);
    // Page 2 after its move: Back and Next are both shown.
    await dragTo(page, 1, 1, () => hook(page, "stepDone"));
    await expect(nextButton(page)).toBeVisible();
    await expect(backButton(page)).toBeVisible();
    const back = await box(backButton(page));
    const next = await box(nextButton(page));
    expect(back.x).toBeLessThan(mid);
    expect(next.x).toBeGreaterThan(mid);
    expect(back.x).toBeLessThan(next.x);
  });

  test("starts on the intro page with a Next button", async ({ page }) => {
    expect(tutorialSteps[0].type).toBe("info");
    await expect(nextButton(page)).toBeVisible();
    await expect(page.locator(".tuto-explanation-text")).toContainText("Click for help");
  });

  test("dragging on the intro page snaps back without advancing or costing a life", async ({ page }) => {
    await dragTo(page, 0, 0, async () => (await hook(page, "uiText")) === tutorialSteps[0].errorMessage);
    await page.waitForTimeout(1_000);
    expect(await snapshot(page)).toMatchObject({
      step: 0,
      health: 4,
      buildIndex: 0,
      tree: [null, null, null, null, null],
    });
    await expect(nextButton(page)).toBeVisible();
    await driveStep(page, 0);
    await expect(nextButton(page)).toBeHidden();
  });

  test("wrong placement in the build phase keeps the step and costs no life", async ({ page }) => {
    await driveStep(page, 0);

    // Right slot, wrong turn (index 1 before index 0).
    await dragTo(page, 1, 1);
    expect(await snapshot(page)).toMatchObject({
      step: 1,
      health: 4,
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
      health: 4,
      buildIndex: 0,
      tree: [null, null, null, null, null],
    });
    await expect(uiText(page)).toHaveText(
      "Wrong Move! Iterate through the array and add each element from left to right at each level, starting from the top and moving down to correctly build the heap!"
    );

    // The tutorial goes on.
    await driveStep(page, 1);
    expect(await snapshot(page)).toMatchObject({ step: 2, health: 4, buildIndex: 1 });
    await expect(uiText(page)).toHaveText("Correct! Node 0 is correctly placed.");
  });

  test("wrong swap in the heapify phase keeps the step and costs no life", async ({ page }) => {
    await driveSteps(page, 0, 6);
    expect(await snapshot(page)).toMatchObject({ step: 6, phase: 1, health: 4 });

    // 5 (index 1) <-> 4 (index 3): the parent is already larger than that child.
    await dragSwap(page, 1, 3);
    expect(await snapshot(page)).toMatchObject({
      step: 6,
      health: 4,
      phase: 1,
      array: TUTORIAL_ARRAY, // snapped back, nothing swapped
      tree: TUTORIAL_ARRAY,
      expectedSwap: [1, 4],
    });
    await expect(uiText(page)).toHaveText(
      "Wrong Move! There's no need to swap if the parent node is larger than the child"
    );

    await driveStep(page, 6);
    expect(await snapshot(page)).toMatchObject({ step: 7, health: 4, array: [1, 11, 3, 4, 5] });
  });
});
