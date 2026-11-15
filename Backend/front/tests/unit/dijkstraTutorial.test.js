import { describe, test, expect, beforeAll, vi } from "vitest";
import { createSpecificGraphDijkstraTutorial } from "../../utils/graphRelated/graph.js";
import { DijkstraAlgorithm } from "../../utils/graphRelated/dijkstra.js";
import { tutorialSteps } from "../../src/js/dijkstraTutorialSteps.js";

const EXPECTED_FINAL_DISTANCES = { 0: 0, 1: 2, 2: 1, 3: 3, 4: 4 };

beforeAll(() => {
  // The algorithm logs every operation; keep test output readable.
  vi.spyOn(console, "log").mockImplementation(() => {});
});

function weightOf(graph, u, v) {
  const edge = graph.edges.find(
    ([a, b]) => (a === u && b === v) || (a === v && b === u)
  );
  return edge ? edge[2] : undefined;
}

// Steps the player must act on (info pages only need a "Next" press).
const actionSteps = () => tutorialSteps.filter((s) => s.type !== "info");

describe("DijkstraAlgorithm on the tutorial graph", () => {
  test("computes the expected shortest distances from node 0", () => {
    const algo = new DijkstraAlgorithm(createSpecificGraphDijkstraTutorial());
    const distances = Object.fromEntries(
      Object.entries(algo.distances).map(([k, v]) => [Number(k), v])
    );
    expect(distances).toEqual(EXPECTED_FINAL_DISTANCES);
  });
});

describe("tutorialSteps structure", () => {
  test("every step has instruction, explanation and an error message", () => {
    for (const step of tutorialSteps) {
      expect(typeof step.instruction).toBe("string");
      expect(step.instruction.length).toBeGreaterThan(0);
      expect(typeof step.explanation).toBe("string");
      expect(step.explanation.length).toBeGreaterThan(0);
      expect(typeof step.errorMessage).toBe("string");
    }
  });

  test("each action step is either a node step or an edge step, never both", () => {
    for (const step of actionSteps()) {
      const isNode = Array.isArray(step.expectedChests);
      const isEdge = Array.isArray(step.expectedEdges);
      expect(isNode !== isEdge).toBe(true);
      if (isEdge) {
        expect(step.expectedEdges).toHaveLength(1);
        expect(Object.keys(step.updatedDistance)).toHaveLength(1);
      }
    }
  });

  test("info steps (if any) expect no clicks", () => {
    for (const step of tutorialSteps.filter((s) => s.type === "info")) {
      expect(step.expectedChests ?? null).toBeNull();
      expect(step.expectedEdges ?? null).toBeNull();
    }
  });

  test("first action step is clicking the source node 0", () => {
    expect(actionSteps()[0].expectedChests).toEqual([0]);
  });
});

describe("tutorialSteps follow a correct Dijkstra run", () => {
  test("simulating the scripted steps reproduces Dijkstra exactly", () => {
    const graph = createSpecificGraphDijkstraTutorial();
    const dist = Object.fromEntries(graph.nodes.map((n) => [n, Infinity]));
    dist[0] = 0;
    const visited = new Set();
    const relaxedFrom = new Set(); // edges relaxed out of the current node
    let current = null;

    const unrelaxedOutOf = (u) =>
      graph.edges
        .filter(([a, b]) => a === u || b === u)
        .map(([a, b]) => (a === u ? b : a))
        .filter((v) => !visited.has(v) && !relaxedFrom.has(`${u}-${v}`));

    actionSteps().forEach((step, i) => {
      const where = `action step ${i}: "${step.instruction}"`;

      if (step.expectedChests) {
        // All edges out of the previous node must be relaxed before moving on.
        if (current !== null) {
          expect(unrelaxedOutOf(current), where).toEqual([]);
        }
        const [node] = step.expectedChests;
        const unvisited = graph.nodes.filter((n) => !visited.has(n));
        const minDist = Math.min(...unvisited.map((n) => dist[n]));
        expect(visited.has(node), where).toBe(false);
        expect(dist[node], where).toBe(minDist);
        visited.add(node);
        current = node;
        relaxedFrom.clear();
      } else {
        const [[u, v]] = step.expectedEdges;
        const w = weightOf(graph, u, v);
        expect(w, `${where} edge exists`).toBeDefined();
        expect(u, `${where} starts at the current node`).toBe(current);
        expect(visited.has(v), `${where} goes to an unvisited node`).toBe(false);

        const expected = Math.min(dist[v], dist[u] + w);
        const [node, value] = Object.entries(step.updatedDistance)[0];
        expect(Number(node), where).toBe(v);
        expect(value, where).toBe(expected);
        dist[v] = expected;
        relaxedFrom.add(`${u}-${v}`);
      }
    });

    expect(visited.size).toBe(graph.nodes.length);
    expect(dist).toEqual(EXPECTED_FINAL_DISTANCES);
  });

  test("edge instructions tell the player to type the correct value", () => {
    for (const step of actionSteps().filter((s) => s.expectedEdges)) {
      const [[u, v]] = step.expectedEdges;
      const value = Object.values(step.updatedDistance)[0];
      expect(step.instruction).toContain(`(${u}, ${v})`);
      expect(step.instruction).toContain(`Type ${value} `);
    }
  });

  test("node instructions name the node to click", () => {
    for (const step of actionSteps().filter((s) => s.expectedChests)) {
      expect(step.instruction).toContain(`node ${step.expectedChests[0]}`);
    }
  });
});
