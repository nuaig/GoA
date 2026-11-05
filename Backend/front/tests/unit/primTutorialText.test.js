// Checks that the numbers shown to the player in the Prim tutorial text match
// the tutorial graph and the tree being grown from node 0.
import { describe, test, expect } from "vitest";
import { createSpecificGraphPrimTutorial } from "../../utils/graphRelated/graph.js";
import { tutorialSteps } from "../../src/js/primTutorialSteps.js";

const START = 0;
const graph = createSpecificGraphPrimTutorial();
const weightOf = (u, v) =>
  graph.edges.find(([a, b]) => (a === u && b === v) || (a === v && b === u))?.[2];
const plain = (html) => html.replace(/<br\s*\/?>/g, "\n");
const isMistake = (step) => /mistake/i.test(step.instruction);
const edgeSteps = tutorialSteps.filter((s) => Array.isArray(s.expectedEdge));

// Tree state before each edge step (computed up front so one failing step
// doesn't shift the expectations of the next ones).
const before = [];
{
  let visited = [START];
  let mst = [];
  for (const step of edgeSteps) {
    before.push({ visited: [...visited], mst: [...mst] });
    if (!isMistake(step)) {
      const [u, v] = step.expectedEdge;
      mst = [...mst, step.expectedEdge];
      visited = [...new Set([...visited, u, v])].sort((a, b) => a - b);
    }
  }
}

test("the intro page is an info page that names node 0 as the start", () => {
  expect(tutorialSteps[0].type).toBe("info");
  expect(tutorialSteps[0].explanation).toContain("node 0");
  expect(tutorialSteps[0].explanation).toContain(
    `${graph.nodes.length} nodes needs exactly ${graph.nodes.length - 1} edges`
  );
});

describe("Prim edge steps show the correct numbers", () => {
  edgeSteps.forEach((step, i) => {
    const [u, v, w] = step.expectedEdge;
    const { visited, mst } = before[i];

    test(`edge ${u}-${v}${isMistake(step) ? " (mistake)" : ""}`, () => {
      const text = plain(step.explanation);
      expect(text, "names the edge and weight").toMatch(
        new RegExp(`${u}-${v}[^.()]*\\(weight ${w}\\)`)
      );
      if (!isMistake(step) || text.includes("Visited:")) {
        expect(text, "lists the visited nodes").toContain(`Visited: {${visited.join(", ")}}`);
      }

      if (isMistake(step)) {
        const bothVisited = visited.includes(u) && visited.includes(v);
        const noneVisited = !visited.includes(u) && !visited.includes(v);
        expect(bothVisited || noneVisited, "a mistake edge must not leave the tree").toBe(true);
        if (bothVisited) expect(text).toMatch(/cycle/i);
        if (noneVisited) expect(text).toMatch(/not connected to the tree/i);
        expect(text).not.toMatch(/MST so far/);
        return;
      }

      // The candidate list is exactly the edges leaving the tree, and the
      // expected edge is the cheapest of them.
      const crossing = graph.edges
        .filter(([a, b]) => visited.includes(a) !== visited.includes(b))
        .sort((a, b) => a[2] - b[2]);
      const listLine = text.split("\n")[0];
      const listed = [...listLine.matchAll(/(\d)-(\d) \(weight (\d+)\)/g)].map(([, a, b, c]) =>
        [Number(a), Number(b), Number(c)]
      );
      expect(listed.length, "lists every edge leaving the tree").toBe(crossing.length);
      for (const [a, b, c] of listed) {
        expect(visited.includes(a) !== visited.includes(b), `${a}-${b} leaves the tree`).toBe(true);
        expect(weightOf(a, b), `${a}-${b}`).toBe(c);
      }
      expect(w).toBe(crossing[0][2]);

      const after = [...mst, step.expectedEdge];
      const total = after.reduce((s, e) => s + e[2], 0);
      const sum = after.length > 1 ? `${after.map((e) => e[2]).join(" + ")} = ${total}` : `${total}`;
      expect(text, "lists the MST so far").toContain(after.map(([a, b]) => `${a}-${b}`).join(", ") + ".");
      expect(text, "shows the running total").toContain(`Total weight = ${sum}.`);
    });
  });

  test("every (u-v) mentioned in the text is a real edge", () => {
    for (const step of tutorialSteps) {
      const text = `${step.instruction} ${step.explanation} ${step.errorMessage}`;
      for (const [, a, b] of text.matchAll(/\b(\d)-(\d)\b/g)) {
        expect(weightOf(Number(a), Number(b)), `${a}-${b} in "${step.instruction}"`).toBeDefined();
      }
    }
  });
});
