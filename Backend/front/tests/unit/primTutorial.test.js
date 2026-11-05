import { describe, test, expect, beforeAll, vi } from "vitest";
import { createSpecificGraphPrimTutorial } from "../../utils/graphRelated/graph.js";
import { PrimAlgorithm } from "../../utils/graphRelated/prims.js";
import { tutorialSteps } from "../../src/js/primTutorialSteps.js";

const START = 0; // prim.js primSetup() always starts from node 0

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

const edgeSteps = () =>
  tutorialSteps.filter((s) => s.type !== "info" && Array.isArray(s.expectedEdge));
const isMistake = (step) => /mistake/i.test(step.instruction);
const edgeExists = (graph, [u, v, w]) =>
  graph.edges.some(([a, b, c]) => c === w && ((a === u && b === v) || (a === v && b === u)));

/** Reference Prim from START: cheapest edge leaving the tree each time. */
function referenceMst(graph) {
  const inTree = new Set([START]);
  const mst = [];
  while (inTree.size < graph.nodes.length) {
    const next = graph.edges
      .filter(([u, v]) => inTree.has(u) !== inTree.has(v))
      .sort((a, b) => a[2] - b[2])[0];
    mst.push(next);
    inTree.add(next[0]).add(next[1]);
  }
  return mst;
}

describe("Prim tutorial graph", () => {
  test("has the expected MST from node 0, total weight 12", () => {
    const mst = referenceMst(createSpecificGraphPrimTutorial());
    expect(mst).toEqual([
      [0, 2, 1],
      [0, 1, 3],
      [1, 3, 2],
      [1, 4, 6],
    ]);
    expect(mst.reduce((s, e) => s + e[2], 0)).toBe(12);
  });
});

describe("Prim tutorialSteps structure", () => {
  test("every step has instruction, explanation and an error message", () => {
    for (const step of tutorialSteps) {
      for (const key of ["instruction", "explanation", "errorMessage"]) {
        expect(typeof step[key], key).toBe("string");
        expect(step[key].length, key).toBeGreaterThan(0);
      }
    }
  });

  test("every expected edge exists in the tutorial graph with that weight", () => {
    const graph = createSpecificGraphPrimTutorial();
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

describe("Prim tutorialSteps follow a real Prim run from node 0", () => {
  test("correct steps build the MST; each mistake is rejected for the reason it explains", () => {
    const graph = createSpecificGraphPrimTutorial();
    const algo = new PrimAlgorithm(graph);
    algo.setStartingNode(START);
    const accepted = [];

    for (const step of edgeSteps()) {
      const result = algo.selectEdge(step.expectedEdge);
      if (isMistake(step)) {
        expect(result.every((r) => r === 1), step.instruction).toBe(false);
        // [minWeight, noCycle, touchesTree]
        const text = step.explanation.toLowerCase();
        if (result[1] === 0) expect(text, "cycle mistake").toContain("cycle");
        if (result[2] === 0) expect(text, "not-touching mistake").toMatch(/visited|tree/);
      } else {
        expect(result, step.instruction).toEqual([1, 1, 1]);
        accepted.push(step.expectedEdge);
      }
    }

    expect(accepted).toEqual(referenceMst(graph));
    expect(algo.isComplete()).toBe(true);
    expect(algo.currentWeight).toBe(12);
  });
});
