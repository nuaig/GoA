// Checks that the numbers shown to the player in the Dijkstra tutorial text
// match the tutorial graph and a real Dijkstra run.
// (The step sequence itself is checked in dijkstraTutorial.test.js.)
import { describe, test, expect } from "vitest";
import { createSpecificGraphDijkstraTutorial } from "../../utils/graphRelated/graph.js";
import { tutorialSteps } from "../../src/js/dijkstraTutorialSteps.js";

const graph = createSpecificGraphDijkstraTutorial();

// ---------- small helpers ----------

function weightOf(u, v) {
  const edge = graph.edges.find(
    ([a, b]) => (a === u && b === v) || (a === v && b === u)
  );
  return edge ? edge[2] : undefined;
}

// How a distance is written in the tutorial text.
const fmt = (d) => (d === Infinity ? "∞" : String(d));

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Explanations are HTML; turn <br> into line breaks so phrases read naturally.
const plainText = (html) => html.replace(/<br\s*\/?>/gi, "\n");

const label = (step) => `"${step.instruction}"`;

// "a + b = c" with any spacing.
const sumPattern = (a, b, c) =>
  new RegExp(`(?<!\\d)${escapeRegExp(fmt(a))}\\s*\\+\\s*${escapeRegExp(fmt(b))}\\s*=\\s*${escapeRegExp(fmt(c))}(?!\\d)`);

// weight of edge (u, v) = w
const weightPattern = (u, v, w) =>
  new RegExp(`weight of edge \\(${u},\\s*${v}\\)\\s*=\\s*${w}(?!\\d)`, "i");

// distance from source to node "n" = d   (or, for the source itself,
// distance from source "n" to "n" = d)
const distancePattern = (n, d) =>
  new RegExp(
    `distance from source (?:to node "${n}"|"${n}" to "${n}")\\s*=\\s*${escapeRegExp(fmt(d))}(?!\\d)`,
    "i"
  );

// Parses "Unvisited nodes: node 1 = 2, node 3 = ∞." into { 1: 2, 3: Infinity }.
// Returns null when the explanation has no such list.
function parseUnvisitedList(text) {
  const match = text.match(/Unvisited nodes:([^.\n]*)/i);
  if (!match) return null;
  const listed = {};
  for (const [, node, value] of match[1].matchAll(/node (\d+)\s*=\s*(\d+|∞)/g)) {
    listed[Number(node)] = value === "∞" ? Infinity : Number(value);
  }
  return listed;
}

// All "(a, b)" pairs of numbers mentioned in a text.
const mentionedEdges = (text) =>
  [...text.matchAll(/\((\d+),\s*(\d+)\)/g)].map(([, a, b]) => [Number(a), Number(b)]);

// ---------- simulate the scripted steps ----------
// Records, for every action step, the distances and visited set BEFORE it.
function simulate(steps) {
  const dist = Object.fromEntries(graph.nodes.map((n) => [n, Infinity]));
  dist[0] = 0;
  const visited = new Set();
  const edgeSteps = [];
  const nodeSteps = [];

  for (const step of steps.filter((s) => s.type !== "info")) {
    if (step.expectedChests) {
      const [node] = step.expectedChests;
      const unvisited = Object.fromEntries(
        graph.nodes.filter((n) => !visited.has(n)).map((n) => [n, dist[n]])
      );
      nodeSteps.push({ name: `node ${node}`, step, node, unvisited, isFirst: nodeSteps.length === 0 });
      visited.add(node);
    } else {
      const [[u, v]] = step.expectedEdges;
      const w = weightOf(u, v);
      const du = dist[u];
      const dv = dist[v];
      edgeSteps.push({ name: `edge (${u}, ${v})`, step, u, v, w, du, dv, sum: du + w });
      dist[v] = Math.min(dv, du + w);
    }
  }
  return { edgeSteps, nodeSteps };
}

const { edgeSteps, nodeSteps } = simulate(tutorialSteps);

// ---------- tests ----------

describe("edge step explanations show the correct numbers", () => {
  test.each(edgeSteps)("$name", ({ step, u, v, w, du, dv, sum }) => {
    const text = plainText(step.explanation);
    const where = `${label(step)}\nexplanation: ${text}\n`;

    expect(w, `${where}edge (${u}, ${v}) is not in the graph`).toBeDefined();

    expect(text, `${where}should state "weight of edge (${u}, ${v}) = ${w}"`).toMatch(
      weightPattern(u, v, w)
    );
    expect(text, `${where}should state the distance to node ${u} = ${fmt(du)}`).toMatch(
      distancePattern(u, du)
    );
    expect(text, `${where}should state the distance to node ${v} = ${fmt(dv)}`).toMatch(
      distancePattern(v, dv)
    );
    expect(text, `${where}should state "${fmt(du)} + ${w} = ${fmt(sum)}"`).toMatch(
      sumPattern(du, w, sum)
    );

    const comparison = sum < dv ? "is less than" : "is not less than";
    expect(
      text,
      `${where}should say "${fmt(sum)} ${comparison} ${fmt(dv)}"`
    ).toMatch(new RegExp(`(?<!\\d)${escapeRegExp(fmt(sum))} ${comparison} ${escapeRegExp(fmt(dv))}(?!\\d)`));
    if (sum < dv) {
      expect(text, `${where}must not say "is not less than"`).not.toMatch(/is not less than/);
    }
  });
});

describe("node step explanations list the correct unvisited distances", () => {
  const laterNodeSteps = nodeSteps.filter((s) => !s.isFirst);

  test.each(laterNodeSteps)("$name", ({ step, unvisited }) => {
    const text = plainText(step.explanation);
    const listed = parseUnvisitedList(text);
    if (listed === null) return; // no list shown on this step; nothing to check

    expect(
      listed,
      `${label(step)}\nexplanation: ${text}\n"Unvisited nodes" list should match the real distances`
    ).toEqual(unvisited);
  });
});

describe("tutorial text only mentions real edges", () => {
  test.each(tutorialSteps.map((step, i) => ({ name: `step ${i}`, step })))("$name", ({ step }) => {
    const texts = [step.instruction, step.explanation, step.errorMessage];
    for (const text of texts) {
      for (const [a, b] of mentionedEdges(text)) {
        expect(
          weightOf(a, b),
          `${label(step)} mentions edge (${a}, ${b}), which is not in the graph`
        ).toBeDefined();
      }
    }
  });
});
