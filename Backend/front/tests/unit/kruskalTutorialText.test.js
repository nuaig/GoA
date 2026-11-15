// Checks that the numbers shown to the player in the Kruskal tutorial text
// match the tutorial graph and the MST being built.
import { describe, test, expect } from "vitest";
import { createSpecificGraphKruskalTutorial } from "../../utils/graphRelated/graph.js";
import { tutorialSteps } from "../../src/js/kruskalTutorialSteps.js";

const graph = createSpecificGraphKruskalTutorial();
const weightOf = (u, v) =>
  graph.edges.find(([a, b]) => (a === u && b === v) || (a === v && b === u))?.[2];
const plain = (html) => html.replace(/<br\s*\/?>/g, "\n");

describe("Kruskal intro page", () => {
  const intro = tutorialSteps[0];

  test("is an info page", () => {
    expect(intro.type).toBe("info");
    expect(intro.expectedEdge).toBeNull();
  });

  test("lists every edge sorted by weight with the right weights", () => {
    const listed = [...plain(intro.explanation).matchAll(/(\d)-(\d) \((\d+)\)/g)].map(
      ([, u, v, w]) => [Number(u), Number(v), Number(w)]
    );
    const sorted = [...graph.edges].sort((a, b) => a[2] - b[2]);
    expect(listed).toHaveLength(graph.edges.length);
    for (const [u, v, w] of listed) expect(weightOf(u, v), `${u}-${v}`).toBe(w);
    expect(listed.map((e) => e[2])).toEqual(sorted.map((e) => e[2]));
  });

  test("says how many edges an MST of this graph needs", () => {
    expect(intro.explanation).toContain(`${graph.nodes.length} nodes needs exactly ${graph.nodes.length - 1} edges`);
  });
});

describe("Kruskal edge steps show the correct numbers", () => {
  const edgeSteps = tutorialSteps.filter((s) => Array.isArray(s.expectedEdge));
  // MST built so far after each step (computed up front so one failing step
  // doesn't shift the expectations of the next ones).
  const mstAfter = [];
  edgeSteps.reduce((acc, step) => {
    const next = /mistake/i.test(step.instruction) ? acc : [...acc, step.expectedEdge];
    mstAfter.push(next);
    return next;
  }, []);

  edgeSteps.forEach((step, i) => {
    const [u, v, w] = step.expectedEdge;
    const isMistake = /mistake/i.test(step.instruction);

    test(`edge ${u}-${v}`, () => {
      const text = plain(step.explanation);
      // e.g. "edge 0-1 (weight 2)" or "Edge 0-2 is first in the sorted list (weight 1)"
      expect(text, "explanation names the edge and weight").toMatch(
        new RegExp(`${u}-${v}[^.()]*\\(weight ${w}\\)`)
      );
      expect(weightOf(u, v)).toBe(w);

      if (isMistake) {
        expect(text).toMatch(/cycle/i);
        expect(text).not.toMatch(/MST so far/);
        return;
      }
      const mst = mstAfter[i];
      const total = mst.reduce((sum, e) => sum + e[2], 0);
      const names = mst.map(([a, b]) => `${a}-${b}`).join(", ");
      expect(text, "lists the MST so far").toContain(`${names}.`);
      const sum = mst.length > 1 ? `${mst.map((e) => e[2]).join(" + ")} = ${total}` : `${total}`;
      expect(text, "shows the running total").toContain(`Total weight = ${sum}.`);
    });
  });

  test("every (u-v) mentioned in the text is a real edge", () => {
    for (const step of tutorialSteps) {
      const text = `${step.instruction} ${step.explanation} ${step.errorMessage}`;
      for (const [, u, v] of text.matchAll(/\b(\d)-(\d)\b/g)) {
        expect(weightOf(Number(u), Number(v)), `${u}-${v} in "${step.instruction}"`).toBeDefined();
      }
    }
  });
});
