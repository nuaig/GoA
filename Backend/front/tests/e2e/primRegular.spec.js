// E2E baseline for Prim regular (non-tutorial) mode, level 1.
// The graph is random (5 chests, 7 edges); it is read through the dev hook
// (window.__roomTest.graphEdges / treeNodes) and the MST is computed here.
// The game's PrimAlgorithm.selectEdge() accepts any minimum-weight edge from
// the tree to a node outside it (getNextEdges(), any tie order). The start
// node is always 0 (primSetup() in src/js/prim.js).
//
// Unlike Kruskal, prim.js never calls updateNodeColorsForSameTree() (it is
// guarded by currentAlgorithm === "Kruskal"), so there is no colour-loop freeze.
import { test, expect } from "@playwright/test";
import {
  hook,
  openRoom,
  startRegularLevel1,
  clickEdge,
  snapshot,
  edgeSet,
  hintIcon,
} from "./support/primPage.js";

const WRONG_TEXT = "Incorrect Selection. Make sure to meet the following conditions:";

/** Reference Prim from `tree`: repeatedly the cheapest edge leaving the tree. */
function prim(nodes, edges, tree) {
  const inTree = new Set(tree);
  const mst = [];
  while (inTree.size < nodes) {
    const out = edges.filter(([u, v]) => inTree.has(u) !== inTree.has(v));
    const [e] = out.sort((a, b) => a[2] - b[2]);
    mst.push(e);
    inTree.add(e[0]);
    inTree.add(e[1]);
  }
  return mst;
}

/** Edges the game always rejects as the FIRST pick: not touching the tree {0}. */
async function firstWrongEdges(page) {
  const tree = await hook(page, "treeNodes");
  expect(tree).toEqual([0]);
  const wrong = (await hook(page, "graphEdges")).filter(([u, v]) => u !== 0 && v !== 0);
  expect(wrong.length).toBeGreaterThan(0); // node 0 has at most 4 of the 7 edges
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

test.describe("Prim regular mode", () => {
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
    const edges = await hook(page, "graphEdges");
    expect(edges).toHaveLength(7);
    const tree = await hook(page, "treeNodes");
    expect(tree).toEqual([0]);
    expect(await hook(page, "isChestOpened", 0)).toBe(true); // start node
    const mst = prim(5, edges, tree);
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
    expect(await hook(page, "treeNodes")).toEqual([0, 1, 2, 3, 4]);
    expect(await hook(page, "health")).toBe(4); // no mistakes made
    expect(
      await page.evaluate(() => [0, 1, 2, 3, 4].every((n) => window.__roomTest.isChestOpened(n)))
    ).toBe(true);

    await expect.poll(() => posts.length, { message: "no game session POSTed" }).toBe(1);
    await page.waitForTimeout(1_000);
    expect(posts).toHaveLength(1);
    expect(posts[0].gameSession).toMatchObject({
      game_name: "Prim",
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
    await expect(page.locator(".Prim-Hint")).toBeVisible();
    expect(await hintIcon(page, 1)).toBe("correct"); // nothing selected -> no cycle
    expect(await hintIcon(page, 2)).toBe("wrong"); // does not touch the tree {0}
    expect(await hook(page, "isEdgeSelected", u, v)).toBe(false);
    expect(await hook(page, "selectedEdges")).toEqual([]);
    // Nothing else happens later (e.g. the 3 s red-flash timer).
    await page.waitForTimeout(3_500);
    expect(await hook(page, "health")).toBe(3);
    await expect(page.locator(".modal__completion")).toBeHidden();
    expect(posts).toHaveLength(0);

    // A correct edge still works afterwards and hides the hint list.
    const [first] = prim(5, await hook(page, "graphEdges"), [0]);
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
      game_name: "Prim",
      mode: "regular",
      level: 1,
      total_mistakes: 5,
      success: false,
    });
  });
});
