// E2E baseline for Kruskal regular (non-tutorial) mode, level 1.
// The graph is random (5 chests, 8 edges); it is read through the dev hook
// (window.__roomTest.graphEdges) and the MST is computed here. The game's
// KruskalAlgorithm.selectEdge() only accepts a minimum-weight edge that does
// not form a cycle (any tie order); see safeKruskalOrder for the order used.
import { test, expect } from "@playwright/test";
import {
  hook,
  openRoom,
  startRegularLevel1,
  clickEdge,
  snapshot,
  edgeSet,
  hintIcon,
  restartLevel,
} from "./support/kruskalPage.js";
import { note } from "./support/roomPage.js";

const WRONG_TEXT = "Incorrect Selection. Make sure to meet the following conditions:";

/** Reference Kruskal: edges sorted by weight, skipping cycles. */
function kruskal(nodes, edges) {
  const parent = Array.from({ length: nodes }, (_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const mst = [];
  for (const [u, v, w] of [...edges].sort((a, b) => a[2] - b[2])) {
    const ru = find(u);
    const rv = find(v);
    if (ru !== rv) {
      parent[ru] = rv;
      mst.push([u, v, w]);
    }
  }
  return mst;
}

/**
 * A Kruskal order the game accepts AND that does not freeze the page, or null.
 *
 * Accepted: selectEdge() takes an edge iff it forms no cycle and has the
 * minimum weight among non-cycle edges, i.e. Kruskal with any tie order.
 *
 * NOTE: current behavior, a bug. updateNodeColorsForSameTree() in
 * src/js/kruskal.js picks a colour for a new component with
 *   do { newColor = 0x00ff00; } while (usedColors.has(newColor));
 * Green is the only colour, so selecting an edge between two uncoloured
 * nodes while another (unmerged) component is green loops forever and the
 * page freezes. Merging two coloured components deletes green from
 * usedColors again. This models that and searches the tie orders.
 */
function safeKruskalOrder(nodes, edges) {
  const find = (p, x) => (p[x] === x ? x : find(p, p[x]));
  const search = (selected, parent, coloured, greenUsed) => {
    if (selected.length === nodes - 1) return selected;
    const free = edges.filter(
      (e) => !selected.includes(e) && find(parent, e[0]) !== find(parent, e[1])
    );
    const min = Math.min(...free.map((e) => e[2]));
    for (const e of free.filter((x) => x[2] === min)) {
      const [u, v] = e;
      let green = greenUsed;
      if (coloured.has(u) && coloured.has(v)) green = false; // usedColors.delete(endColor)
      else if (!coloured.has(u) && !coloured.has(v)) {
        if (greenUsed) continue; // would freeze the page
        green = true;
      }
      const p = [...parent];
      p[find(p, u)] = find(p, v);
      const root = find(p, u);
      const comp = parent.map((_, x) => x).filter((x) => find(p, x) === root);
      const found = search([...selected, e], p, new Set([...coloured, ...comp]), green);
      if (found) return found;
    }
    return null;
  };
  return search([], Array.from({ length: nodes }, (_, i) => i), new Set(), false);
}

/** Edges the game rejects as the FIRST pick: heavier than the minimum (no cycles yet). */
async function firstWrongEdges(page) {
  const edges = await hook(page, "graphEdges");
  const min = Math.min(...edges.map((e) => e[2]));
  const wrong = edges.filter((e) => e[2] > min);
  expect(wrong.length, `all edges have weight ${min}`).toBeGreaterThan(0);
  return wrong;
}

/** Captures POST /api/gamesessions bodies (falls back to the mock in api.js). */
async function captureSessions(page) {
  const posts = [];
  await page.route("**/api/gamesessions", async (route) => {
    if (route.request().method() === "POST") posts.push(route.request().postDataJSON());
    await route.fallback();
  });
  return posts;
}

test.describe("Kruskal regular mode", () => {
  let errors;
  let posts;

  test.beforeEach(async ({ page }) => {
    ({ errors } = await openRoom(page));
    posts = await captureSessions(page);
    await startRegularLevel1(page);
  });

  test.afterEach(() => {
    expect(errors, "uncaught page errors").toEqual([]);
  });

  test("plays level 1 to completion", async ({ page }) => {
    // About 1 in 3 random level-1 graphs has no order that avoids the colour
    // freeze (see safeKruskalOrder); restart the level until one does.
    let edges;
    let mst;
    for (let attempt = 0; attempt < 15; attempt++) {
      edges = await hook(page, "graphEdges");
      mst = safeKruskalOrder(5, edges);
      if (mst) break;
      note("restart", `no freeze-free Kruskal order for ${JSON.stringify(edges)}`);
      await restartLevel(page);
    }
    expect(mst, "no freeze-free graph after 15 restarts").toBeTruthy();
    expect(edges).toHaveLength(8);
    // Same total as a plain Kruskal run.
    const total = (es) => es.reduce((sum, e) => sum + e[2], 0);
    expect(total(mst)).toBe(total(kruskal(5, edges)));
    const completion = page.locator(".modal__completion");

    let weight = 0;
    for (const [i, [u, v, w]] of mst.entries()) {
      await expect(completion).toBeHidden();
      await clickEdge(page, u, v);
      weight += w;
      const s = await snapshot(page);
      expect(s.selected).toHaveLength(i + 1);
      expect(await hook(page, "isEdgeSelected", u, v)).toBe(true);
      expect(s.weight).toBe(weight);
      expect(s.hint).toBe(false);
      if (i < mst.length - 1) expect(s.ui).toBe(`Correct! Current weight is ${weight}.`);
    }

    await expect(completion).toBeVisible();
    await expect(page.locator(".modal__completion__header")).toHaveText("Congratulations!");
    await expect(page.locator(".label__completion_text")).toContainText("level 1");
    await expect(page.locator("#UI-Text")).toContainText(
      `The total weight of the minimum spanning tree is ${weight}.`
    );
    expect(edgeSet(await hook(page, "selectedEdges"))).toEqual(edgeSet(mst));
    expect(await hook(page, "health")).toBe(4); // no mistakes made
    expect(await page.evaluate(() => [0, 1, 2, 3, 4].every((n) => window.__roomTest.isChestOpened(n)))).toBe(true);

    await expect.poll(() => posts.length, { message: "no game session POSTed" }).toBe(1);
    await page.waitForTimeout(1_000);
    expect(posts).toHaveLength(1);
    expect(posts[0].gameSession).toMatchObject({
      game_name: "Kruskal",
      mode: "regular",
      level: 1,
      total_mistakes: 0,
      success: true,
    });
  });

  test("a wrong edge costs exactly one life", async ({ page }) => {
    const [u, v] = (await firstWrongEdges(page))[0];
    expect(await hook(page, "health")).toBe(4);
    await expect(page.locator(".Hint-Text")).toBeHidden();

    await clickEdge(page, u, v);

    expect(await hook(page, "health")).toBe(3);
    await expect(page.locator("#UI-Text")).toHaveText(WRONG_TEXT);
    await expect(page.locator(".Hint-Text")).toBeVisible();
    expect(await hintIcon(page, 0)).toBe("wrong"); // not the minimum weight
    expect(await hintIcon(page, 1)).toBe("correct"); // nothing selected -> no cycle
    expect(await hook(page, "isEdgeSelected", u, v)).toBe(false);
    expect(await hook(page, "selectedEdges")).toEqual([]);
    // Nothing else happens later (e.g. the 3 s red-flash timer).
    await page.waitForTimeout(3_500);
    expect(await hook(page, "health")).toBe(3);
    await expect(page.locator(".modal__completion")).toBeHidden();
    expect(posts).toHaveLength(0);

    // A correct edge still works afterwards and hides the hint list.
    const [first] = kruskal(5, await hook(page, "graphEdges"));
    await clickEdge(page, first[0], first[1]);
    expect(await hook(page, "isEdgeSelected", first[0], first[1])).toBe(true);
    await expect(page.locator(".Hint-Text")).toBeHidden();
    expect(await hook(page, "health")).toBe(3);
  });

  test("losing all lives shows the failure modal and POSTs success false", async ({ page }) => {
    const [u, v] = (await firstWrongEdges(page))[0];
    const completion = page.locator(".modal__completion");

    // health 4 -> 3 -> 2 -> 1 -> 0 -> -1; the game ends when health < 0.
    for (const expected of [3, 2, 1, 0, -1]) {
      await expect(completion).toBeHidden();
      await clickEdge(page, u, v);
      expect(await hook(page, "health")).toBe(expected);
    }

    await expect(completion).toBeVisible();
    await expect(page.locator(".modal__completion__header")).toHaveText("Game Over!");
    await expect(page.locator(".label__completion_text")).toContainText("You ran out of lives");
    expect(await hook(page, "selectedEdges")).toEqual([]);

    await expect.poll(() => posts.length, { message: "no game session POSTed" }).toBe(1);
    await page.waitForTimeout(1_000);
    expect(posts).toHaveLength(1);
    expect(posts[0].gameSession).toMatchObject({
      game_name: "Kruskal",
      mode: "regular",
      level: 1,
      total_mistakes: 5,
      success: false,
    });
  });
});
