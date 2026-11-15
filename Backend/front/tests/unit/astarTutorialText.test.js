// Checks that the numbers shown to the player in the A* tutorial text match
// the tutorial graph and a real A* run with h = 0 (f = g).
import { describe, test, expect } from "vitest";
import { createSpecificGraphAstarTutorial } from "../../utils/graphRelated/graph.js";
import { tutorialSteps } from "../../src/js/astarTutorialSteps.js";

const graph = createSpecificGraphAstarTutorial();
const S = graph.startNode;
const G = graph.goalNode;
const label = (n) => (n === S ? "S" : n === G ? "G" : String(n));
const weightOf = (u, v) =>
  graph.edges.find(([a, b]) => (a === u && b === v) || (a === v && b === u))?.[2];
const plain = (html) => html.replace(/<br\s*\/?>/g, "\n");
const actionSteps = tutorialSteps.filter((s) => s.type !== "info");

// State before each action step (computed up front so one failing step
// doesn't shift the expectations of the next ones).
const before = [];
{
  const g = Object.fromEntries(graph.nodes.map((n) => [n, Infinity]));
  g[S] = 0;
  const settled = new Set();
  for (const step of actionSteps) {
    before.push({ g: { ...g }, settled: new Set(settled) });
    if (step.expectedChests) settled.add(step.expectedChests[0]);
    else {
      const [[u, v]] = step.expectedEdges;
      g[v] = Math.min(g[v], g[u] + weightOf(u, v));
    }
  }
}

test("the intro page is an info page that explains f = g + h with h = 0", () => {
  const intro = tutorialSteps[0];
  expect(intro.type).toBe("info");
  expect(intro.explanation).toContain("f(n) = g(n) + h(n)");
  expect(intro.explanation).toContain("h(n) = 0");
});

test("step numbers in the instructions count up without gaps", () => {
  const numbers = actionSteps.map((s) => Number(s.instruction.match(/^Step (\d+):/)?.[1]));
  expect(numbers).toEqual(actionSteps.map((_, i) => i));
});

describe("A* steps show the correct numbers", () => {
  actionSteps.forEach((step, i) => {
    const { g, settled } = before[i];

    if (step.expectedChests) {
      const node = step.expectedChests[0];
      test(`node ${label(node)}`, () => {
        expect(step.instruction).toContain(`node ${label(node)}`);
        if (i === 0) return; // S: the queue has only S
        const queue = graph.nodes
          .filter((n) => !settled.has(n) && Number.isFinite(g[n]))
          .sort((a, b) => g[a] - g[b]);
        const shown = [...plain(step.explanation).matchAll(/(?:node )?(\w) \(f = (\d+)\)/g)].map(
          ([, n, f]) => [n, Number(f)]
        );
        expect(shown, "queue listed in the text").toEqual(queue.map((n) => [label(n), g[n]]));
        expect(node, "settles the node with the smallest f").toBe(queue[0]);
      });
      return;
    }

    const [[u, v]] = step.expectedEdges;
    const w = weightOf(u, v);
    const candidate = g[u] + w;
    const lu = label(u);
    const lv = label(v);

    test(`edge (${lu}, ${lv})`, () => {
      const text = plain(step.explanation);
      expect(step.instruction).toContain(`(${lu}, ${lv})`);
      expect(step.instruction).toContain(`Type ${candidate} `);
      expect(text).toContain(`g(${lu}) = ${g[u]}`);
      expect(text).toContain(`weight of edge (${lu}, ${lv}) = ${w}`);
      expect(text).toContain(`candidate g(${lv}) = ${g[u]} + ${w} = ${candidate}`);
      if (!Number.isFinite(g[v])) {
        // A node seen for the first time enters the queue with f = candidate.
        expect(text).toContain(`enters the queue with f = ${candidate}`);
      } else {
        expect(text).toContain(`g(${lv}) = ${g[v]}`);
        const kept = Math.min(g[v], candidate);
        if (candidate === g[v]) expect(text).toContain(`stays ${kept}`);
        else {
          expect(step.instruction).toContain("choose the smaller value");
          expect(text).toMatch(new RegExp(`smaller (?:one|value), ${kept}\\.`));
        }
      }
    });
  });

  test("the final step reports the shortest path cost to G", () => {
    const { g } = before.at(-1);
    expect(actionSteps.at(-1).explanation).toContain(`costs ${g[G]}`);
  });
});
