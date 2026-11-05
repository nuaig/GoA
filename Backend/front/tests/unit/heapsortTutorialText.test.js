// Checks that the arrays shown to the player in the Heapsort tutorial text
// match a real heap sort of [1, 5, 3, 4, 11], including where the heap ends.
import { describe, test, expect } from "vitest";
import { tutorialSteps } from "../../src/js/heapsortTutorialSteps.js";

const ARRAY = [1, 5, 3, 4, 11];

/** Array text after every swap, e.g. "[1, 5, 3, 4 | 11]" once sorting starts. */
function referenceSwapStates(input) {
  const a = [...input];
  const states = [];
  const show = (heapSize) =>
    heapSize >= a.length
      ? `[${a.join(", ")}]`
      : `[${a.slice(0, heapSize).join(", ")} | ${a.slice(heapSize).join(", ")}]`;
  const swap = (i, j, heapSize) => {
    [a[i], a[j]] = [a[j], a[i]];
    states.push(show(heapSize));
  };
  const siftDown = (i, size) => {
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let big = i;
      if (l < size && a[l] > a[big]) big = l;
      if (r < size && a[r] > a[big]) big = r;
      if (big === i) return;
      swap(i, big, size === a.length ? a.length : size);
      i = big;
    }
  };
  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) siftDown(i, a.length);
  for (let end = a.length - 1; end > 0; end--) {
    swap(0, end, end);
    siftDown(0, end);
  }
  return states;
}

const swapSteps = tutorialSteps.filter((s) => Array.isArray(s.expectedAction) && s.expectedAction.length === 2);
const placeSteps = tutorialSteps.filter((s) => Array.isArray(s.expectedAction) && s.expectedAction.length === 1);

test("the intro page is an info page that names the array and the 3 phases", () => {
  const intro = tutorialSteps[0];
  expect(intro.type).toBe("info");
  expect(intro.explanation).toContain(`[${ARRAY.join(", ")}]`);
  expect(intro.explanation).toContain("2i + 1");
  expect(intro.explanation).toContain("2i + 2");
});

test("no markdown markers are shown to the player", () => {
  for (const step of tutorialSteps) {
    expect(`${step.instruction} ${step.explanation}`).not.toContain("**");
  }
});

test("step numbers count 1..n without gaps", () => {
  const numbers = tutorialSteps
    .filter((s) => s.type !== "info")
    .map((s) => Number(s.instruction.match(/^Step (\d+):/)?.[1]));
  expect(numbers).toEqual(numbers.map((_, i) => i + 1));
});

describe("build phase places values in index order with the right child formulas", () => {
  placeSteps.forEach((step, index) => {
    test(`place ${ARRAY[index]} (index ${index})`, () => {
      expect(step.expectedAction).toEqual([ARRAY[index]]);
      expect(step.instruction).toContain(`${ARRAY[index]} (index ${index})`);
      if (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        const side = index === 2 * parent + 1 ? "left" : "right";
        expect(step.instruction).toContain(`${side} child of ${ARRAY[parent]}`);
        const formula = side === "left" ? `2·${parent} + 1 = ${index}` : `2·${parent} + 2 = ${index}`;
        expect(step.explanation).toContain(formula);
      }
    });
  });
});

describe("every swap step shows the array after the swap", () => {
  const states = referenceSwapStates(ARRAY);

  test("there is one swap step per swap of a real heap sort", () => {
    expect(swapSteps).toHaveLength(states.length);
  });

  swapSteps.forEach((step, i) => {
    test(`swap ${step.expectedAction.join(" and ")} → ${states[i]}`, () => {
      expect(step.explanation).toContain(`Array: ${states[i]}`);
    });
  });
});
