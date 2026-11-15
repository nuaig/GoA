import { describe, test, expect } from "vitest";
import { tutorialSteps } from "../../src/js/heapsortTutorialSteps.js";

const ARRAY = [1, 5, 3, 4, 11]; // heapsort.js: generateArray([1, 5, 3, 4, 11])

/**
 * Reference heap sort that records every action the player makes:
 * placing each array value into the tree (index order), then every swap of
 * the heapify phase and the sort phase, as pairs of VALUES.
 */
function referenceActions(input) {
  const a = [...input];
  const place = a.map((v) => [v]);
  const heapify = [];
  const sort = [];
  const siftDown = (i, size, log) => {
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let big = i;
      if (l < size && a[l] > a[big]) big = l;
      if (r < size && a[r] > a[big]) big = r;
      if (big === i) return;
      log.push([a[i], a[big]]);
      [a[i], a[big]] = [a[big], a[i]];
      i = big;
    }
  };
  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) siftDown(i, a.length, heapify);
  const maxHeap = [...a];
  for (let end = a.length - 1; end > 0; end--) {
    sort.push([a[0], a[end]]);
    [a[0], a[end]] = [a[end], a[0]];
    siftDown(0, end, sort);
  }
  return { place, heapify, sort, maxHeap, sorted: a };
}

const actionSteps = () => tutorialSteps.filter((s) => s.type !== "info" && s.expectedAction);
const sameValues = (x, y) => [...x].sort((p, q) => p - q).join() === [...y].sort((p, q) => p - q).join();

describe("Heapsort tutorial array", () => {
  test("builds the max heap [11, 5, 3, 4, 1] and sorts to [1, 3, 4, 5, 11]", () => {
    const ref = referenceActions(ARRAY);
    expect(ref.maxHeap).toEqual([11, 5, 3, 4, 1]);
    expect(ref.sorted).toEqual([1, 3, 4, 5, 11]);
  });
});

describe("Heapsort tutorialSteps structure", () => {
  test("every step has an instruction and an explanation", () => {
    for (const step of tutorialSteps) {
      expect(typeof step.instruction).toBe("string");
      expect(step.instruction.length).toBeGreaterThan(0);
      expect(typeof step.explanation).toBe("string");
      expect(step.explanation.length).toBeGreaterThan(0);
    }
  });

  test("the first step accepts any drag (no specific action)", () => {
    expect(tutorialSteps[0].expectedAction).toBeNull();
  });
});

describe("Heapsort tutorialSteps follow a real heap sort", () => {
  test("placements, heapify swaps and sort swaps match the reference, in order", () => {
    const ref = referenceActions(ARRAY);
    const expected = [...ref.place, ...ref.heapify, ...ref.sort];
    const actual = actionSteps().map((s) => s.expectedAction);
    expect(actual).toHaveLength(expected.length);
    actual.forEach((action, i) => {
      expect(sameValues(action, expected[i]), `action ${i}: ${action} vs ${expected[i]}`).toBe(true);
    });
  });

  test("each instruction names the values of its action", () => {
    for (const step of actionSteps()) {
      for (const value of step.expectedAction) {
        expect(step.instruction, step.instruction).toMatch(new RegExp(`\\b${value}\\b`));
      }
    }
  });
});
