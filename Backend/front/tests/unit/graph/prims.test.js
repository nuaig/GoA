import { describe, test, expect, beforeAll, afterEach, vi } from "vitest";
import {
  Graph,
  createRandomConnectedGraph,
  createSpecificGraphPrimTutorial,
} from "../../../utils/graphRelated/graph.js";
import { PrimAlgorithm } from "../../../utils/graphRelated/prims.js";
import { mulberry32, seedMathRandom, referenceMstWeight } from "./graphTestUtils.js";

let randomSpy = null;

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  randomSpy?.mockRestore();
  randomSpy = null;
});

// selectEdge returns [weightIsMinimal, doesNotFormCycle, touchesTree].
// The page (src/js/prim.js) constructs PrimAlgorithm(graph), calls
// setStartingNode(0) and then selectEdge([edge.start, edge.end, edge.weight]).

describe("PrimAlgorithm on the Prim tutorial graph", () => {
  const setup = () => {
    const algo = new PrimAlgorithm(createSpecificGraphPrimTutorial());
    algo.setStartingNode(0);
    return algo;
  };

  test("constructor state", () => {
    const algo = new PrimAlgorithm(createSpecificGraphPrimTutorial());
    expect([...algo.selectedNodes]).toEqual([]);
    expect(algo.selectedEdges).toEqual([]);
    expect(algo.currentWeight).toBe(0);
    // remainingEdges keeps graph order; unSelectedEdges is sorted by weight
    expect(algo.remainingEdges).toEqual(createSpecificGraphPrimTutorial().edges);
    expect(algo.unSelectedEdges).toEqual([
      [0, 2, 1],
      [1, 3, 2],
      [0, 1, 3],
      [1, 2, 4],
      [2, 3, 5],
      [1, 4, 6],
      [3, 4, 7],
    ]);
  });

  test("without a starting node nothing is offered and every edge is 'not connected'", () => {
    const algo = new PrimAlgorithm(createSpecificGraphPrimTutorial());
    expect(algo.getNextEdges()).toEqual([]);
    expect(algo.selectEdge([0, 2, 1])).toEqual([1, 1, 0]);
  });

  test("full walkthrough from node 0 with wrong moves in between", () => {
    const algo = setup();
    expect([...algo.selectedNodes]).toEqual([0]);
    expect(algo.getNextEdges()).toEqual([[0, 2, 1]]);

    expect(algo.selectEdge([0, 1, 3])).toEqual([0, 1, 1]); // not minimal
    expect(algo.selectEdge([0, 2, 1])).toEqual([1, 1, 1]);
    expect(algo.currentWeight).toBe(1);
    expect([...algo.selectedNodes]).toEqual([0, 2]);
    expect(algo.getNextEdges()).toEqual([[0, 1, 3]]);

    // 1-3 has the global min unselected weight but touches no tree node
    expect(algo.selectEdge([1, 3, 2])).toEqual([1, 1, 0]);
    expect(algo.selectEdge([1, 2, 4])).toEqual([0, 1, 1]);
    expect(algo.selectEdge([0, 1, 3])).toEqual([1, 1, 1]);
    expect(algo.currentWeight).toBe(4);
    expect(algo.remainingEdges).toEqual([
      [2, 3, 5],
      [1, 3, 2],
      [1, 4, 6],
      [3, 4, 7],
    ]);
    expect(algo.getNextEdges()).toEqual([[1, 3, 2]]);

    expect(algo.selectEdge([1, 2, 4])).toEqual([0, 0, 1]); // cycle + not minimal
    expect(algo.selectEdge([1, 3, 2])).toEqual([1, 1, 1]);
    expect(algo.currentWeight).toBe(6);
    expect(algo.getNextEdges()).toEqual([[1, 4, 6]]);

    expect(algo.selectEdge([3, 4, 7])).toEqual([0, 1, 1]);
    expect(algo.selectEdge([1, 4, 6])).toEqual([1, 1, 1]);
    expect(algo.isComplete()).toBe(true);
    expect(algo.currentWeight).toBe(12);
    expect(algo.selectedEdges).toEqual([
      [0, 2, 1],
      [0, 1, 3],
      [1, 3, 2],
      [1, 4, 6],
    ]);
    expect([...algo.selectedNodes]).toEqual([0, 2, 1, 3, 4]);
    expect(algo.remainingEdges).toEqual([]);
    expect(algo.getNextEdges()).toEqual([]);
  });

  test("MST total weight equals the reference", () => {
    const g = createSpecificGraphPrimTutorial();
    expect(referenceMstWeight(g.nodes, g.edges).total).toBe(12);
  });

  test("starting from node 4 picks a different order but the same total", () => {
    const algo = new PrimAlgorithm(createSpecificGraphPrimTutorial());
    algo.setStartingNode(4);
    const order = [];
    while (!algo.isComplete()) {
      const [e] = algo.getNextEdges();
      order.push(e);
      expect(algo.selectEdge(e)).toEqual([1, 1, 1]);
    }
    expect(order).toEqual([
      [1, 4, 6],
      [1, 3, 2],
      [0, 1, 3],
      [0, 2, 1],
    ]);
    expect(algo.currentWeight).toBe(12);
  });
});

describe("PrimAlgorithm ties and edge cases", () => {
  test("ties: every minimum crossing edge is offered", () => {
    const g = new Graph([0, 1, 2], [[0, 1, 1], [0, 2, 1], [1, 2, 1]]);
    const algo = new PrimAlgorithm(g);
    algo.setStartingNode(0);
    expect(algo.getNextEdges()).toEqual([[0, 1, 1], [0, 2, 1]]);
    expect(algo.selectEdge([0, 2, 1])).toEqual([1, 1, 1]);
    expect(algo.getNextEdges()).toEqual([[0, 1, 1], [1, 2, 1]]);
    expect(algo.selectEdge([1, 2, 1])).toEqual([1, 1, 1]);
    expect(algo.isComplete()).toBe(true);
    expect(algo.currentWeight).toBe(2);
    // the leftover edge now closes a cycle (weight still "minimal")
    expect(algo.selectEdge([0, 1, 1])).toEqual([1, 0, 1]);
  });

  test("setStartingNode can be called more than once (adds nodes, no edges)", () => {
    const algo = new PrimAlgorithm(createSpecificGraphPrimTutorial());
    algo.setStartingNode(0);
    algo.setStartingNode(3);
    expect([...algo.selectedNodes]).toEqual([0, 3]);
    expect(algo.getNextEdges()).toEqual([[0, 2, 1]]);
  });

  test("an edge that does not exist in the graph is accepted if it has the minimum weight", () => {
    // NOTE: current behavior, possibly a bug: selectEdge never checks the edge
    // is in the graph; the weight check only compares against the global
    // minimum unselected weight (prims.js:62).
    const algo = new PrimAlgorithm(createSpecificGraphPrimTutorial());
    algo.setStartingNode(0);
    expect(algo.selectEdge([0, 4, 1])).toEqual([1, 1, 1]);
    expect([...algo.selectedNodes]).toEqual([0, 4]);
    expect(algo.currentWeight).toBe(1);
  });

  test("reversed orientation is accepted but the original stays in unSelectedEdges", () => {
    // NOTE: current behavior, possibly a bug: exact-orientation matching
    // (prims.js:68, 85).
    const algo = new PrimAlgorithm(createSpecificGraphPrimTutorial());
    algo.setStartingNode(0);
    expect(algo.selectEdge([2, 0, 1])).toEqual([1, 1, 1]);
    expect(algo.unSelectedEdges[0]).toEqual([0, 2, 1]);
    expect(algo.remainingEdges).not.toContainEqual([0, 2, 1]);
  });

  test("selectEdge throws once every edge has been selected (tree-shaped graph)", () => {
    // NOTE: current behavior, possibly a bug: unSelectedEdges[0] is undefined
    // when empty (prims.js:62).
    const algo = new PrimAlgorithm(new Graph([0, 1], [[0, 1, 3]]));
    algo.setStartingNode(0);
    expect(algo.selectEdge([0, 1, 3])).toEqual([1, 1, 1]);
    expect(algo.isComplete()).toBe(true);
    expect(() => algo.selectEdge([0, 1, 3])).toThrow(TypeError);
  });

  test("non-contiguous node ids work (no index-based structures)", () => {
    const g = new Graph([10, 20, 30], [[10, 20, 2], [20, 30, 1], [10, 30, 5]]);
    const algo = new PrimAlgorithm(g);
    algo.setStartingNode(10);
    expect(algo.getNextEdges()).toEqual([[10, 20, 2]]);
    // the global min unselected weight is 1 (20-30), so result[0] is first set
    // to 0 and then restored to 1 because 10-20 is in getNextEdges()
    expect(algo.selectEdge([10, 20, 2])).toEqual([1, 1, 1]);
    expect(algo.getNextEdges()).toEqual([[20, 30, 1]]);
    expect(algo.selectEdge([20, 30, 1])).toEqual([1, 1, 1]);
    expect(algo.isComplete()).toBe(true);
    expect(algo.currentWeight).toBe(3);
  });
});

describe("PrimAlgorithm vs reference MST on 100 random connected graphs", () => {
  test("greedy player always succeeds and reaches the reference MST weight", () => {
    randomSpy = seedMathRandom(777);
    const pick = mulberry32(6);
    for (let run = 0; run < 100; run++) {
      const n = 2 + Math.floor(Math.random() * 9);
      const max = (n * (n - 1)) / 2;
      const total = n - 1 + Math.floor(Math.random() * (max - (n - 1) + 1));
      const nodes = Array.from({ length: n }, (_, i) => i);
      const g = createRandomConnectedGraph(nodes, total);
      const algo = new PrimAlgorithm(g);
      algo.setStartingNode(run % 2 === 0 ? 0 : Math.floor(Math.random() * n));

      let guard = 0;
      while (!algo.isComplete()) {
        const next = algo.getNextEdges();
        expect(next.length).toBeGreaterThan(0);

        const before = JSON.stringify([algo.selectedEdges, algo.currentWeight]);
        for (const e of algo.unSelectedEdges) {
          if (next.includes(e)) continue;
          expect(algo.selectEdge(e)).not.toEqual([1, 1, 1]);
        }
        expect(JSON.stringify([algo.selectedEdges, algo.currentWeight])).toBe(before);

        const choice = next[Math.floor(pick() * next.length)];
        expect(algo.selectEdge(choice)).toEqual([1, 1, 1]);
        if (++guard > n) throw new Error("did not complete");
      }
      expect(algo.selectedNodes.size).toBe(n);
      expect(algo.currentWeight).toBe(referenceMstWeight(nodes, g.edges).total);
    }
  });
});
