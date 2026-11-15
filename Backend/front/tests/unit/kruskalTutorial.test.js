import { describe, test, expect, beforeAll, vi } from "vitest";
import { createSpecificGraphKruskalTutorial } from "../../utils/graphRelated/graph.js";
import { KruskalAlgorithm } from "../../utils/graphRelated/kruskal.js";
import { tutorialSteps } from "../../src/js/kruskalTutorialSteps.js";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

const edgeSteps = () =>
  tutorialSteps.filter((s) => s.type !== "info" && Array.isArray(s.expectedEdge));

const edgeExists = (graph, [u, v, w]) =>
  graph.edges.some(
    ([a, b, c]) => c === w && ((a === u && b === v) || (a === v && b === u))
  );

/** Reference Kruskal: edges in weight order, skipping cycles. */
function referenceMst(graph) {
  const parent = new Map(graph.nodes.map((n) => [n, n]));
  const find = (x) => (parent.get(x) === x ? x : find(parent.get(x)));
  const mst = [];
  for (const [u, v, w] of [...graph.edges].sort((a, b) => a[2] - b[2])) {
    const ru = find(u);
    const rv = find(v);
    if (ru !== rv) {
      parent.set(ru, rv);
      mst.push([u, v, w]);
    }
  }
  return mst;
}

describe("Kruskal tutorial graph", () => {
  test("has the expected MST of total weight 7", () => {
    const mst = referenceMst(createSpecificGraphKruskalTutorial());
    expect(mst).toEqual([
      [0, 2, 1],
      [0, 1, 2],
      [1, 3, 4],
    ]);
    expect(mst.reduce((sum, e) => sum + e[2], 0)).toBe(7);
  });
});

describe("Kruskal tutorialSteps structure", () => {
  test("every step has instruction, explanation and an error message", () => {
    for (const step of tutorialSteps) {
      for (const key of ["instruction", "explanation", "errorMessage"]) {
        expect(typeof step[key], key).toBe("string");
        expect(step[key].length, key).toBeGreaterThan(0);
      }
    }
  });

  test("every expected edge exists in the tutorial graph with that weight", () => {
    const graph = createSpecificGraphKruskalTutorial();
    for (const step of edgeSteps()) {
      expect(edgeExists(graph, step.expectedEdge), step.instruction).toBe(true);
    }
  });

  test("edge instructions name the edge and its weight", () => {
    for (const step of edgeSteps()) {
      const [u, v, w] = step.expectedEdge;
      expect(step.instruction).toContain(`${u}-${v}`);
      expect(step.instruction).toContain(`weight ${w}`);
    }
  });
});

describe("Kruskal tutorialSteps follow a real Kruskal run", () => {
  test("expected edges are accepted in order, except the deliberate cycle mistake", () => {
    const graph = createSpecificGraphKruskalTutorial();
    const algo = new KruskalAlgorithm(graph);
    const outcomes = edgeSteps().map((step) => ({
      step,
      result: algo.selectEdge(step.expectedEdge),
    }));

    const rejected = outcomes.filter(({ result }) => !result.every((r) => r === 1));
    // Exactly one deliberate mistake: right weight order, but it forms a cycle.
    expect(rejected).toHaveLength(1);
    expect(rejected[0].result).toEqual([1, 0]);
    expect(rejected[0].step.instruction.toLowerCase()).toContain("mistake");
    expect(rejected[0].step.explanation.toLowerCase()).toContain("cycle");

    const accepted = outcomes
      .filter(({ result }) => result.every((r) => r === 1))
      .map(({ step }) => step.expectedEdge);
    expect(accepted).toEqual(referenceMst(graph));
    expect(algo.isComplete()).toBe(true);
    expect(algo.currentWeight).toBe(7);
  });

  test("the edge accepted last completes the MST", () => {
    const graph = createSpecificGraphKruskalTutorial();
    const algo = new KruskalAlgorithm(graph);
    const steps = edgeSteps();
    steps.forEach((step, i) => {
      algo.selectEdge(step.expectedEdge);
      if (i < steps.length - 1) expect(algo.isComplete()).toBe(false);
    });
    expect(algo.isComplete()).toBe(true);
  });
});
