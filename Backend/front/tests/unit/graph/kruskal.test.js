import { describe, test, expect, beforeAll, afterEach, vi } from "vitest";
import {
  Graph,
  createRandomConnectedGraph,
  createSpecificGraphKruskalTutorial,
} from "../../../utils/graphRelated/graph.js";
import { KruskalAlgorithm } from "../../../utils/graphRelated/kruskal.js";
import { mulberry32, seedMathRandom, referenceMstWeight } from "./graphTestUtils.js";

let randomSpy = null;

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  randomSpy?.mockRestore();
  randomSpy = null;
});

// selectEdge returns [weightIsMinimal, doesNotFormCycle]; the page
// (src/js/kruskal.js handleEdgeSelection) passes [edge.start, edge.end, edge.weight]
// and treats every(res === 1) as success.

describe("KruskalAlgorithm on the Kruskal tutorial graph", () => {
  test("constructor sorts edges by weight into remainingEdges and unSelectedEdges", () => {
    const algo = new KruskalAlgorithm(createSpecificGraphKruskalTutorial());
    const sorted = [
      [0, 2, 1],
      [0, 1, 2],
      [1, 2, 3],
      [1, 3, 4],
      [2, 3, 5],
    ];
    expect(algo.remainingEdges).toEqual(sorted);
    expect(algo.unSelectedEdges).toEqual(sorted);
    expect(algo.selectedEdges).toEqual([]);
    expect(algo.currentWeight).toBe(0);
    expect(algo.isComplete()).toBe(false);
    // the graph's own edge order is untouched
    expect(algo.graph.edges[0]).toEqual([0, 1, 2]);
  });

  test("getInitialEdges / getNextEdges return the minimum-weight candidates", () => {
    const algo = new KruskalAlgorithm(createSpecificGraphKruskalTutorial());
    expect(algo.getInitialEdges()).toEqual([[0, 2, 1]]);
    expect(algo.getNextEdges()).toEqual([[0, 2, 1]]);
  });

  test("full walkthrough with wrong moves in between", () => {
    const algo = new KruskalAlgorithm(createSpecificGraphKruskalTutorial());

    // too heavy: rejected without changing state
    expect(algo.selectEdge([0, 1, 2])).toEqual([0, 1]);
    expect(algo.selectedEdges).toEqual([]);

    expect(algo.selectEdge([0, 2, 1])).toEqual([1, 1]);
    expect(algo.currentWeight).toBe(1);
    expect(algo.getAllNodesWithSameParent(2)).toEqual([0, 2]);
    expect(algo.getNextEdges()).toEqual([[0, 1, 2]]);

    expect(algo.selectEdge([0, 1, 2])).toEqual([1, 1]);
    expect(algo.currentWeight).toBe(3);
    expect(algo.remainingEdges).toEqual([
      [1, 3, 4],
      [2, 3, 5],
    ]);
    // the cycle edge is gone from remainingEdges but still in unSelectedEdges
    expect(algo.unSelectedEdges).toEqual([
      [1, 2, 3],
      [1, 3, 4],
      [2, 3, 5],
    ]);

    // cycle edge 1-2 has the minimum *unselected* weight, so the weight hint is "ok"
    expect(algo.selectEdge([1, 2, 3])).toEqual([1, 0]);
    // too heavy
    expect(algo.selectEdge([2, 3, 5])).toEqual([0, 1]);
    expect(algo.currentWeight).toBe(3);

    expect(algo.selectEdge([1, 3, 4])).toEqual([1, 1]);
    expect(algo.isComplete()).toBe(true);
    expect(algo.currentWeight).toBe(7);
    expect(algo.selectedEdges).toEqual([
      [0, 2, 1],
      [0, 1, 2],
      [1, 3, 4],
    ]);
    expect(algo.remainingEdges).toEqual([]);
    expect(algo.getNextEdges()).toEqual([]);
    expect(algo.getInitialEdges()).toEqual([]);
    expect(algo.getAllNodesWithSameParent(0)).toEqual([0, 1, 2, 3]);
  });

  test("MST total weight equals the reference", () => {
    const g = createSpecificGraphKruskalTutorial();
    expect(referenceMstWeight(g.nodes, g.edges)).toEqual({ total: 7, count: 3 });
  });
});

describe("KruskalAlgorithm ties and edge cases", () => {
  test("ties: all equal-weight non-cycle edges are offered, any can be taken", () => {
    const g = new Graph([0, 1, 2], [[0, 1, 1], [1, 2, 1], [0, 2, 1]]);
    const algo = new KruskalAlgorithm(g);
    expect(algo.getNextEdges()).toEqual([[0, 1, 1], [1, 2, 1], [0, 2, 1]]);
    expect(algo.selectEdge([1, 2, 1])).toEqual([1, 1]);
    expect(algo.getNextEdges()).toEqual([[0, 1, 1], [0, 2, 1]]);
    expect(algo.selectEdge([0, 2, 1])).toEqual([1, 1]);
    expect(algo.isComplete()).toBe(true);
    expect(algo.currentWeight).toBe(2);
    // the remaining equal-weight edge now closes a cycle
    expect(algo.selectEdge([0, 1, 1])).toEqual([1, 0]);
  });

  test("sorting is stable: equal weights keep graph edge order", () => {
    const g = new Graph([0, 1, 2, 3], [[2, 3, 2], [0, 1, 1], [1, 2, 2], [0, 3, 1]]);
    const algo = new KruskalAlgorithm(g);
    expect(algo.remainingEdges).toEqual([[0, 1, 1], [0, 3, 1], [2, 3, 2], [1, 2, 2]]);
  });

  test("reversed orientation is accepted via the weight check but not removed from unSelectedEdges", () => {
    // NOTE: current behavior, possibly a bug: exact-orientation matching in
    // getNextEdges/unSelectedEdges (kruskal.js:99, 118).
    const algo = new KruskalAlgorithm(createSpecificGraphKruskalTutorial());
    expect(algo.selectEdge([2, 0, 1])).toEqual([1, 1]);
    expect(algo.currentWeight).toBe(1);
    expect(algo.unSelectedEdges[0]).toEqual([0, 2, 1]); // stale
    expect(algo.remainingEdges[0]).toEqual([0, 1, 2]); // removed via union-find
  });

  test("an edge that does not exist in the graph is accepted if it has the minimum weight", () => {
    // NOTE: current behavior, possibly a bug: selectEdge never checks that the
    // edge belongs to the graph (kruskal.js:94).
    const algo = new KruskalAlgorithm(createSpecificGraphKruskalTutorial());
    expect(algo.selectEdge([0, 3, 1])).toEqual([1, 1]);
    expect(algo.selectedEdges).toEqual([[0, 3, 1]]);
  });

  test("selectEdge throws once every edge has been selected (tree-shaped graph)", () => {
    // NOTE: current behavior, possibly a bug: unSelectedEdges[0] is undefined
    // when empty (kruskal.js:94).
    const algo = new KruskalAlgorithm(new Graph([0, 1], [[0, 1, 3]]));
    expect(algo.selectEdge([0, 1, 3])).toEqual([1, 1]);
    expect(algo.isComplete()).toBe(true);
    expect(() => algo.selectEdge([0, 1, 3])).toThrow(TypeError);
  });

  test("node ids must be 0..n-1: out-of-range ids look like they always form a cycle", () => {
    // NOTE: current behavior, possibly a bug: UnionFind is sized by
    // nodes.length and indexed by node id (kruskal.js:47), so find(10) and
    // find(11) both return undefined.
    const algo = new KruskalAlgorithm(new Graph([10, 11], [[10, 11, 1]]));
    expect(algo.getNextEdges()).toEqual([]);
    expect(algo.selectEdge([10, 11, 1])).toEqual([1, 0]);
  });

  test("empty edge list", () => {
    const algo = new KruskalAlgorithm(new Graph([0], []));
    expect(algo.getInitialEdges()).toEqual([]);
    expect(algo.getNextEdges()).toEqual([]);
    expect(algo.isComplete()).toBe(true); // 0 === 1 - 1
  });
});

describe("Kruskal internal UnionFind (via algo.uf)", () => {
  const newUf = (n) => {
    const algo = new KruskalAlgorithm(new Graph([0], []));
    return new algo.uf.constructor(n);
  };

  test("starts as singletons", () => {
    const uf = newUf(4);
    expect(uf.parent).toEqual([0, 1, 2, 3]);
    expect(uf.rank).toEqual([0, 0, 0, 0]);
    expect(uf.getAllNodesWithSameParent(2)).toEqual([2]);
  });

  test("union by rank and path compression", () => {
    const uf = newUf(5);
    expect(uf.union(0, 1)).toBe(true); // equal rank: 1 -> 0
    expect(uf.parent).toEqual([0, 0, 2, 3, 4]);
    expect(uf.rank).toEqual([1, 0, 0, 0, 0]);
    expect(uf.union(2, 0)).toBe(true); // lower rank root 2 goes under 0
    expect(uf.parent).toEqual([0, 0, 0, 3, 4]);
    expect(uf.union(3, 4)).toBe(true);
    expect(uf.union(4, 1)).toBe(true); // ranks equal (1,1): root of 1 (0) under root 3
    expect(uf.parent[0]).toBe(3);
    expect(uf.rank[3]).toBe(2);
    expect(uf.union(2, 4)).toBe(false); // already joined
    // path compression: find(2) re-points 2 directly at root 3
    expect(uf.find(2)).toBe(3);
    expect(uf.parent[2]).toBe(3);
    expect(uf.getAllNodesWithSameParent(1)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("KruskalAlgorithm vs reference MST on 100 random connected graphs", () => {
  test("greedy player always succeeds and reaches the reference MST weight", () => {
    randomSpy = seedMathRandom(4242);
    const pick = mulberry32(5);
    for (let run = 0; run < 100; run++) {
      const n = 2 + Math.floor(Math.random() * 9);
      const max = (n * (n - 1)) / 2;
      const total = n - 1 + Math.floor(Math.random() * (max - (n - 1) + 1));
      const nodes = Array.from({ length: n }, (_, i) => i);
      const g = createRandomConnectedGraph(nodes, total);
      const algo = new KruskalAlgorithm(g);

      let guard = 0;
      while (!algo.isComplete()) {
        const next = algo.getNextEdges();
        expect(next.length).toBeGreaterThan(0);

        // every unselected edge that is NOT offered must be rejected, without side effects
        const before = JSON.stringify([algo.selectedEdges, algo.currentWeight]);
        for (const e of algo.unSelectedEdges) {
          if (next.includes(e)) continue;
          expect(algo.selectEdge(e)).not.toEqual([1, 1]);
        }
        expect(JSON.stringify([algo.selectedEdges, algo.currentWeight])).toBe(before);

        const choice = next[Math.floor(pick() * next.length)];
        expect(algo.selectEdge(choice)).toEqual([1, 1]);
        if (++guard > n) throw new Error("did not complete");
      }
      expect(algo.selectedEdges).toHaveLength(n - 1);
      expect(algo.currentWeight).toBe(referenceMstWeight(nodes, g.edges).total);
      expect(algo.getAllNodesWithSameParent(0)).toEqual(nodes);
    }
  });
});
