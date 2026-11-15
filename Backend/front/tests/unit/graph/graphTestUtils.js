// Shared helpers for the graph/algorithm characterization tests.
// Not a test file itself (no .test.js suffix), so vitest does not collect it.
import { vi } from "vitest";

/** Small deterministic PRNG (mulberry32). Returns floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Replaces Math.random with a seeded PRNG. Returns the spy; call
 * `spy.mockRestore()` when done (do NOT use vi.restoreAllMocks, which would
 * also restore the console.log silencer).
 */
export function seedMathRandom(seed) {
  const rng = mulberry32(seed);
  return vi.spyOn(Math, "random").mockImplementation(rng);
}

/** Replaces Math.random with a fixed sequence of values (throws when exhausted). */
export function sequenceMathRandom(values) {
  const queue = [...values];
  return vi.spyOn(Math, "random").mockImplementation(() => {
    if (queue.length === 0) throw new Error("Math.random sequence exhausted");
    return queue.shift();
  });
}

export const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function isConnected(nodes, edges) {
  if (nodes.length === 0) return true;
  const adj = new Map(nodes.map((n) => [n, []]));
  for (const [a, b] of edges) {
    adj.get(a).push(b);
    adj.get(b).push(a);
  }
  const seen = new Set([nodes[0]]);
  const stack = [nodes[0]];
  while (stack.length) {
    const cur = stack.pop();
    for (const nb of adj.get(cur)) {
      if (!seen.has(nb)) {
        seen.add(nb);
        stack.push(nb);
      }
    }
  }
  return seen.size === nodes.length;
}

/** Plain O(n^2) reference Dijkstra. Returns { [node]: distance } (number keys). */
export function referenceDijkstra(nodes, edges, start) {
  const dist = {};
  for (const n of nodes) dist[n] = Infinity;
  dist[start] = 0;
  const done = new Set();
  for (;;) {
    let best = null;
    for (const n of nodes) {
      if (!done.has(n) && dist[n] !== Infinity && (best === null || dist[n] < dist[best])) {
        best = n;
      }
    }
    if (best === null) break;
    done.add(best);
    for (const [a, b, w] of edges) {
      if (a === best && dist[best] + w < dist[b]) dist[b] = dist[best] + w;
      if (b === best && dist[best] + w < dist[a]) dist[a] = dist[best] + w;
    }
  }
  return dist;
}

/** Reference Kruskal MST total weight (assumes nodes are 0..n-1 or arbitrary ids). */
export function referenceMstWeight(nodes, edges) {
  const parent = new Map(nodes.map((n) => [n, n]));
  const find = (x) => (parent.get(x) === x ? x : find(parent.get(x)));
  let total = 0;
  let count = 0;
  for (const [a, b, w] of [...edges].sort((x, y) => x[2] - y[2])) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent.set(ra, rb);
      total += w;
      count++;
    }
  }
  return { total, count };
}

/** Weight of the undirected edge {u, v} in an edge list, or undefined. */
export function weightOf(edges, u, v) {
  const e = edges.find(([a, b]) => (a === u && b === v) || (a === v && b === u));
  return e ? e[2] : undefined;
}

/**
 * Drives a DijkstraAlgorithm / AstarAlgorithm the way the page scripts do:
 * walk the steps in order; on a node step, "click" a node (for an ambiguity
 * step pick one of expectedChests with `pick`) and call resumeFromNode on it.
 * Returns the sequence of clicked nodes.
 *
 * The page calls resumeFromNode on every correct chest click (it is a no-op
 * for nodes the algorithm already visited). For A*, the page does NOT call
 * resumeFromNode for the goal node; set `skipGoal` to mirror that.
 */
export function drivePageLike(algo, pick = (choices) => choices[0], { skipGoal = null } = {}) {
  const clicked = [];
  let i = 0;
  while (i < algo.steps.length) {
    const step = algo.steps[i];
    if (Array.isArray(step.expectedChests)) {
      const node =
        step.expectedChests.length > 1 ? pick(step.expectedChests) : step.expectedChests[0];
      clicked.push(node);
      if (skipGoal !== null && node === skipGoal) {
        i++;
        break;
      }
      algo.resumeFromNode(node);
    }
    i++;
  }
  return clicked;
}
