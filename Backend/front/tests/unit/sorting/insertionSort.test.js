// Characterization tests for utils/SortingRelated/insertionSort.js
// InsertionSortAlgorithm is not imported by any page script today; the module also runs a
// demo at import time (lines 53-81) that logs to the console.
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

let InsertionSortAlgorithm;
let importLogs;

beforeAll(async () => {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {});
  ({ InsertionSortAlgorithm } = await import(
    "../../../utils/SortingRelated/insertionSort.js"
  ));
  importLogs = spy.mock.calls.map((c) => c);
  spy.mockRestore();
});

/** Always performs the only swap checkSwap accepts, until complete or rejected. */
function drive(sorter, maxSteps = 1000) {
  const swaps = [];
  while (!sorter.isComplete() && swaps.length < maxSteps) {
    const i = sorter.innerIndex;
    if (!sorter.checkSwap(i, i + 1)) return { swaps, stuck: true };
    swaps.push([i, i + 1]);
  }
  return { swaps, stuck: false };
}

describe("module side effects", () => {
  it("runs the built-in demo on import and logs its (stuck) final array", () => {
    // NOTE: current behavior, possibly a bug: demo code at module scope (insertionSort.js:53-81)
    // runs on every import. Its own scripted swaps do not finish because the algorithm
    // cannot advance past 9 (already in place), see the "stuck" tests below.
    expect(importLogs[0]).toEqual(["Swap 1 with 2: Incorrect swap."]);
    expect(importLogs[2]).toEqual(["Swap 0 with 1: Correct swap!"]);
    expect(importLogs.at(-1)).toEqual(["Final sorted array:", [2, 5, 9, 1, 5, 6]]);
  });
});

describe("InsertionSortAlgorithm", () => {
  describe("constructor", () => {
    it("copies the input and initializes the cursor at index 1", () => {
      const input = [5, 2, 9];
      const s = new InsertionSortAlgorithm(input);
      expect(s.array).toEqual([5, 2, 9]);
      expect(s.array).not.toBe(input);
      expect(s.currentIndex).toBe(1);
      expect(s.currentValue).toBe(2);
      expect(s.innerIndex).toBe(0);
    });

    it("empty array: currentValue undefined and already complete", () => {
      const s = new InsertionSortAlgorithm([]);
      expect(s.currentValue).toBeUndefined();
      expect(s.isComplete()).toBe(true);
      expect(s.getArray()).toEqual([]);
    });

    it("single element: already complete", () => {
      const s = new InsertionSortAlgorithm([42]);
      expect(s.isComplete()).toBe(true);
      expect(s.getArray()).toEqual([42]);
    });

    it("does not mutate the input array when sorting", () => {
      const input = [2, 1];
      const s = new InsertionSortAlgorithm(input);
      s.checkSwap(0, 1);
      expect(input).toEqual([2, 1]);
      expect(s.getArray()).toEqual([1, 2]);
    });
  });

  describe("getArray", () => {
    it("returns a copy", () => {
      const s = new InsertionSortAlgorithm([3, 1]);
      const a = s.getArray();
      a[0] = 99;
      expect(s.getArray()).toEqual([3, 1]);
    });
  });

  describe("checkSwap", () => {
    it("accepts only (innerIndex, innerIndex + 1) when left > right, and swaps", () => {
      const s = new InsertionSortAlgorithm([2, 1]);
      expect(s.checkSwap(0, 1)).toBe(true);
      expect(s.getArray()).toEqual([1, 2]);
      expect(s.isComplete()).toBe(true);
    });

    it("rejects the reversed order (innerIndex + 1, innerIndex)", () => {
      const s = new InsertionSortAlgorithm([2, 1]);
      expect(s.checkSwap(1, 0)).toBe(false);
      expect(s.getArray()).toEqual([2, 1]);
      expect(s.innerIndex).toBe(0);
    });

    it("rejects wrong / out-of-range indices without changing state", () => {
      const s = new InsertionSortAlgorithm([3, 2, 1]);
      expect(s.checkSwap(1, 2)).toBe(false);
      expect(s.checkSwap(-1, 0)).toBe(false);
      expect(s.checkSwap(5, 6)).toBe(false);
      expect(s.checkSwap(0, 2)).toBe(false);
      expect(s.getArray()).toEqual([3, 2, 1]);
      expect([s.currentIndex, s.innerIndex, s.currentValue]).toEqual([1, 0, 2]);
    });

    it("rejects swapping equal values", () => {
      const s = new InsertionSortAlgorithm([2, 2, 1]);
      expect(s.checkSwap(0, 1)).toBe(false);
    });

    it("walks the inner index down while the current value is still out of place", () => {
      const r = new InsertionSortAlgorithm([3, 2, 1]);
      expect(r.checkSwap(0, 1)).toBe(true); // [2,3,1], move on to value 1
      expect([r.currentIndex, r.innerIndex, r.currentValue]).toEqual([2, 1, 1]);
      expect(r.checkSwap(1, 2)).toBe(true); // [2,1,3]
      expect(r.getArray()).toEqual([2, 1, 3]);
      expect([r.currentIndex, r.innerIndex]).toEqual([2, 0]);
      expect(r.isComplete()).toBe(false);
      expect(r.checkSwap(0, 1)).toBe(true); // [1,2,3]
      expect(r.getArray()).toEqual([1, 2, 3]);
      expect(r.isComplete()).toBe(true);
      // currentIndex runs past the end; currentValue/innerIndex are left as they were
      expect([r.currentIndex, r.innerIndex, r.currentValue]).toEqual([3, -1, 1]);
    });

    it("after completion, further swaps are rejected", () => {
      const s = new InsertionSortAlgorithm([2, 1]);
      s.checkSwap(0, 1);
      expect(s.checkSwap(0, 1)).toBe(false);
      expect(s.checkSwap(-1, 0)).toBe(false);
      expect(s.getArray()).toEqual([1, 2]);
    });
  });

  describe("driving the algorithm with the only accepted swap", () => {
    it.each([
      [[2, 1], [1, 2], 1],
      [[3, 2, 1], [1, 2, 3], 3],
      [[4, 3, 2, 1], [1, 2, 3, 4], 6],
      [[5, 4, 3, 2, 1], [1, 2, 3, 4, 5], 10],
      [[-1, -5, -10], [-10, -5, -1], 3],
      [[3, 1, 2], [1, 2, 3], 2],
    ])("%j sorts to %j in %i swaps", (input, expected, swapCount) => {
      const s = new InsertionSortAlgorithm(input);
      const { swaps, stuck } = drive(s);
      expect(stuck).toBe(false);
      expect(s.isComplete()).toBe(true);
      expect(s.getArray()).toEqual(expected);
      expect(swaps).toHaveLength(swapCount);
    });

    it("reverse-sorted [4,3,2,1] uses this exact swap sequence", () => {
      const s = new InsertionSortAlgorithm([4, 3, 2, 1]);
      expect(drive(s).swaps).toEqual([
        [0, 1],
        [1, 2],
        [0, 1],
        [2, 3],
        [1, 2],
        [0, 1],
      ]);
    });

    // NOTE: current behavior, possibly a bug: checkSwap has no way to "advance" when
    // array[currentIndex] is already in place (array[currentIndex-1] <= currentValue).
    // No swap is ever accepted again, so isComplete() stays false forever
    // (insertionSort.js:10-41). This affects already-sorted input, duplicates, and any
    // array where some element is already in place when its turn comes.
    it.each([
      [[1, 2], [1, 2]],
      [[1, 2, 3, 4], [1, 2, 3, 4]],
      [[2, 2], [2, 2]],
      [[2, 2, 1], [2, 2, 1]],
      [[5, 2, 9, 1, 5, 6], [2, 5, 9, 1, 5, 6]],
      [[1, 3, 2], [1, 3, 2]],
      [[2, 3, 1], [2, 3, 1]],
    ])("gets stuck on %j (ends as %j, incomplete)", (input, endState) => {
      const s = new InsertionSortAlgorithm(input);
      const { stuck } = drive(s);
      expect(stuck).toBe(true);
      expect(s.isComplete()).toBe(false);
      expect(s.getArray()).toEqual(endState);
    });
  });
});
