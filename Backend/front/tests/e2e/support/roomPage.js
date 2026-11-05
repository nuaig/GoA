// Generic page helpers for the graph rooms (Dijkstra.html, Kruskal.html, ...).
// Every scene interaction is a REAL mouse click (page.mouse.click) at
// coordinates computed by the room's dev-only hook (`window.__roomTest`, or
// `window.__dijkstraTest` for Dijkstra). Before clicking, the hook's pickAt()
// confirms the game's raycaster would resolve that point to the intended
// chest/edge, so overlapping labels or edges do not cause misclicks.
//
// Usage: const room = createRoomPage({ gameName, path, hookName, ... });
import { test, expect } from "@playwright/test";
import { mockBackend } from "./api.js";

export const CAMERA_END = [0, 26, 26]; // initailCameraAnimationGSAP_K_P() end position
export const POLL = { intervals: [50, 100, 200] };

export const sameEdge = (e, [u, v]) =>
  !!e && ((e[0] === u && e[1] === v) || (e[0] === v && e[1] === u));

export const note = (type, description) => {
  test.info().annotations.push({ type, description });
  console.log(`[e2e ${type}] ${description}`);
};

function inViewport(page, p) {
  const vp = page.viewportSize();
  return p.x >= 1 && p.y >= 1 && p.x <= vp.width - 1 && p.y <= vp.height - 1;
}

/**
 * True when (x, y) lands on the canvas, or on an overlay that is not a control
 * (clicks there still bubble to the window-level onClick handler).
 */
async function isSafeClickTarget(page, { x, y }) {
  return page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return false;
      if (el.tagName === "CANVAS") return true;
      return !el.closest("button, input, a, select, textarea, .room-btn, .modal, #input-dialog");
    },
    { x, y }
  );
}

/**
 * @param {object} cfg
 * @param {string} cfg.gameName       GameRoomUI gameName (localStorage key suffix)
 * @param {string} cfg.path           page path, e.g. "/Kruskal.html"
 * @param {string} cfg.hookName       window property of the dev hook
 * @param {[number, number]} cfg.initialCounts  [chests, edges] of the random level-1 graph
 * @param {[number, number]} cfg.tutorialCounts [chests, edges] of the tutorial graph
 */
export function createRoomPage({ gameName, path, hookName, initialCounts, tutorialCounts }) {
  // ------------------------------------------------------------ hook access
  const hook = (page, fn, ...args) =>
    page.evaluate(([h, name, a]) => window[h][name](...a), [hookName, fn, args]);

  const hooks = (page, fns) =>
    page.evaluate(([h, names]) => names.map((n) => window[h][n]()), [hookName, fns]);

  const stepIndex = (page) => hook(page, "stepIndex");

  /** Waits until the game would accept a scene click (no modal, click block expired). */
  async function waitUntilClickable(page) {
    await expect
      .poll(
        () =>
          page.evaluate((h) => {
            const t = window[h];
            // clickBlockedMs only exists in rooms that have a click block (Dijkstra).
            return !t.isModalOpen() && (t.clickBlockedMs ? t.clickBlockedMs() : 0) === 0;
          }, hookName),
        { ...POLL, message: "game never became clickable" }
      )
      .toBe(true);
  }

  async function waitForCameraToSettle(page) {
    await expect
      .poll(
        async () => {
          const pos = await hook(page, "cameraPosition");
          return pos.every((c, i) => Math.abs(c - CAMERA_END[i]) < 1e-3);
        },
        { timeout: 20_000, message: "camera animation did not settle" }
      )
      .toBe(true);
  }

  // ------------------------------------------------------------ click targeting

  /** A screen point the game's raycaster resolves to chest `node`, or null. */
  async function findChestPoint(page, node) {
    const center = await hook(page, "chestScreenPos", node);
    if (!center) return null;
    const offsets = [[0, 0], [0, 8], [0, -8], [8, 0], [-8, 0], [0, 16], [0, -16], [12, 12], [-12, 12], [12, -12], [-12, -12]];
    for (const [dx, dy] of offsets) {
      const p = { x: center.x + dx, y: center.y + dy };
      if (!inViewport(page, p)) continue;
      const hit = await hook(page, "pickAt", p.x, p.y);
      if (hit.chest === node && (await isSafeClickTarget(page, p))) return p;
    }
    return null;
  }

  /** A screen point that hits edge (u, v) first and no chest, or null. */
  async function findEdgePoint(page, u, v) {
    const ts = [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65, 0.3, 0.7, 0.25, 0.75];
    for (const t of ts) {
      const p = await hook(page, "edgeScreenPos", u, v, t);
      if (!p || !p.onScreen || !inViewport(page, p)) continue;
      const hit = await hook(page, "pickAt", p.x, p.y);
      if (hit.chest === null && sameEdge(hit.edge, [u, v]) && (await isSafeClickTarget(page, p))) {
        return p;
      }
    }
    return null;
  }

  /**
   * Clicks the in-game "Rearrange chests" button. The click also bubbles to the
   * game's window-level onClick (which raycasts at the button position), so we
   * refuse unless nothing in the scene is under the button. Returns true if clicked.
   */
  async function clickRearrange(page) {
    const btn = page.locator(".Rearrange-Action .room-btn");
    await waitUntilClickable(page);
    const box = await btn.boundingBox();
    const hit = await hook(page, "pickAt", box.x + box.width / 2, box.y + box.height / 2);
    if (hit.chest !== null || hit.edge !== null) return false;
    await btn.click();
    return true;
  }

  /**
   * Finds a point with `find`, clicks it and waits for `registered()` to be true.
   * No clean point -> Rearrange chests and retry. Not registered (e.g. the
   * window click listener is not attached yet) -> retry.
   */
  async function clickWithRetry(page, { find, registered, what }) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await waitUntilClickable(page);
      const p = await find();
      if (!p) {
        // Chest off-screen / edge hidden behind a chest or another edge.
        note("rearrange", `no clean point for ${what}`);
        await clickRearrange(page);
        continue;
      }
      await page.mouse.click(p.x, p.y);
      try {
        await expect.poll(registered, { ...POLL, timeout: 3_000 }).toBe(true);
        return p;
      } catch {
        note("retry", `${what} click not registered at ${JSON.stringify(p)}`);
      }
    }
    throw new Error(`Could not click ${what}`);
  }

  /** Clicks chest `node`; `registered` must say when the click took effect. */
  function clickChest(page, node, registered) {
    return clickWithRetry(page, {
      what: `chest ${node}`,
      find: () => findChestPoint(page, node),
      registered,
    });
  }

  /** Clicks edge (u, v); `registered` must say when the click took effect. */
  function clickEdge(page, u, v, registered) {
    return clickWithRetry(page, {
      what: `edge (${u}, ${v})`,
      find: () => findEdgePoint(page, u, v),
      registered,
    });
  }

  /** Clicks the first of `edges` that has a clean click point. Returns {x, y, edge}. */
  function clickAnyEdge(page, edges, registered) {
    return clickWithRetry(page, {
      what: `any of ${JSON.stringify(edges)}`,
      find: async () => {
        for (const [u, v] of edges) {
          const p = await findEdgePoint(page, u, v);
          if (p) return { ...p, edge: [u, v] };
        }
        return null;
      },
      registered,
    });
  }

  // ------------------------------------------------------------ setup

  const counts = (page) => hooks(page, ["chestCount", "edgeCount"]);

  /** Loads the room with mocks and waits for the welcome modal + initial graph. */
  async function openRoom(page) {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    const { statusServed } = await mockBackend(page);
    await page.addInitScript((key) => {
      // Suppress the one-time game-feature instruction modal (shown after "No").
      try {
        localStorage.setItem(key, "true");
      } catch {}
    }, `hasGameFeatureInstructionModalShownBefore_${gameName}`);

    await page.goto(path);
    await page.waitForFunction((h) => !!window[h], hookName, { timeout: 60_000 });
    await statusServed;
    await expect(page.locator(".modal__tutorial")).toBeVisible();
    // toggleMode("regular") runs after the status fetch.
    await expect(page.locator("#regular-mode-btn")).toHaveClass(/active/);

    // The initial random level-1 graph must finish building before anything
    // resets the scene, or two createModels() runs interleave.
    await expect
      .poll(() => counts(page), { timeout: 90_000, message: "initial graph never loaded" })
      .toEqual(initialCounts);
    await page.waitForLoadState("networkidle").catch(() => {});
    return { errors };
  }

  /** From the welcome modal: Yes -> tutorial graph built, camera settled, step 0. */
  async function startTutorial(page) {
    await page.locator(".btn__tutorial__yes").click();
    await expect(page.locator(".modal__tutorial")).toBeHidden();
    await expect(page.locator(".tutorial-instructions-modal")).toBeVisible();
    await expect
      .poll(() => hooks(page, ["isTutorial", "chestCount", "edgeCount"]), {
        timeout: 90_000,
        message: "tutorial graph never loaded",
      })
      .toEqual([true, ...tutorialCounts]);
    await waitForCameraToSettle(page);
    await waitUntilClickable(page);
    expect(await stepIndex(page)).toBe(0);
  }

  /** From the welcome modal: No -> level selection -> level 1 (regular mode). */
  async function startRegularLevel1(page) {
    await page.locator(".btn__tutorial__no_or_continue").click();
    const levelsModal = page.locator(".modal__level__selection");
    await expect(levelsModal).toBeVisible();
    // The click handler resets the scene synchronously, then rebuilds it async.
    await page.locator(".btn__level__1").click();
    await expect(levelsModal).toBeHidden();
    await expect
      .poll(
        () =>
          hooks(page, ["currentMode", "currentLevel", "isTutorial", "chestCount", "edgeCount"]),
        { timeout: 90_000, message: "level 1 graph never loaded" }
      )
      .toEqual(["regular", 1, false, ...initialCounts]);
    await waitForCameraToSettle(page);
    await waitUntilClickable(page);
    expect(await stepIndex(page)).toBe(0);
  }

  return {
    hook,
    hooks,
    stepIndex,
    waitUntilClickable,
    waitForCameraToSettle,
    findChestPoint,
    findEdgePoint,
    clickRearrange,
    clickWithRetry,
    clickChest,
    clickEdge,
    clickAnyEdge,
    openRoom,
    startTutorial,
    startRegularLevel1,
  };
}
