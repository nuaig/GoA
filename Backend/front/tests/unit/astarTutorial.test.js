import { describe, test, expect } from "vitest";
import { createSpecificGraphAstarTutorial } from "../../utils/graphRelated/graph.js";
import { tutorialSteps } from "../../src/js/astarTutorialSteps.js";

// The A* tutorial uses heuristic weight 0 (Astar.js setUpTutorialModel), so
// f(n) = g(n) and A* expands nodes exactly like Dijkstra until the goal.
const graph = createSpecificGraphAstarTutorial();
const S = graph.startNode;
const G = graph.goalNode;
const weightOf = (u, v) =>
  graph.edges.find(([a, b]) => (a === u && b === v) || (a === v && b === u))?.[2];
const actionSteps = () => tutorialSteps.filter((s) => s.type !== "info");

describe("A* tutorial graph", () => {
  test("starts at S = 0 and targets G = 4", () => {
    expect(S).toBe(0);
    expect(G).toBe(4);
  });
});

describe("A* tutorialSteps structure", () => {
  test("every step has instruction, explanation and an error message", () => {
    for (const step of tutorialSteps) {
      for (const key of ["instruction", "explanation", "errorMessage"]) {
        expect(typeof step[key], key).toBe("string");
        expect(step[key].length, key).toBeGreaterThan(0);
      }
    }
  });

  test("each action step is a node step or an edge step, never both", () => {
    for (const step of actionSteps()) {
      expect(Array.isArray(step.expectedChests) !== Array.isArray(step.expectedEdges)).toBe(true);
      if (step.expectedEdges) {
        expect(step.expectedEdges).toHaveLength(1);
        expect(Object.keys(step.updatedDistance)).toHaveLength(1);
      }
    }
  });

  test("the first action is clicking S and the last is clicking G", () => {
    const steps = actionSteps();
    expect(steps[0].expectedChests).toEqual([S]);
    expect(steps.at(-1).expectedChests).toEqual([G]);
  });
});

describe("A* tutorialSteps follow a real A* run with h = 0", () => {
  test("simulating the scripted steps reproduces A* exactly", () => {
    const g = Object.fromEntries(graph.nodes.map((n) => [n, Infinity]));
    g[S] = 0;
    const visited = new Set();
    const relaxed = new Set();
    let current = null;

    const unrelaxedOutOf = (u) =>
      graph.edges
        .filter(([a, b]) => a === u || b === u)
        .map(([a, b]) => (a === u ? b : a))
        .filter((v) => !visited.has(v) && !relaxed.has(`${u}-${v}`));

    actionSteps().forEach((step, i) => {
      const where = `action step ${i}: "${step.instruction}"`;
      if (step.expectedChests) {
        if (current !== null) expect(unrelaxedOutOf(current), where).toEqual([]);
        const [node] = step.expectedChests;
        const open = graph.nodes.filter((n) => !visited.has(n));
        expect(visited.has(node), where).toBe(false);
        expect(g[node], where).toBe(Math.min(...open.map((n) => g[n])));
        visited.add(node);
        current = node;
        relaxed.clear();
      } else {
        const [[u, v]] = step.expectedEdges;
        const w = weightOf(u, v);
        expect(w, `${where} edge exists`).toBeDefined();
        expect(u, `${where} starts at the current node`).toBe(current);
        expect(visited.has(v), `${where} goes to an unvisited node`).toBe(false);
        // The player types the CANDIDATE g(u) + w; the game then keeps the smaller.
        const [node, value] = Object.entries(step.updatedDistance)[0];
        expect(Number(node), where).toBe(v);
        expect(value, `${where} candidate`).toBe(g[u] + w);
        g[v] = Math.min(g[v], g[u] + w);
        relaxed.add(`${u}-${v}`);
      }
    });

    expect(current).toBe(G);
    expect(g[G]).toBe(4); // S -> 2 -> G (1 + 3), also S -> 2 -> 3 -> G (1 + 2 + 1)
  });
});
