import { describe, test, expect, beforeAll, afterEach, vi } from "vitest";
import {
  Graph,
  createRandomConnectedGraph,
  createSpecificGraphAstarTutorial,
} from "../../../utils/graphRelated/graph.js";
import { AstarAlgorithm } from "../../../utils/graphRelated/Astar.js";
import {
  mulberry32,
  seedMathRandom,
  referenceDijkstra,
  weightOf,
  drivePageLike,
} from "./graphTestUtils.js";

let randomSpy = null;

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  randomSpy?.mockRestore();
  randomSpy = null;
});

const NODE_MSG = "Click the node with smallest f(n).";
const EDGE_MSG = "Select edges to update f(n) = g(n) + h(n).";
const AMBIGUITY_MSG =
  "Multiple nodes have the same smallest f(n). Pick any one to continue.";
const GOAL_MSG = "Goal reached!";

const chest = (n) => ({ expectedChests: [n], expectedEdges: null, errorMessage: NODE_MSG });
const goal = (n) => ({ expectedChests: [n], expectedEdges: null, errorMessage: GOAL_MSG });
const ambiguity = (nodes) => ({
  expectedChests: nodes,
  expectedEdges: null,
  errorMessage: AMBIGUITY_MSG,
});
// Unlike Dijkstra, `weight` here is the EDGE weight; g/f before and after are included.
const edges = (...list) => ({
  expectedChests: null,
  expectedEdges: list.map(([a, b, weight, newG, newF, oldG, oldF]) => ({
    edge: [a, b],
    weight,
    newG,
    newF,
    oldG,
    oldF,
  })),
  errorMessage: EDGE_MSG,
});
const INF = Infinity;

/** Mirrors the page's tutorial setup (src/js/Astar.js): weight 0, type "zero". */
function tutorialAlgo() {
  const graph = createSpecificGraphAstarTutorial();
  graph.heuristicWeight = 0;
  graph.heuristicType = "zero";
  return new AstarAlgorithm(graph, graph.startNode);
}

const tieGraph = (goalNode) => {
  const g = new Graph(
    [0, 1, 2, 3],
    [
      [0, 1, 1],
      [0, 2, 1],
      [1, 3, 5],
      [2, 3, 1],
    ]
  );
  g.goalNode = goalNode;
  return g;
};

describe("AstarAlgorithm on the A* tutorial graph (h = 0)", () => {
  test("produces the exact step list", () => {
    expect(tutorialAlgo().steps).toEqual([
      chest(0),
      edges([0, 1, 2, 2, 2, INF, INF], [0, 2, 1, 1, 1, INF, INF]),
      chest(2),
      edges([2, 1, 3, 4, 4, 2, 2], [2, 3, 2, 3, 3, INF, INF], [2, 4, 3, 4, 4, INF, INF]),
      chest(1),
      edges([1, 3, 4, 6, 6, 3, 3]),
      chest(3),
      edges([3, 4, 1, 4, 4, 4, 4]),
      goal(4),
    ]);
  });

  test("g/f/previous values, configuration and path cost", () => {
    const algo = tutorialAlgo();
    expect(algo.goalNode).toBe(4);
    expect(algo.startNode).toBe(0);
    expect(algo.heuristicType).toBe("zero");
    expect(algo.heuristicWeight).toBe(0);
    expect(algo.gValues).toEqual({ 0: 0, 1: 2, 2: 1, 3: 3, 4: 4 });
    expect(algo.fValues).toEqual({ 0: 0, 1: 2, 2: 1, 3: 3, 4: 4 });
    // 0-2-4 and 0-2-3-4 both cost 4; ties keep the first-found predecessor
    expect(algo.previous).toEqual({ 0: null, 1: 0, 2: 0, 3: 2, 4: 2 });
    // goal is never added to `visited`
    expect([...algo.visited]).toEqual([0, 2, 1, 3]);
    expect(algo.paused).toBe(false);
    expect(algo.priorityQueue.isEmpty()).toBe(true);
  });

  test("the tutorial graph alone (no heuristic fields) behaves the same", () => {
    const graph = createSpecificGraphAstarTutorial();
    const algo = new AstarAlgorithm(graph, graph.startNode);
    expect(algo.steps).toEqual(tutorialAlgo().steps);
  });

  test("edgeAlreadyExpected, selectEdge and isComplete", () => {
    const algo = tutorialAlgo();
    expect(algo.edgeAlreadyExpected(4, 2)).toBe(true);
    expect(algo.edgeAlreadyExpected(0, 3)).toBe(false);

    expect(algo.selectEdge([0, 1])).toEqual([0, 0]); // node step
    algo.currentStepIndex = 1;
    expect(algo.selectEdge([2, 0])).toEqual([1, 1]); // returns the edge weight
    expect(algo.selectEdge([0, 2])).toEqual([0, 0]); // already chosen
    expect(algo.selectEdge([0, 4])).toEqual([0, 0]); // not expected
    expect(algo.selectEdge([0, 1])).toEqual([1, 2]);
    expect(algo.currentStepIndex).toBe(2);

    expect(algo.isComplete()).toBe(false);
    algo.currentStepIndex = algo.steps.length;
    expect(algo.isComplete()).toBe(true);
  });
});

describe("AstarAlgorithm configuration", () => {
  const line = () => new Graph([0, 1, 2], [[0, 1, 1], [1, 2, 1]]);

  test("heuristic weight resolution", () => {
    const g = line();
    expect(new AstarAlgorithm(g).heuristicWeight).toBe(0);
    expect(new AstarAlgorithm(g).heuristicType).toBe("zero");
    g.heuristicType = "euclid";
    expect(new AstarAlgorithm(g).heuristicWeight).toBe(1);
    g.heuristicType = "w_euclid";
    expect(new AstarAlgorithm(g).heuristicWeight).toBe(1.5);
    g.heuristicWeight = "2.5"; // numeric strings are accepted
    expect(new AstarAlgorithm(g).heuristicWeight).toBe(2.5);
    g.heuristicWeight = NaN; // non-finite falls back to the type
    expect(new AstarAlgorithm(g).heuristicWeight).toBe(1.5);
    g.heuristicWeight = null; // Number(null) === 0 is finite, overrides the type
    expect(new AstarAlgorithm(g).heuristicWeight).toBe(0);
  });

  test("heuristic(): weighted Euclidean over x/z, 0 when weight <= 0 or positions missing", () => {
    const g = line();
    g.goalNode = 2;
    g.heuristicWeight = 1;
    g.nodePositions = { 0: { x: 3, y: 100, z: 4 }, 2: { x: 0, y: 0, z: 0 } };
    const algo = new AstarAlgorithm(g);
    expect(algo.heuristic(0)).toBe(5); // y ignored
    expect(algo.heuristic("0")).toBe(5);
    expect(algo.heuristic(1)).toBe(0); // no position
    expect(algo.heuristic(2)).toBe(0);
    algo.heuristicWeight = 1.5;
    expect(algo.heuristic(0)).toBe(7.5);
    algo.heuristicWeight = -1;
    expect(algo.heuristic(0)).toBe(0);
  });

  test("default goal: largest INDEX of graph.nodes (correct only for 0..n-1 ids)", () => {
    expect(new AstarAlgorithm(new Graph([0, 1, 2, 3, 4], [[0, 1, 1]])).goalNode).toBe(4);
    // NOTE: current behavior, possibly a bug: Object.keys(nodes) yields array
    // indices, so for ids [10, 20, 30] the default goal is 2 (Astar.js:14).
    const g = new Graph([10, 20, 30], [[10, 20, 1], [20, 30, 1]]);
    expect(new AstarAlgorithm(g, 10).goalNode).toBe(2);
  });

  test("default goal without graph.nodes: index of the edge-endpoint list", () => {
    // NOTE: current behavior, possibly a bug: same Object.keys issue on the
    // buildNodeSet fallback (Astar.js:14) -> 1, not 7.
    const algo = new AstarAlgorithm({ edges: [[5, 7, 1]] }, 5);
    expect(algo.buildNodeSet([[5, 7, 1], [7, 9, 2]])).toEqual([5, 7, 9]);
    expect(algo.goalNode).toBe(1);
  });

  test("explicit goalNode wins (including 0)", () => {
    const g = line();
    g.goalNode = 0;
    const algo = new AstarAlgorithm(g, 2);
    expect(algo.goalNode).toBe(0);
    expect(algo.steps.at(-1)).toEqual(goal(0));
  });
});

describe("AstarAlgorithm with a Euclidean heuristic", () => {
  // goal 3 at the origin; h(1)=sqrt(2), h(2)=2, h(0)=3 (all admissible)
  const build = () => {
    const g = new Graph(
      [0, 1, 2, 3],
      [
        [0, 1, 3],
        [0, 2, 3],
        [1, 3, 3],
        [2, 3, 3],
      ]
    );
    g.goalNode = 3;
    g.heuristicWeight = 1;
    g.heuristicType = "euclid";
    g.nodePositions = {
      0: { x: 0, y: 0, z: 3 },
      1: { x: 1, y: 0, z: 1 },
      2: { x: 0, y: 0, z: 2 },
      3: { x: 0, y: 0, z: 0 },
    };
    return g;
  };

  test("heuristic breaks the g-tie between 1 and 2; f is rounded to 2 decimals", () => {
    const algo = new AstarAlgorithm(build(), 0);
    expect(algo.steps).toEqual([
      chest(0),
      edges([0, 1, 3, 3, 4.41, INF, INF], [0, 2, 3, 3, 5, INF, INF]),
      chest(1),
      edges([1, 3, 3, 6, 6, INF, INF]),
      chest(2),
      edges([2, 3, 3, 6, 6, 6, 6]),
      goal(3),
    ]);
    expect(algo.fValues).toEqual({ 0: 3, 1: 4.41, 2: 5, 3: 6 });
    expect(algo.gValues).toEqual({ 0: 0, 1: 3, 2: 3, 3: 6 });
  });

  test("same graph with h = 0 pauses on the 1/2 tie instead", () => {
    const g = build();
    g.heuristicWeight = 0;
    const algo = new AstarAlgorithm(g, 0);
    expect(algo.steps.at(-1)).toEqual(ambiguity([1, 2]));
    expect(algo.paused).toBe(true);
  });
});

describe("AstarAlgorithm ambiguity and resumeFromNode", () => {
  test("tie pauses; resuming with 2 continues to the goal", () => {
    const algo = new AstarAlgorithm(tieGraph(3), 0);
    expect(algo.steps).toEqual([
      chest(0),
      edges([0, 1, 1, 1, 1, INF, INF], [0, 2, 1, 1, 1, INF, INF]),
      ambiguity([1, 2]),
    ]);
    expect(algo.paused).toBe(true);
    expect(algo.waitingNodes).toEqual([1, 2]);
    expect(algo.isComplete()).toBe(false);

    algo.resumeFromNode(0); // already visited: ignored (page clicks every chest)
    expect(algo.steps).toHaveLength(3);

    algo.resumeFromNode(2);
    expect(algo.steps.slice(3)).toEqual([
      edges([2, 3, 1, 2, 2, INF, INF]),
      chest(1),
      edges([1, 3, 5, 6, 6, 2, 2]),
      goal(3),
    ]);
    expect(algo.paused).toBe(false);
    expect(algo.gValues[3]).toBe(2);
    expect(algo.previous[3]).toBe(2);
  });

  test("goal tied with another node is an ambiguity, not auto-selected", () => {
    const g = new Graph([0, 1, 2], [[0, 1, 1], [0, 2, 1]]);
    g.goalNode = 2;
    const algo = new AstarAlgorithm(g, 0);
    expect(algo.steps.at(-1)).toEqual(ambiguity([1, 2]));

    // picking the non-goal node: goal becomes the unique minimum -> goal step
    algo.resumeFromNode(1);
    expect(algo.steps.slice(3)).toEqual([goal(2)]);
  });

  test("resumeFromNode(goal) during a tie appends a goal step", () => {
    // The page handles a goal click itself and does not call resumeFromNode
    // for the goal, but the class supports it.
    const g = new Graph([0, 1, 2], [[0, 1, 1], [0, 2, 1]]);
    g.goalNode = 2;
    const algo = new AstarAlgorithm(g, 0);
    algo.resumeFromNode(2);
    expect(algo.steps.slice(3)).toEqual([goal(2)]);
    // NOTE: current behavior, possibly a bug: resumedFromAmbiguity is left true
    // because the goal branch returns before it is reset (Astar.js:173).
    expect(algo.resumedFromAmbiguity).toBe(true);
  });
});

describe("AstarAlgorithm edge cases", () => {
  test("start == goal: a single goal step", () => {
    const g = new Graph([0, 1], [[0, 1, 1]]);
    g.goalNode = 0;
    const algo = new AstarAlgorithm(g, 0);
    expect(algo.steps).toEqual([goal(0)]);
  });

  test("unreachable goal: explores the start component, no goal step", () => {
    const g = new Graph([0, 1, 2, 3], [[0, 1, 1], [2, 3, 1]]);
    g.goalNode = 3;
    const algo = new AstarAlgorithm(g, 0);
    expect(algo.steps).toEqual([chest(0), edges([0, 1, 1, 1, 1, INF, INF]), chest(1)]);
    expect(algo.gValues).toEqual({ 0: 0, 1: 1, 2: INF, 3: INF });
  });

  test("non-zero start and edges listed in reverse give the same search", () => {
    const base = createSpecificGraphAstarTutorial();
    const rev = new Graph(base.nodes, base.edges.map(([a, b, w]) => [b, a, w]));
    rev.goalNode = 0;
    base.goalNode = 0;
    const a = new AstarAlgorithm(base, 4);
    const b = new AstarAlgorithm(rev, 4);
    expect(b.steps).toEqual(a.steps);
    expect(a.gValues).toEqual({ 0: 4, 1: 5, 2: 3, 3: 1, 4: 0 });
    expect(a.steps.at(-1)).toEqual(goal(0));
  });

  test("single node: start is the default goal", () => {
    const algo = new AstarAlgorithm(new Graph([0], []), 0);
    expect(algo.goalNode).toBe(0);
    expect(algo.steps).toEqual([goal(0)]);
  });

  test("internal MinPriorityQueue.remove drops ALL entries (doc says 'first occurrence')", () => {
    // NOTE: current behavior, the JSDoc at Astar.js:343 says "first occurrence".
    const algo = new AstarAlgorithm(new Graph([0], []), 0);
    const q = new algo.priorityQueue.constructor();
    q.enqueue(1, 4);
    q.enqueue(2, 1);
    q.enqueue(1, 2);
    expect(q.getAllWithPriority(1)).toEqual([2]);
    q.remove(1);
    expect(q.values).toEqual([{ element: 2, priority: 1 }]);
    expect(q.dequeue()).toEqual({ element: 2, priority: 1 });
    expect(q.peekPriority()).toBe(Infinity);
    expect(q.isEmpty()).toBe(true);
  });
});

describe("AstarAlgorithm path optimality vs reference Dijkstra (100 random graphs)", () => {
  function pathCost(algo, g, start, goalNode) {
    let cost = 0;
    let cur = goalNode;
    let hops = 0;
    while (cur !== start) {
      const p = algo.previous[cur];
      cost += weightOf(g.edges, p, cur);
      cur = p;
      if (++hops > g.nodes.length) throw new Error("cycle in previous");
    }
    return cost;
  }

  function runMany(seed, configure) {
    randomSpy = seedMathRandom(seed);
    const pick = mulberry32(seed + 1);
    let ambiguityRuns = 0;
    for (let run = 0; run < 100; run++) {
      const n = 2 + Math.floor(Math.random() * 9);
      const max = (n * (n - 1)) / 2;
      const total = n - 1 + Math.floor(Math.random() * (max - (n - 1) + 1));
      const nodes = Array.from({ length: n }, (_, i) => i);
      const g = createRandomConnectedGraph(nodes, total);
      const start = 0;
      g.goalNode = 1 + Math.floor(Math.random() * (n - 1));
      const ref = referenceDijkstra(nodes, g.edges, start);
      configure(g, ref);

      const algo = new AstarAlgorithm(g, start);
      if (algo.paused) ambiguityRuns++;
      const clicked = drivePageLike(
        algo,
        (choices) => choices[Math.floor(pick() * choices.length)],
        { skipGoal: g.goalNode }
      );

      // Ends either with a "Goal reached!" step, or with an ambiguity step that
      // the driver resolved by clicking the goal (the page handles that click
      // itself without calling resumeFromNode).
      const last = algo.steps.at(-1);
      if (last.errorMessage === AMBIGUITY_MSG) {
        expect(last.expectedChests).toContain(g.goalNode);
      } else {
        expect(last).toEqual(goal(g.goalNode));
      }
      expect(clicked.at(-1)).toBe(g.goalNode);
      expect(algo.gValues[g.goalNode]).toBe(ref[g.goalNode]);
      expect(pathCost(algo, g, start, g.goalNode)).toBe(ref[g.goalNode]);
    }
    return ambiguityRuns;
  }

  test("h = 0: A* finds the shortest path (and ties occur)", () => {
    const ambiguityRuns = runMany(31337, (g) => {
      g.heuristicWeight = 0;
      g.heuristicType = "zero";
    });
    expect(ambiguityRuns).toBeGreaterThan(0);
  });

  test("perfect Euclidean heuristic (positions = true distance to goal): still optimal", () => {
    runMany(9001, (g) => {
      const toGoal = referenceDijkstra(g.nodes, g.edges, g.goalNode);
      g.nodePositions = {};
      for (const v of g.nodes) g.nodePositions[v] = { x: toGoal[v], y: 0, z: 0 };
      g.heuristicWeight = 1;
      g.heuristicType = "euclid";
    });
  });

  test("halved (admissible) heuristic: still optimal", () => {
    runMany(4711, (g) => {
      const toGoal = referenceDijkstra(g.nodes, g.edges, g.goalNode);
      g.nodePositions = {};
      for (const v of g.nodes) g.nodePositions[v] = { x: 0, y: 0, z: toGoal[v] };
      g.heuristicWeight = 0.5;
      g.heuristicType = "euclid";
    });
  });
});
