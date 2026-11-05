import { describe, test, expect, beforeAll, afterEach, vi } from "vitest";
import {
  Graph,
  createRandomConnectedGraph,
  createSpecificGraphKruskalTutorial,
  createSpecificGraphDijkstraTutorial,
  createSpecificGraphAstarTutorial,
  createSpecificGraphPrimTutorial,
} from "../../../utils/graphRelated/graph.js";
import {
  mulberry32,
  seedMathRandom,
  sequenceMathRandom,
  edgeKey,
  isConnected,
} from "./graphTestUtils.js";

let randomSpy = null;

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  randomSpy?.mockRestore();
  randomSpy = null;
});

describe("Graph class", () => {
  describe("constructor", () => {
    test("stores nodes and edges and builds nodesforViz", () => {
      const g = new Graph([0, 1, 2], [[0, 1, 5]]);
      expect(g.nodes).toEqual([0, 1, 2]);
      expect(g.edges).toEqual([[0, 1, 5]]);
      expect(g.nodesforViz).toEqual([
        { id: 0, label: " #1", selectable: false },
        { id: 1, label: " #2", selectable: false },
        { id: 2, label: " #3", selectable: false },
      ]);
    });

    test("nodesforViz label is id + 1 with a leading space (string ids concatenate)", () => {
      const g = new Graph([9, "a"]);
      expect(g.nodesforViz.map((n) => n.label)).toEqual([" #10", " #a1"]);
    });

    test("edges default to a fresh empty array per instance", () => {
      const a = new Graph([0, 1]);
      const b = new Graph([0, 1]);
      expect(a.edges).toEqual([]);
      expect(a.edges).not.toBe(b.edges);
      expect(a.edgeSet.size).toBe(0);
    });

    test("edgeSet contains directed 'from-to' strings for the initial edges", () => {
      const g = new Graph([0, 1, 2], [[0, 1, 1], [2, 1, 4]]);
      expect([...g.edgeSet]).toEqual(["0-1", "2-1"]);
      expect(g._edgeSet()).toEqual(["0-1", "2-1"]);
    });

    test("does not copy the edges array: later addEdge mutates the caller's array", () => {
      const edges = [[0, 1, 1]];
      const g = new Graph([0, 1, 2], edges);
      expect(g.edges).toBe(edges);
      g.addEdge([1, 2, 3]);
      expect(edges).toEqual([[0, 1, 1], [1, 2, 3]]);
    });

    test("does not deduplicate edges passed to the constructor", () => {
      const g = new Graph([0, 1], [[0, 1, 1], [0, 1, 2]]);
      expect(g.edges).toHaveLength(2);
      expect(g.edgeSet.size).toBe(1);
    });
  });

  describe("addEdge", () => {
    test("adds a new edge and returns true", () => {
      const g = new Graph([0, 1, 2]);
      expect(g.addEdge([0, 1, 7])).toBe(true);
      expect(g.edges).toEqual([[0, 1, 7]]);
      expect(g.edgeSet.has("0-1")).toBe(true);
    });

    test("rejects an exact duplicate (same from/to), even with a different weight", () => {
      const g = new Graph([0, 1, 2]);
      g.addEdge([0, 1, 7]);
      expect(g.addEdge([0, 1, 7])).toBe(false);
      expect(g.addEdge([0, 1, 3])).toBe(false);
      expect(g.edges).toEqual([[0, 1, 7]]);
    });

    test("accepts a reverse duplicate (to/from swapped) as a different edge", () => {
      // NOTE: current behavior, possibly a bug: edges are undirected everywhere
      // else, but the duplicate check uses the directed key `${from}-${to}`.
      const g = new Graph([0, 1, 2]);
      g.addEdge([0, 1, 7]);
      expect(g.addEdge([1, 0, 4])).toBe(true);
      expect(g.edges).toEqual([[0, 1, 7], [1, 0, 4]]);
      expect([...g.edgeSet]).toEqual(["0-1", "1-0"]);
    });

    test("rejects a duplicate of an edge passed to the constructor", () => {
      const g = new Graph([0, 1], [[0, 1, 2]]);
      expect(g.addEdge([0, 1, 2])).toBe(false);
    });

    test("allows self-loops", () => {
      const g = new Graph([0]);
      expect(g.addEdge([0, 0, 1])).toBe(true);
      expect(g.edges).toEqual([[0, 0, 1]]);
    });

    test("throws when the weight/label is missing (label.toString())", () => {
      const g = new Graph([0, 1]);
      expect(() => g.addEdge([0, 1])).toThrow(TypeError);
      expect(g.edges).toEqual([]);
    });
  });

  describe("random helpers", () => {
    test("getRandomInt is inclusive of both bounds", () => {
      const g = new Graph([0]);
      randomSpy = sequenceMathRandom([0, 0.999999, 0.5]);
      expect(g.getRandomInt(3, 7)).toBe(3);
      expect(g.getRandomInt(3, 7)).toBe(7);
      expect(g.getRandomInt(3, 7)).toBe(5);
    });

    test("createRandomEdge draws weight 1..9, retries equal endpoints, orders by node index", () => {
      const g = new Graph([0, 1, 2]);
      // weight: floor(0.5*9)+1 = 5; node1 idx 0; node2 idx 0 (equal, retry); node2 idx 2
      randomSpy = sequenceMathRandom([0.5, 0, 0, 0.9]);
      expect(g.createRandomEdge()).toEqual([0, 2, 5]);
    });

    test("createRandomEdge swaps so the lower INDEX comes first", () => {
      const g = new Graph([7, 8, 9]);
      // weight 1; node1 idx 2; node2 idx 0
      randomSpy = sequenceMathRandom([0, 0.9, 0]);
      expect(g.createRandomEdge()).toEqual([7, 9, 1]);
    });

    test("createRandomEdge orders by index, not value, so unsorted nodes give [larger, smaller]", () => {
      const g = new Graph([2, 1, 0]);
      randomSpy = sequenceMathRandom([0.999999, 0, 0.9]);
      expect(g.createRandomEdge()).toEqual([2, 0, 9]);
    });

    test("addRandomEdge adds edges until edges.length reaches totalEdges", () => {
      const g = new Graph([0, 1, 2, 3]);
      randomSpy = seedMathRandom(1);
      g.addRandomEdge(4);
      expect(g.edges).toHaveLength(4);
      g.addRandomEdge(2); // already above target: no-op
      expect(g.edges).toHaveLength(4);
    });
  });
});

describe("createRandomConnectedGraph", () => {
  const maxEdges = (n) => (n * (n - 1)) / 2;

  test("deterministic: Math.random always 0 gives the path 0-1-2-... with weight 1", () => {
    randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const g = createRandomConnectedGraph([0, 1, 2, 3, 4], 4);
    expect(g.nodes).toEqual([0, 1, 2, 3, 4]);
    expect(g.edges).toEqual([
      [0, 1, 1],
      [1, 2, 1],
      [2, 3, 1],
      [3, 4, 1],
    ]);
  });

  test("deterministic: Math.random near 1 pops from the end and gives weight 10", () => {
    randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.999999);
    const g = createRandomConnectedGraph([0, 1, 2, 3, 4], 0);
    expect(g.edges).toEqual([
      [3, 4, 10],
      [2, 3, 10],
      [1, 2, 10],
      [0, 1, 10],
    ]);
  });

  test("returns a Graph instance and does not mutate the input array", () => {
    randomSpy = seedMathRandom(3);
    const nodes = [0, 1, 2, 3];
    const g = createRandomConnectedGraph(nodes, 5);
    expect(g).toBeInstanceOf(Graph);
    expect(nodes).toEqual([0, 1, 2, 3]);
    expect(g.nodes).toBe(nodes);
  });

  test("200 seeded runs: connected, no self-loops, no duplicates, expected edge count and weights", () => {
    randomSpy = seedMathRandom(12345);
    const rng = Math.random; // seeded
    let sawTreeWeight10 = false;
    for (let run = 0; run < 200; run++) {
      const n = 2 + Math.floor(rng() * 9); // 2..10
      const nodes = Array.from({ length: n }, (_, i) => i);
      const totalEdges = Math.floor(rng() * (maxEdges(n) + 1)); // 0..max
      const g = createRandomConnectedGraph(nodes, totalEdges);

      // Edge count: spanning path (n-1) topped up to totalEdges.
      expect(g.edges).toHaveLength(Math.max(n - 1, totalEdges));
      expect(isConnected(nodes, g.edges)).toBe(true);

      const seen = new Set();
      for (const [a, b, w] of g.edges) {
        expect(a).not.toBe(b);
        expect(a).toBeLessThan(b); // sorted node lists -> always [smaller, larger]
        expect(nodes).toContain(a);
        expect(nodes).toContain(b);
        expect(Number.isInteger(w)).toBe(true);
        const k = edgeKey(a, b);
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }

      // The first n-1 edges are the spanning structure: always a simple PATH
      // (every node has degree <= 2, exactly two endpoints of degree 1).
      const tree = g.edges.slice(0, n - 1);
      expect(isConnected(nodes, tree)).toBe(true);
      const deg = new Map(nodes.map((x) => [x, 0]));
      for (const [a, b] of tree) {
        deg.set(a, deg.get(a) + 1);
        deg.set(b, deg.get(b) + 1);
      }
      expect(Math.max(...deg.values())).toBeLessThanOrEqual(2);
      expect([...deg.values()].filter((d) => d === 1)).toHaveLength(2);

      // Weight ranges differ: spanning edges 1..10, extra edges 1..9.
      // NOTE: current behavior, possibly a bug: inconsistent weight ranges
      // (graph.js:77 uses *10, graph.js:42 uses *9).
      for (const [, , w] of tree) {
        expect(w).toBeGreaterThanOrEqual(1);
        expect(w).toBeLessThanOrEqual(10);
        if (w === 10) sawTreeWeight10 = true;
      }
      for (const [, , w] of g.edges.slice(n - 1)) {
        expect(w).toBeGreaterThanOrEqual(1);
        expect(w).toBeLessThanOrEqual(9);
      }

      // The graph's edgeSet matches its edges.
      expect(g.edgeSet.size).toBe(g.edges.length);
    }
    expect(sawTreeWeight10).toBe(true);
  });

  test("totalEdges < n-1 (or undefined) still yields exactly n-1 edges", () => {
    randomSpy = seedMathRandom(7);
    expect(createRandomConnectedGraph([0, 1, 2, 3, 4], 2).edges).toHaveLength(4);
    expect(createRandomConnectedGraph([0, 1, 2, 3, 4], 0).edges).toHaveLength(4);
    expect(createRandomConnectedGraph([0, 1, 2, 3, 4]).edges).toHaveLength(4);
  });

  test("totalEdges == max possible yields the complete graph", () => {
    randomSpy = seedMathRandom(8);
    const g = createRandomConnectedGraph([0, 1, 2, 3], 6);
    const keys = g.edges.map(([a, b]) => edgeKey(a, b)).sort();
    expect(keys).toEqual(["0-1", "0-2", "0-3", "1-2", "1-3", "2-3"]);
  });

  test("totalEdges > max possible never terminates (guarded here by a throwing Math.random)", () => {
    // NOTE: current behavior, possibly a bug: addRandomEdge (graph.js:56) loops
    // forever when totalEdges exceeds n(n-1)/2, since every new edge is a duplicate.
    let calls = 0;
    const rng = mulberry32(9);
    randomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
      if (++calls > 20000) throw new Error("guard: too many Math.random calls");
      return rng();
    });
    expect(() => createRandomConnectedGraph([0, 1, 2], 4)).toThrow("guard");
  });

  test("a single node with totalEdges 0 yields no edges", () => {
    randomSpy = seedMathRandom(10);
    const g = createRandomConnectedGraph([0], 0);
    expect(g.edges).toEqual([]);
    expect(g.nodes).toEqual([0]);
  });

  test("non-contiguous node ids are used as values in the edges", () => {
    randomSpy = seedMathRandom(11);
    const nodes = [10, 20, 30, 40];
    const g = createRandomConnectedGraph(nodes, 5);
    expect(g.edges).toHaveLength(5);
    expect(isConnected(nodes, g.edges)).toBe(true);
    for (const [a, b] of g.edges) {
      expect(nodes).toContain(a);
      expect(nodes).toContain(b);
    }
  });

  test("unsorted node lists can produce reverse-duplicate edges", () => {
    // NOTE: current behavior, possibly a bug: spanning edges are ordered by node
    // VALUE (graph.js:80) while extra edges are ordered by node INDEX
    // (graph.js:48), so for unsorted node lists the directed edgeSet check lets
    // [a,b] and [b,a] both in.
    randomSpy = seedMathRandom(99);
    let runsWithReverseDup = 0;
    for (let run = 0; run < 50; run++) {
      const g = createRandomConnectedGraph([2, 1, 0], 3);
      expect(g.edges).toHaveLength(3);
      const undirected = new Set(g.edges.map(([a, b]) => edgeKey(a, b)));
      if (undirected.size < g.edges.length) runsWithReverseDup++;
    }
    expect(runsWithReverseDup).toBeGreaterThan(0);
  });
});

describe("tutorial graphs", () => {
  test("createSpecificGraphKruskalTutorial", () => {
    const g = createSpecificGraphKruskalTutorial();
    expect(g).toBeInstanceOf(Graph);
    expect(g.nodes).toEqual([0, 1, 2, 3]);
    expect(g.edges).toEqual([
      [0, 1, 2],
      [0, 2, 1],
      [1, 2, 3],
      [1, 3, 4],
      [2, 3, 5],
    ]);
    expect([...g.edgeSet]).toEqual(["0-1", "0-2", "1-2", "1-3", "2-3"]);
    expect(g.startNode).toBeUndefined();
    expect(g.goalNode).toBeUndefined();
  });

  test("createSpecificGraphDijkstraTutorial", () => {
    const g = createSpecificGraphDijkstraTutorial();
    expect(g.nodes).toEqual([0, 1, 2, 3, 4]);
    expect(g.edges).toEqual([
      [0, 1, 2],
      [0, 2, 1],
      [1, 2, 3],
      [1, 3, 4],
      [2, 3, 2],
      [2, 4, 6],
      [3, 4, 1],
    ]);
    expect(g.startNode).toBeUndefined();
  });

  test("createSpecificGraphAstarTutorial (with startNode 0 and goalNode 4)", () => {
    const g = createSpecificGraphAstarTutorial();
    expect(g.nodes).toEqual([0, 1, 2, 3, 4]);
    expect(g.edges).toEqual([
      [0, 1, 2],
      [0, 2, 1],
      [1, 2, 3],
      [1, 3, 4],
      [2, 3, 2],
      [2, 4, 3],
      [3, 4, 1],
    ]);
    expect(g.startNode).toBe(0);
    expect(g.goalNode).toBe(4);
    expect(g.heuristicWeight).toBeUndefined();
    expect(g.nodePositions).toBeUndefined();
  });

  test("createSpecificGraphPrimTutorial", () => {
    const g = createSpecificGraphPrimTutorial();
    expect(g.nodes).toEqual([0, 1, 2, 3, 4]);
    expect(g.edges).toEqual([
      [0, 1, 3],
      [0, 2, 1],
      [1, 2, 4],
      [2, 3, 5],
      [1, 3, 2],
      [1, 4, 6],
      [3, 4, 7],
    ]);
  });

  test("every call returns a fresh graph (no shared state between calls)", () => {
    const a = createSpecificGraphDijkstraTutorial();
    const b = createSpecificGraphDijkstraTutorial();
    expect(a).not.toBe(b);
    expect(a.edges).not.toBe(b.edges);
    a.addEdge([0, 4, 9]);
    expect(b.edges).toHaveLength(7);
  });
});
