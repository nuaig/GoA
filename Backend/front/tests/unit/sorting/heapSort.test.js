// Characterization tests for the pure helpers in utils/HeapSort-Related/HeapSort.js.
// In src/js/heapsort.js, `arrayElements` entries are objects built at line ~548
// ({ value, valueTextMesh, treeNodeTextMesh, ... }); these helpers only read `.value`,
// so the tests use `{ value }` fakes. `correctPositions` is a Map<index, THREE.Vector3>.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import {
  arraySorted,
  checkMaxHeapProperties,
  updateNextSwapIndices,
  findClosestDebossedIndex,
} from "../../../utils/HeapSort-Related/HeapSort.js";

const els = (values) => values.map((value) => ({ value }));
const vals = (arr) => arr.map((e) => e.value);

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("arraySorted", () => {
  it.each([
    [[], true],
    [[7], true],
    [[1, 2, 3, 4, 5], true],
    [[1, 1, 1], true],
    [[1, 2, 2, 3], true],
    [[-3, -1, 0, 10], true],
    [[2, 1], false],
    [[5, 4, 3, 2, 1], false],
    [[1, 2, 3, 5, 4], false],
    [[2, 1, 3, 4, 5], false],
    [[1, 3, 2, 4], false],
  ])("%j -> %s", (values, expected) => {
    expect(arraySorted(els(values))).toBe(expected);
  });

  it("checks ascending order (not descending)", () => {
    expect(arraySorted(els([99, 50, 1]))).toBe(false);
  });

  it("does not mutate the input", () => {
    const arr = els([3, 1, 2]);
    arraySorted(arr);
    expect(vals(arr)).toEqual([3, 1, 2]);
  });

  it("missing `.value` compares as undefined (always not-greater) -> true", () => {
    expect(arraySorted([{}, {}])).toBe(true);
    expect(arraySorted([{ value: 5 }, {}])).toBe(true);
  });
});

describe("checkMaxHeapProperties", () => {
  it.each([
    [[], true],
    [[1], true],
    [[2, 1], true],
    [[1, 2], false],
    [[5, 5, 5], true],
    [[9, 5, 8, 1, 2, 7], true],
    [[10, 9, 8, 7, 6, 5, 4], true],
    [[99, 1, 98], true],
    // left child greater than parent
    [[5, 6, 1], false],
    // right child greater than parent
    [[5, 1, 6], false],
    // violation deep in the tree (index 2 -> child 6)
    [[10, 9, 8, 1, 2, 3, 20], false],
    // violation at index 1's left child (index 3)
    [[10, 4, 8, 5], false],
    // sorted ascending is not a max-heap
    [[1, 2, 3, 4, 5], false],
  ])("%j -> %s", (values, expected) => {
    expect(checkMaxHeapProperties(els(values))).toBe(expected);
  });

  it("always considers the whole array (no heap-size parameter)", () => {
    // [3, 2, 1, 10]: index 3 is the left child of index 1 -> violation
    expect(checkMaxHeapProperties(els([3, 2, 1, 10]))).toBe(false);
  });
});

describe("updateNextSwapIndices", () => {
  it.each([0, -1, -10])("lastUnsortedIndex %i -> null (sorting complete)", (n) => {
    expect(updateNextSwapIndices(n, els([1, 2, 3]))).toBeNull();
  });

  it("lastUnsortedIndex 1 -> null (no non-leaf nodes)", () => {
    expect(updateNextSwapIndices(1, els([1, 2, 3]))).toBeNull();
  });

  it("returns null when the first n elements already form a max-heap", () => {
    expect(updateNextSwapIndices(6, els([9, 5, 8, 1, 2, 7]))).toBeNull();
    expect(updateNextSwapIndices(3, els([5, 5, 5]))).toBeNull();
  });

  it("[1, 2] with n=2 -> [0, 1]", () => {
    expect(updateNextSwapIndices(2, els([1, 2]))).toEqual([0, 1]);
  });

  it("picks the larger child; right wins when strictly larger", () => {
    expect(updateNextSwapIndices(3, els([1, 2, 3]))).toEqual([0, 2]);
    expect(updateNextSwapIndices(3, els([1, 3, 2]))).toEqual([0, 1]);
  });

  it("equal children: picks the left child (strict >)", () => {
    expect(updateNextSwapIndices(3, els([1, 4, 4]))).toEqual([0, 1]);
  });

  it("parent equal to a child is not a violation", () => {
    expect(updateNextSwapIndices(3, els([4, 4, 1]))).toBeNull();
  });

  it("scans bottom-up and returns the LAST non-leaf violation first", () => {
    // n=7 -> scans i = 2, 1, 0; i=2 children (5,6) have values 6,7 -> [2, 6]
    expect(updateNextSwapIndices(7, els([1, 2, 3, 4, 5, 6, 7]))).toEqual([2, 6]);
    // only root violated
    expect(updateNextSwapIndices(5, els([1, 5, 2, 3, 4]))).toEqual([0, 1]);
  });

  it("always returns [parent, child] with parent < child", () => {
    const r = updateNextSwapIndices(6, els([0, 10, 20, 30, 40, 50]));
    expect(r[0]).toBeLessThan(r[1]);
    expect(r).toEqual([2, 5]);
  });

  it("ignores elements at or beyond lastUnsortedIndex (the sorted tail)", () => {
    // index 3 (100) is the sorted tail when n=3
    expect(updateNextSwapIndices(3, els([5, 2, 3, 100]))).toBeNull();
    expect(updateNextSwapIndices(3, els([1, 2, 3, 100]))).toEqual([0, 2]);
    // with n=4, the 100 becomes part of the heap
    expect(updateNextSwapIndices(4, els([5, 2, 3, 100]))).toEqual([1, 3]);
  });

  it("does not mutate the input", () => {
    const arr = els([1, 2, 3]);
    updateNextSwapIndices(3, arr);
    expect(vals(arr)).toEqual([1, 2, 3]);
  });

  it("throws when lastUnsortedIndex exceeds the array length", () => {
    expect(() => updateNextSwapIndices(3, els([1, 2]))).toThrow(TypeError);
  });

  describe("driving a full heap sort the way src/js/heapsort.js does", () => {
    function swap(arr, i, j) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    // Mirrors heapsort.js: step 1 (heapify) applies the suggested swaps until null;
    // step 2 swaps root <-> lastUnsortedIndex-1, decrements, then repeats sift-down swaps.
    function simulate(values) {
      const arr = els(values);
      let last = arr.length;
      let swaps = 0;
      let next = updateNextSwapIndices(last, arr);
      while (next) {
        swap(arr, next[0], next[1]);
        swaps++;
        next = updateNextSwapIndices(last, arr);
      }
      const heapAfterBuild = checkMaxHeapProperties(arr);
      while (last > 0) {
        if (next === null) {
          swap(arr, 0, last - 1);
          swaps++;
          last--;
          if (last > 0) next = updateNextSwapIndices(last, arr);
        } else {
          swap(arr, next[0], next[1]);
          swaps++;
          next = updateNextSwapIndices(last, arr);
        }
      }
      return { arr, heapAfterBuild, swaps };
    }

    it.each([
      [[]],
      [[42]],
      [[2, 1]],
      [[1, 2]],
      [[3, 3, 3]],
      [[1, 2, 3, 4, 5, 6, 7]],
      [[7, 6, 5, 4, 3, 2, 1]],
      [[4, 10, 3, 5, 1]],
      [[73, 88, 78, 86]],
      [[5, 1, 5, 1, 5]],
    ])("%j ends sorted and passes through a valid max-heap", (values) => {
      const { arr, heapAfterBuild } = simulate(values);
      expect(heapAfterBuild).toBe(true);
      expect(arraySorted(arr)).toBe(true);
      expect(vals(arr)).toEqual([...values].sort((a, b) => a - b));
    });

    it("[4, 10, 3, 5, 1] produces a heap of [10, 5, 3, 4, 1] after build", () => {
      const arr = els([4, 10, 3, 5, 1]);
      let next = updateNextSwapIndices(5, arr);
      const seen = [];
      while (next) {
        seen.push(next);
        swap(arr, next[0], next[1]);
        next = updateNextSwapIndices(5, arr);
      }
      // i=1 (10 vs 5,1) is fine; i=0 (4 vs 10,3) -> [0,1]; then 4 sinks: (4 vs 5,1) -> [1,3]
      expect(vals(arr)).toEqual([10, 5, 3, 4, 1]);
      expect(seen).toEqual([
        [0, 1],
        [1, 3],
      ]);
    });

    it("sorts 200 pseudo-random arrays of length 1..15 with values 1..99", () => {
      let seed = 12345;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      for (let k = 0; k < 200; k++) {
        const len = 1 + Math.floor(rand() * 15);
        const values = Array.from({ length: len }, () => 1 + Math.floor(rand() * 99));
        const { arr, heapAfterBuild } = simulate(values);
        expect(heapAfterBuild).toBe(true);
        expect(vals(arr)).toEqual([...values].sort((a, b) => a - b));
      }
    });
  });
});

describe("findClosestDebossedIndex", () => {
  const v = (x, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const positions = () =>
    new Map([
      [0, v(0, 0)],
      [1, v(2, 0)],
      [2, v(4, 0)],
    ]);

  it("returns null for an empty map", () => {
    expect(findClosestDebossedIndex(v(0, 0), 0, new Map(), 0)).toBeNull();
  });

  it("returns the index whose position is exactly at the dragged position", () => {
    expect(findClosestDebossedIndex(v(2, 0), 0, positions(), 0)).toBe(1);
  });

  it("returns the nearest index within 0.7", () => {
    expect(findClosestDebossedIndex(v(3.5, 0.2), 0, positions(), 0)).toBe(2);
    expect(findClosestDebossedIndex(v(0.3, -0.3), 2, positions(), 0)).toBe(0);
  });

  it("distance exactly 0.7 is accepted; just above is rejected", () => {
    expect(findClosestDebossedIndex(v(0.7, 0), 2, positions(), 0)).toBe(0);
    expect(findClosestDebossedIndex(v(0.70001, 0), 2, positions(), 0)).toBeNull();
    // float error: (2.7 - 2) is 0.7000000000000002 > 0.7, so this is rejected
    expect(findClosestDebossedIndex(v(2.7, 0), 0, positions(), 0)).toBeNull();
  });

  it("returns null when every position is farther than 0.7", () => {
    expect(findClosestDebossedIndex(v(1, 0), 0, positions(), 0)).toBeNull();
    expect(findClosestDebossedIndex(v(100, 100, 100), 0, positions(), 0)).toBeNull();
  });

  it("uses 3D distance (z counts)", () => {
    expect(findClosestDebossedIndex(v(2, 0, 0.8), 0, positions(), 0)).toBeNull();
    expect(findClosestDebossedIndex(v(2, 0, 0.5), 0, positions(), 0)).toBe(1);
  });

  it("4th arg 0 (heapsort.js passes currentStep): the dragged element's own index is eligible", () => {
    expect(findClosestDebossedIndex(v(2, 0), 1, positions(), 0)).toBe(1);
  });

  it("4th arg !== 0: the dragged element's own index is skipped", () => {
    // own slot (1) is exactly under the pointer but skipped; others are 2 away -> null
    expect(findClosestDebossedIndex(v(2, 0), 1, positions(), 1)).toBeNull();
    expect(findClosestDebossedIndex(v(2, 0), 1, positions(), 2)).toBeNull();
    // falls back to the next-closest eligible slot when within range
    const close = new Map([
      [0, v(0, 0)],
      [1, v(0.5, 0)],
    ]);
    expect(findClosestDebossedIndex(v(0.45, 0), 1, close, 1)).toBe(0);
  });

  it("4th arg undefined is treated as !== 0 (own index skipped)", () => {
    expect(findClosestDebossedIndex(v(2, 0), 1, positions(), undefined)).toBeNull();
  });

  it("draggableIndex undefined never matches a key, so nothing is skipped", () => {
    expect(findClosestDebossedIndex(v(2, 0), undefined, positions(), 1)).toBe(1);
  });

  it("ties go to the first entry in Map insertion order", () => {
    const tie = new Map([
      [5, v(-0.5, 0)],
      [3, v(0.5, 0)],
    ]);
    expect(findClosestDebossedIndex(v(0, 0), 9, tie, 0)).toBe(5);
    const tie2 = new Map([
      [3, v(0.5, 0)],
      [5, v(-0.5, 0)],
    ]);
    expect(findClosestDebossedIndex(v(0, 0), 9, tie2, 0)).toBe(3);
  });

  it("works with positions laid out like createDebossedAreas (tree slots)", () => {
    // Replicates HeapSort.js:20-32 for 3 nodes: wall width 10, start y = 3.5, z = 0.2
    const map = new Map();
    for (let i = 0; i < 3; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const levelIndex = i - Math.pow(2, level) + 1;
      const nodesInLevel = Math.pow(2, level);
      const x = (levelIndex - nodesInLevel / 2 + 0.5) * (10 / nodesInLevel);
      const y = 3.5 - level * 1.5;
      map.set(i, v(x, y, 0.2));
    }
    expect([...map.values()].map((p) => [p.x, p.y])).toEqual([
      [0, 3.5],
      [-2.5, 2],
      [2.5, 2],
    ]);
    expect(findClosestDebossedIndex(v(-2.4, 2.1, 0.2), 0, map, 0)).toBe(1);
    expect(findClosestDebossedIndex(v(2.5, 2, 0.2), 2, map, 1)).toBeNull();
  });
});
