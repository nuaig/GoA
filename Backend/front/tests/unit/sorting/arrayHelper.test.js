// Characterization tests for generateRandomArray in utils/HeapSort-Related/arrayHelper.js.
// src/js/heapsort.js calls it as generateRandomArray(curlvlNodesNum, 1, 99).
// (Importing the module pulls in three + TextGeometry/FontLoader; that works in node.)
import { describe, it, expect, vi, afterEach } from "vitest";
import { generateRandomArray } from "../../../utils/HeapSort-Related/arrayHelper.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateRandomArray", () => {
  it("returns an array of the requested length (heapsort level sizes)", () => {
    for (const size of [1, 3, 5, 7, 10, 15]) {
      expect(generateRandomArray(size, 1, 99)).toHaveLength(size);
    }
  });

  it("size 0 -> []", () => {
    expect(generateRandomArray(0, 1, 99)).toEqual([]);
  });

  it("negative size -> []", () => {
    expect(generateRandomArray(-3, 1, 99)).toEqual([]);
  });

  it("fractional size rounds up (loop runs while i < size)", () => {
    expect(generateRandomArray(2.5, 1, 99)).toHaveLength(3);
  });

  it("returns a new array each call", () => {
    const a = generateRandomArray(3, 1, 99);
    const b = generateRandomArray(3, 1, 99);
    expect(a).not.toBe(b);
  });

  it("over 2000 runs: every value is an integer within [1, 99] inclusive", () => {
    const seen = new Set();
    for (let run = 0; run < 2000; run++) {
      const arr = generateRandomArray(7, 1, 99);
      expect(arr).toHaveLength(7);
      for (const x of arr) {
        expect(Number.isInteger(x)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(1);
        expect(x).toBeLessThanOrEqual(99);
        seen.add(x);
      }
    }
    // 14000 draws over 99 values: all values should appear
    expect(seen.size).toBe(99);
  });

  it("negative ranges stay within bounds", () => {
    for (let run = 0; run < 500; run++) {
      for (const x of generateRandomArray(5, -10, -5)) {
        expect(Number.isInteger(x)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(-10);
        expect(x).toBeLessThanOrEqual(-5);
      }
    }
  });

  it("maps Math.random() as floor(r * (max - min + 1)) + min (both bounds reachable)", () => {
    const seq = [0, 0.5, 0.999999, 0.01];
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => seq[i++]);
    expect(generateRandomArray(4, 1, 99)).toEqual([1, 50, 99, 1]);
    expect(Math.random).toHaveBeenCalledTimes(4);
  });

  it("min === max -> every value equals min", () => {
    expect(generateRandomArray(5, 7, 7)).toEqual([7, 7, 7, 7, 7]);
  });

  it("swapped bounds (min > max) are not validated and yield values in [max+1, min]", () => {
    // NOTE: current behavior, possibly a bug: no guard for min > max (arrayHelper.js:131-137).
    // With (min=10, max=1): floor(r * -8) + 10 ranges over 2..10.
    const seq = [0, 0.999999];
    let i = 0;
    vi.spyOn(Math, "random").mockImplementation(() => seq[i++]);
    expect(generateRandomArray(2, 10, 1)).toEqual([10, 2]);
  });

  it("fractional bounds can produce non-integers", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(generateRandomArray(1, 0.5, 3)).toEqual([0.5]);
  });

  it("can contain duplicates", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    expect(generateRandomArray(3, 1, 99)).toEqual([25, 25, 25]);
  });
});
