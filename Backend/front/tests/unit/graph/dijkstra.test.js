import { describe, test, expect, beforeAll, afterEach, vi } from "vitest";
import {
  Graph,
  createRandomConnectedGraph,
  createSpecificGraphDijkstraTutorial,
} from "../../../utils/graphRelated/graph.js";
import { DijkstraAlgorithm } from "../../../utils/graphRelated/dijkstra.js";
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

const CHEST_MSG = "Click the correct closest node.";
const EDGE_MSG = "Now select a correct edge to update distances.";
const AMBIGUITY_MSG =
  "Multiple nodes have the same shortest distance. Pick any one to continue.";

const chest = (n) => ({ expectedChests: [n], expectedEdges: null, errorMessage: CHEST_MSG });
const ambiguity = (nodes) => ({
  expectedChests: nodes,
  expectedEdges: null,
  errorMessage: AMBIGUITY_MSG,
});
// Note: the `weight` in an edge step is the neighbor's best-known DISTANCE
// after relaxation, not the edge weight.
const edges = (...list) => ({
  expectedChests: null,
  expectedEdges: list.map(([a, b, d]) => ({ edge: [a, b], weight: d })),
  errorMessage: EDGE_MSG,
});

const TUTORIAL_STEPS = [
  chest(0),
  edges([0, 1, 2], [0, 2, 1]),
  chest(2),
  edges([2, 1, 2], [2, 3, 3], [2, 4, 7]),
  chest(1),
  edges([1, 3, 3]),
  chest(3),
  edges([3, 4, 4]),
  chest(4),
];

// Small graph with a tie: 0->1 and 0->2 both cost 1.
const tieGraph = () =>
  new Graph(
    [0, 1, 2, 3],
    [
      [0, 1, 1],
      [0, 2, 1],
      [1, 3, 5],
      [2, 3, 1],
    ]
  );

describe("DijkstraAlgorithm on the Dijkstra tutorial graph", () => {
  test("produces the exact step list", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    expect(algo.steps).toEqual(TUTORIAL_STEPS);
  });

  test("distances and previous (keys are strings from the adjacency list)", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    expect(algo.distances).toEqual({ 0: 0, 1: 2, 2: 1, 3: 3, 4: 4 });
    expect(Object.keys(algo.distances)).toEqual(["0", "1", "2", "3", "4"]);
    expect(algo.previous).toEqual({ 0: null, 1: 0, 2: 0, 3: 2, 4: 3 });
  });

  test("initial state after construction", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    expect(algo.startNode).toBe(0);
    expect(algo.currentStepIndex).toBe(0);
    expect(algo.paused).toBe(false);
    expect(algo.waitingNodes).toEqual([]);
    expect(algo.resumedFromAmbiguity).toBe(false);
    expect(algo.resumedNode).toBeNull();
    expect([...algo.visited]).toEqual([0, 2, 1, 3, 4]);
    // A stale entry for node 4 (priority 7) was dequeued and skipped at the end.
    expect(algo.priorityQueue.isEmpty()).toBe(true);
  });

  test("adjacency list is undirected, keyed by string, in edge-list order", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    expect(algo.adjacencyList).toEqual({
      0: [{ node: 1, weight: 2 }, { node: 2, weight: 1 }],
      1: [{ node: 0, weight: 2 }, { node: 2, weight: 3 }, { node: 3, weight: 4 }],
      2: [
        { node: 0, weight: 1 },
        { node: 1, weight: 3 },
        { node: 3, weight: 2 },
        { node: 4, weight: 6 },
      ],
      3: [{ node: 1, weight: 4 }, { node: 2, weight: 2 }, { node: 4, weight: 1 }],
      4: [{ node: 2, weight: 6 }, { node: 3, weight: 1 }],
    });
  });

  test("page-like driving (resumeFromNode on every chest click) is a no-op without ties", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    const clicked = drivePageLike(algo);
    expect(clicked).toEqual([0, 2, 1, 3, 4]);
    expect(algo.steps).toEqual(TUTORIAL_STEPS);
  });

  test("listing every edge in the reverse direction gives identical steps and distances", () => {
    const g = createSpecificGraphDijkstraTutorial();
    const reversed = new Graph(g.nodes, g.edges.map(([a, b, w]) => [b, a, w]));
    const algo = new DijkstraAlgorithm(reversed);
    expect(algo.steps).toEqual(TUTORIAL_STEPS);
    expect(algo.distances).toEqual({ 0: 0, 1: 2, 2: 1, 3: 3, 4: 4 });
  });

  test("edgeAlreadyExpected is direction-agnostic", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    expect(algo.edgeAlreadyExpected(0, 1)).toBe(true);
    expect(algo.edgeAlreadyExpected(1, 0)).toBe(true);
    expect(algo.edgeAlreadyExpected(4, 3)).toBe(true);
    expect(algo.edgeAlreadyExpected(0, 3)).toBe(false);
    expect(algo.edgeAlreadyExpected(1, 2)).toBe(true); // as [2,1]
  });
});

describe("DijkstraAlgorithm.selectEdge / isComplete", () => {
  test("selectEdge returns [0,0] while the current step is a node step", () => {
    // NOTE: current behavior, possibly a bug: nothing inside the class advances
    // currentStepIndex past a node step, so on a fresh instance selectEdge can
    // never succeed. The page scripts track the step index themselves
    // (curRoomUI.currentTutorialStep) and do not call selectEdge.
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    expect(algo.selectEdge([0, 1])).toEqual([0, 0]);
    expect(algo.currentStepIndex).toBe(0);
  });

  test("on an edge step: matches either direction, returns the distance, advances when all chosen", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    algo.currentStepIndex = 1; // edges of node 0
    expect(algo.selectEdge([1, 0])).toEqual([1, 2]);
    expect(algo.selectEdge([0, 1])).toEqual([0, 0]); // already chosen
    expect(algo.selectEdge([0, 3])).toEqual([0, 0]); // not expected
    expect(algo.currentStepIndex).toBe(1);
    expect(algo.selectEdge([0, 2])).toEqual([1, 1]);
    expect(algo.currentStepIndex).toBe(2);
    // selectEdge mutates the step object
    expect(algo.steps[1].selectedEdges).toEqual([[1, 0], [0, 2]]);
  });

  test("selectEdge past the end returns [0,0]", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    algo.currentStepIndex = 99;
    expect(algo.selectEdge([0, 1])).toEqual([0, 0]);
  });

  test("isComplete depends on currentStepIndex and paused", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    expect(algo.isComplete()).toBe(false);
    algo.currentStepIndex = algo.steps.length;
    expect(algo.isComplete()).toBe(true);
    algo.paused = true;
    expect(algo.isComplete()).toBe(false);
  });
});

describe("DijkstraAlgorithm ambiguity (ties) and resumeFromNode", () => {
  test("pauses on a tie and emits an ambiguity step listing the tied nodes", () => {
    const algo = new DijkstraAlgorithm(tieGraph());
    expect(algo.steps).toEqual([chest(0), edges([0, 1, 1], [0, 2, 1]), ambiguity([1, 2])]);
    expect(algo.paused).toBe(true);
    expect(algo.waitingNodes).toEqual([1, 2]);
    expect(algo.isComplete()).toBe(false);
  });

  test("while paused, distances are NOT final (node 3 still Infinity)", () => {
    // Relevant because src/js/Astar.js (setUpGameModel) reads `distances` from
    // a freshly constructed DijkstraAlgorithm without resolving ties.
    // NOTE: current behavior, possibly a bug: the A* room picks its goal from
    // these tentative distances (src/js/Astar.js:1980).
    const algo = new DijkstraAlgorithm(tieGraph());
    expect(algo.distances).toEqual({ 0: 0, 1: 1, 2: 1, 3: Infinity });
    expect(algo.previous).toEqual({ 0: null, 1: 0, 2: 0, 3: null });
  });

  test("resuming with node 2: no extra chest step for 2, then 1 and 3 follow", () => {
    const algo = new DijkstraAlgorithm(tieGraph());
    algo.resumeFromNode(2);
    expect(algo.steps).toEqual([
      chest(0),
      edges([0, 1, 1], [0, 2, 1]),
      ambiguity([1, 2]),
      edges([2, 3, 2]),
      chest(1),
      edges([1, 3, 2]),
      chest(3),
    ]);
    expect(algo.paused).toBe(false);
    expect(algo.waitingNodes).toEqual([]);
    expect(algo.distances).toEqual({ 0: 0, 1: 1, 2: 1, 3: 2 });
    expect(algo.previous).toEqual({ 0: null, 1: 0, 2: 0, 3: 2 });
  });

  test("resuming with node 1 instead yields a different (still correct) trace", () => {
    const algo = new DijkstraAlgorithm(tieGraph());
    algo.resumeFromNode(1);
    expect(algo.steps).toEqual([
      chest(0),
      edges([0, 1, 1], [0, 2, 1]),
      ambiguity([1, 2]),
      edges([1, 3, 6]),
      chest(2),
      edges([2, 3, 2]),
      chest(3),
    ]);
    expect(algo.distances).toEqual({ 0: 0, 1: 1, 2: 1, 3: 2 });
    expect(algo.previous).toEqual({ 0: null, 1: 0, 2: 0, 3: 2 });
  });

  test("page call sequence: resumeFromNode on each correct chest click", () => {
    // src/js/dijkstra.js calls curAlgorithmForGraph.resumeFromNode(index) on
    // every correct chest click, then advances its own step index.
    const algo = new DijkstraAlgorithm(tieGraph());
    algo.resumeFromNode(0); // click on node 0 (already visited): ignored
    expect(algo.steps).toHaveLength(3);
    expect(algo.paused).toBe(true);
    algo.resumeFromNode(2); // click on node 2 at the ambiguity step
    algo.resumeFromNode(1); // click on node 1 (visited during resume): ignored
    algo.resumeFromNode(3); // ignored
    expect(algo.steps).toHaveLength(7);
    expect(algo.steps[3]).toEqual(edges([2, 3, 2]));
  });

  test("three-way tie produces two consecutive ambiguity steps", () => {
    const star = new Graph([0, 1, 2, 3], [[0, 1, 1], [0, 2, 1], [0, 3, 1]]);
    const algo = new DijkstraAlgorithm(star);
    expect(algo.steps).toEqual([
      chest(0),
      edges([0, 1, 1], [0, 2, 1], [0, 3, 1]),
      ambiguity([1, 2, 3]),
    ]);
    algo.resumeFromNode(2); // 2 has no unvisited neighbours -> no edge step
    expect(algo.steps.slice(3)).toEqual([ambiguity([1, 3])]);
    expect(algo.paused).toBe(true);
    expect(algo.waitingNodes).toEqual([1, 3]);
    algo.resumeFromNode(3);
    expect(algo.steps.slice(4)).toEqual([chest(1)]);
    expect(algo.paused).toBe(false);
  });

  test("resumeFromNode does not validate that the node was one of the tied nodes", () => {
    // NOTE: current behavior, possibly a bug: any unvisited node is accepted,
    // even one that is not in waitingNodes (here node 3, distance Infinity).
    const algo = new DijkstraAlgorithm(tieGraph());
    algo.resumeFromNode(3);
    expect(algo.steps[3]).toEqual(edges([3, 1, 1], [3, 2, 1]));
    expect(algo.visited.has(3)).toBe(true);
  });
});

describe("DijkstraAlgorithm edge cases", () => {
  test("single node, no edges", () => {
    const algo = new DijkstraAlgorithm(new Graph([0], []));
    expect(algo.steps).toEqual([chest(0)]);
    expect(algo.distances).toEqual({ 0: 0 });
    expect(algo.previous).toEqual({});
    expect(algo.adjacencyList).toEqual({});
  });

  test("disconnected graph: unreachable nodes stay Infinity, isolated nodes are absent", () => {
    const g = new Graph([0, 1, 2, 3, 4], [[0, 1, 1], [2, 3, 1]]); // node 4 isolated
    const algo = new DijkstraAlgorithm(g);
    expect(algo.steps).toEqual([chest(0), edges([0, 1, 1]), chest(1)]);
    expect(algo.distances).toEqual({ 0: 0, 1: 1, 2: Infinity, 3: Infinity });
    expect("4" in algo.distances).toBe(false);
    expect(algo.previous).toEqual({ 0: null, 1: 0, 2: null, 3: null });
  });

  test("non-zero start node", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial(), 4);
    expect(algo.startNode).toBe(4);
    expect(algo.distances).toEqual({ 0: 4, 1: 5, 2: 3, 3: 1, 4: 0 });
    expect(algo.previous).toEqual({ 0: 2, 1: 3, 2: 3, 3: 4, 4: null });
    expect(algo.steps).toEqual([
      chest(4),
      edges([4, 2, 6], [4, 3, 1]),
      chest(3),
      edges([3, 1, 5], [3, 2, 3]),
      chest(2),
      edges([2, 0, 4], [2, 1, 5]),
      chest(0),
      edges([0, 1, 5]),
      chest(1),
    ]);
  });

  test("start node not in the graph: just one chest step", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial(), 9);
    expect(algo.steps).toEqual([chest(9)]);
    expect(algo.distances[9]).toBe(0);
  });

  test("string node keys with numeric start: start is not recognised as visited", () => {
    // NOTE: current behavior, possibly a bug: `visited` mixes the numeric start
    // (0) with string neighbours ("1", "0", ...), so from node "1" the edge back
    // to the start is offered again (with distance 0).
    const g = new Graph(["0", "1", "2"], [["0", "1", 1], ["1", "2", 1]]);
    const algo = new DijkstraAlgorithm(g);
    expect(algo.steps).toEqual([
      chest(0),
      edges([0, "1", 1]),
      chest(1),
      edges([1, "0", 0], [1, "2", 2]),
      chest(2),
    ]);
    expect(algo.distances).toEqual({ 0: 0, 1: 1, 2: 2 });
    expect(algo.previous).toEqual({ 0: null, 1: 0, 2: 1 });
  });

  test("string node keys with string start: consistent, chest ids coerced to numbers", () => {
    const g = new Graph(["0", "1", "2"], [["0", "1", 1], ["1", "2", 1]]);
    const algo = new DijkstraAlgorithm(g, "0");
    expect(algo.steps).toEqual([
      chest(0),
      edges([0, "1", 1]),
      chest(1),
      edges([1, "2", 2]),
      chest(2),
    ]);
    expect([...algo.visited]).toEqual(["0", "1", "2"]);
  });

  test("numeric nodes: previous values are numbers, distance keys strings", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    expect(Object.keys(algo.previous)).toEqual(["0", "1", "2", "3", "4"]);
    expect(typeof algo.previous[3]).toBe("number");
  });

  test("parallel edges: the cheaper one wins, both appear in the edge step", () => {
    const g = new Graph([0, 1], [[0, 1, 5], [1, 0, 2]]);
    const algo = new DijkstraAlgorithm(g);
    expect(algo.steps).toEqual([chest(0), edges([0, 1, 5], [0, 1, 2]), chest(1)]);
    expect(algo.distances).toEqual({ 0: 0, 1: 2 });
  });
});

describe("DijkstraAlgorithm internal MinPriorityQueue (via algo.priorityQueue)", () => {
  const newQueue = () => {
    const algo = new DijkstraAlgorithm(new Graph([0], []));
    return new algo.priorityQueue.constructor();
  };

  test("orders by priority, stable for ties, dequeue returns {element, priority}", () => {
    const q = newQueue();
    q.enqueue("a", 3);
    q.enqueue("b", 1);
    q.enqueue("c", 3);
    q.enqueue("d", 1);
    expect(q.values.map((v) => v.element)).toEqual(["b", "d", "a", "c"]);
    expect(q.peekPriority()).toBe(1);
    expect(q.dequeue()).toEqual({ element: "b", priority: 1 });
    expect(q.dequeue()).toEqual({ element: "d", priority: 1 });
  });

  test("empty queue: peekPriority Infinity, dequeue undefined, isEmpty true", () => {
    const q = newQueue();
    expect(q.isEmpty()).toBe(true);
    expect(q.peekPriority()).toBe(Infinity);
    expect(q.dequeue()).toBeUndefined();
  });

  test("getAllWithPriority coerces elements to numbers", () => {
    const q = newQueue();
    q.enqueue("1", 2);
    q.enqueue(3, 2);
    q.enqueue(4, 5);
    expect(q.getAllWithPriority(2)).toEqual([1, 3]);
    expect(q.getAllWithPriority(9)).toEqual([]);
  });

  test("remove drops ALL entries for an element, using strict equality", () => {
    const q = newQueue();
    q.enqueue(1, 5);
    q.enqueue(1, 2);
    q.enqueue("1", 3);
    q.remove(1);
    expect(q.values).toEqual([{ element: "1", priority: 3 }]);
  });
});

describe("DijkstraAlgorithm vs reference Dijkstra on 100 random connected graphs", () => {
  test("distances, previous-paths and visit order agree", () => {
    randomSpy = seedMathRandom(2024);
    const pickRng = mulberry32(77);
    let ambiguityRuns = 0;
    for (let run = 0; run < 100; run++) {
      const n = 2 + Math.floor(Math.random() * 9);
      const max = (n * (n - 1)) / 2;
      const total = n - 1 + Math.floor(Math.random() * (max - (n - 1) + 1));
      const nodes = Array.from({ length: n }, (_, i) => i);
      const g = createRandomConnectedGraph(nodes, total);
      const start = Math.floor(Math.random() * n);

      const algo = new DijkstraAlgorithm(g, start);
      if (algo.paused) ambiguityRuns++;
      const clicked = drivePageLike(algo, (choices) =>
        choices[Math.floor(pickRng() * choices.length)]
      );

      const ref = referenceDijkstra(nodes, g.edges, start);
      for (const v of nodes) expect(algo.distances[v]).toBe(ref[v]);

      // every node visited exactly once, in nondecreasing distance order
      expect([...clicked].sort((a, b) => a - b)).toEqual(nodes);
      for (let i = 1; i < clicked.length; i++) {
        expect(ref[clicked[i]]).toBeGreaterThanOrEqual(ref[clicked[i - 1]]);
      }

      // following `previous` back to start sums to the distance
      for (const v of nodes) {
        let cost = 0;
        let cur = v;
        let hops = 0;
        while (cur !== start) {
          const p = algo.previous[cur];
          cost += weightOf(g.edges, p, cur);
          cur = p;
          if (++hops > n) throw new Error("cycle in previous");
        }
        expect(cost).toBe(ref[v]);
      }
      expect(algo.paused).toBe(false);
    }
    // the random graphs (integer weights 1..10) exercise the tie path too
    expect(ambiguityRuns).toBeGreaterThan(0);
  });
});
