// Smoke tests: the other algorithm rooms load with the mocked API and throw no
// uncaught page errors. Guards shared HTML/CSS/JS (e.g. gameRoomUI.js, the
// shared stylesheets) against regressions from Dijkstra-specific changes.
import { test, expect } from "@playwright/test";
import { mockBackend } from "./support/api.js";

const ROOMS = ["Kruskal.html", "Prim.html", "Astar.html", "heapsort.html", "Dijkstra.html"];

for (const room of ROOMS) {
  test(`${room} loads without uncaught errors`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    const { statusServed } = await mockBackend(page);

    await page.goto(`/${room}`);
    await statusServed; // getUser succeeded -> status fetched (no redirect)
    await expect(page.locator("canvas").first()).toBeVisible();
    await expect(page.locator(".modal__tutorial")).toBeVisible();
    await page.waitForLoadState("networkidle").catch(() => {});
    // Let async model loading / camera setup run so late errors surface.
    await page.waitForTimeout(2_000);

    expect(new URL(page.url()).pathname).toBe(`/${room}`);
    expect(errors, `uncaught page errors on ${room}`).toEqual([]);
  });
}
