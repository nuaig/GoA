// Page helpers for Dijkstra.html. Every scene interaction is a REAL mouse
// click (page.mouse.click) at coordinates computed by the dev-only hook
// `window.__dijkstraTest` (bottom of src/js/dijkstra.js). Before clicking, the
// hook's pickAt() confirms the game's raycaster would resolve that point to the
// intended chest/edge, so overlapping labels or edges do not cause misclicks.
import { test, expect } from "@playwright/test";
import { mockBackend } from "./api.js";

export const CAMERA_END = [0, 26, 26]; // initailCameraAnimationGSAP_K_P() end position
const POLL = { intervals: [50, 100, 200] };

// ---------------------------------------------------------------- hook access

export const hook = (page, fn, ...args) =>
  page.evaluate(([name, a]) => window.__dijkstraTest[name](...a), [fn, args]);

export const stepIndex = (page) => hook(page, "stepIndex");

/** Waits until the game would accept a scene click (no modal, click block expired). */
export async function waitUntilClickable(page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () => !window.__dijkstraTest.isModalOpen() && window.__dijkstraTest.clickBlockedMs() === 0
        ),
      { ...POLL, message: "game never became clickable" }
    )
    .toBe(true);
}

export async function waitForCameraToSettle(page) {
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

const counts = (page) =>
  page.evaluate(() => [window.__dijkstraTest.chestCount(), window.__dijkstraTest.edgeCount()]);

// ---------------------------------------------------------------- click targeting

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

function inViewport(page, p) {
  const vp = page.viewportSize();
  return p.x >= 1 && p.y >= 1 && p.x <= vp.width - 1 && p.y <= vp.height - 1;
}

/** A screen point the game's raycaster resolves to chest `node`, or null. */
export async function findChestPoint(page, node) {
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

export const sameEdge = (e, [u, v]) =>
  !!e && ((e[0] === u && e[1] === v) || (e[0] === v && e[1] === u));

/** A screen point that hits edge (u, v) first and no chest, or null. */
export async function findEdgePoint(page, u, v) {
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
export async function clickRearrange(page) {
  const btn = page.locator(".Rearrange-Action .room-btn");
  await waitUntilClickable(page);
  const box = await btn.boundingBox();
  const hit = await hook(page, "pickAt", box.x + box.width / 2, box.y + box.height / 2);
  if (hit.chest !== null || hit.edge !== null) return false;
  await btn.click();
  return true;
}

const note = (type, description) => {
  test.info().annotations.push({ type, description });
  console.log(`[e2e ${type}] ${description}`);
};

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

/** Clicks chest `node`; `registered` defaults to "chest got opened". */
export function clickChest(page, node, registered) {
  return clickWithRetry(page, {
    what: `chest ${node}`,
    find: () => findChestPoint(page, node),
    registered: registered ?? (() => hook(page, "isChestOpened", node)),
  });
}

/** Clicks edge (u, v); `registered` defaults to "input dialog opened". */
export function clickEdge(page, u, v, registered) {
  return clickWithRetry(page, {
    what: `edge (${u}, ${v})`,
    find: () => findEdgePoint(page, u, v),
    registered: registered ?? (() => page.locator("#input-dialog").isVisible()),
  });
}

/** Clicks the first of `edges` that has a clean click point. */
export function clickAnyEdge(page, edges, registered) {
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

/**
 * Types into the open input dialog and submits with OK (default) or Enter.
 * showInputDialog() focuses the input; after a wrong answer submitted with OK
 * the focus stays on the OK button, so pass { refocus: true } to click into
 * the input first (as a user would).
 */
export async function submitDialog(page, value, { submit = "ok", refocus = false } = {}) {
  const input = page.locator("#dialog-input");
  if (refocus) await input.click();
  await expect(input).toBeFocused();
  await input.fill("");
  await input.pressSequentially(String(value));
  if (submit === "enter") await input.press("Enter");
  else await page.locator("#dialog-ok-btn").click();
}

// ---------------------------------------------------------------- step driver

/**
 * Performs one tutorial step and asserts the step index advanced.
 *   - type: "info"   -> click `.tutorial-instructions-modal .tuto-next-btn`
 *   - expectedChests -> click the (first) expected chest
 *   - expectedEdges  -> click the edge, type updatedDistance, OK (or Enter)
 */
export async function driveTutorialStep(page, step, index, { submit = "ok" } = {}) {
  expect(await stepIndex(page)).toBe(index);

  if (step.type === "info") {
    await page.locator(".tutorial-instructions-modal .tuto-next-btn").click();
  } else if (Array.isArray(step.expectedChests)) {
    await clickChest(page, step.expectedChests[0]);
  } else if (Array.isArray(step.expectedEdges)) {
    const [u, v] = step.expectedEdges[0];
    await clickEdge(page, u, v);
    const [node, value] = Object.entries(step.updatedDistance)[0];
    await submitDialog(page, value, { submit });
    await expect(page.locator("#input-dialog")).toBeHidden();
    await expect(page.locator(`#distance-${node}`)).toHaveText(String(value));
  } else {
    throw new Error(`Unknown step shape at index ${index}: ${JSON.stringify(step)}`);
  }

  // Chest steps advance via setTimeout(nextTutorialStep, 500); edge steps immediately.
  await expect
    .poll(() => stepIndex(page), { ...POLL, message: `step ${index} did not advance` })
    .toBe(index + 1);
}

/** Drives tutorial steps [from, to). */
export async function driveTutorial(page, steps, from, to, opts) {
  for (let i = from; i < to; i++) await driveTutorialStep(page, steps[i], i, opts);
}

// ---------------------------------------------------------------- setup

/** Loads Dijkstra.html with mocks and waits for the welcome modal + initial graph. */
export async function openRoom(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  const { statusServed } = await mockBackend(page);
  await page.addInitScript(() => {
    // Suppress the one-time game-feature instruction modal (shown after "No").
    try {
      localStorage.setItem("hasGameFeatureInstructionModalShownBefore_Dijkstra", "true");
    } catch {}
  });

  await page.goto("/Dijkstra.html");
  await page.waitForFunction(() => !!window.__dijkstraTest, null, { timeout: 60_000 });
  await statusServed;
  await expect(page.locator(".modal__tutorial")).toBeVisible();
  // toggleMode("regular") runs after the status fetch.
  await expect(page.locator("#regular-mode-btn")).toHaveClass(/active/);

  // The initial random level-1 graph (5 chests, 8 edges) must finish building
  // before anything resets the scene, or two createModels() runs interleave.
  await expect
    .poll(() => counts(page), { timeout: 90_000, message: "initial graph never loaded" })
    .toEqual([5, 8]);
  await page.waitForLoadState("networkidle").catch(() => {});
  return { errors };
}

/** From the welcome modal: Yes -> tutorial graph built, camera settled, step 0. */
export async function startTutorial(page) {
  await page.locator(".btn__tutorial__yes").click();
  await expect(page.locator(".modal__tutorial")).toBeHidden();
  await expect(page.locator(".tutorial-instructions-modal")).toBeVisible();
  await expect
    .poll(
      () =>
        page.evaluate(() => [
          window.__dijkstraTest.isTutorial(),
          window.__dijkstraTest.chestCount(),
          window.__dijkstraTest.edgeCount(),
        ]),
      { timeout: 90_000, message: "tutorial graph never loaded" }
    )
    .toEqual([true, 5, 7]); // createSpecificGraphDijkstraTutorial()
  await waitForCameraToSettle(page);
  await waitUntilClickable(page);
  expect(await stepIndex(page)).toBe(0);
}

/** From the welcome modal: No -> level selection -> level 1 (regular mode). */
export async function startRegularLevel1(page) {
  await page.locator(".btn__tutorial__no_or_continue").click();
  const levelsModal = page.locator(".modal__level__selection");
  await expect(levelsModal).toBeVisible();
  // The click handler resets the scene synchronously, then rebuilds it async.
  await page.locator(".btn__level__1").click();
  await expect(levelsModal).toBeHidden();
  await expect
    .poll(
      () =>
        page.evaluate(() => [
          window.__dijkstraTest.currentMode(),
          window.__dijkstraTest.currentLevel(),
          window.__dijkstraTest.isTutorial(),
          window.__dijkstraTest.chestCount(),
          window.__dijkstraTest.edgeCount(),
        ]),
      { timeout: 90_000, message: "level 1 graph never loaded" }
    )
    .toEqual(["regular", 1, false, 5, 8]);
  await waitForCameraToSettle(page);
  await waitUntilClickable(page);
  expect(await stepIndex(page)).toBe(0);
}
