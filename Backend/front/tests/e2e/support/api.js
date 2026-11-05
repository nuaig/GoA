// Hermetic backend for e2e tests: mocks every /api/** call and the external
// resources the rooms pull from CDNs. Response shapes follow
// Backend/controllers/* and Backend/db/DBGameStatus.js.
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_FILE = path.resolve(
  __dirname,
  "../../../node_modules/three/examples/fonts/helvetiker_regular.typeface.json"
);

export const USER_ID = "test-user";

const levels = () => [
  { level: 1, score: 0, stars: 0, status: "unlocked" },
  { level: 2, score: 0, stars: 0, status: "locked" },
  { level: 3, score: 0, stars: 0, status: "locked" },
];

// Same shape as initialGameStatus in Backend/db/DBGameStatus.js.
export const gameStatus = () => ({
  user_id: USER_ID,
  role: "user",
  playAgain: false,
  games: Object.fromEntries(
    ["Heapsort", "Prim", "Kruskal", "Dijkstra", "Astar"].map((g) => [
      g,
      { regular: levels(), training: levels() },
    ])
  ),
});

/**
 * Installs the mocks on `page`. Returns `{ statusServed, unhandled }`:
 * statusServed resolves once GET /api/status/:userId was answered; unhandled
 * collects any /api call the mock had no specific answer for.
 *
 * (Wrapped in an object on purpose: returning the bare promise from an async
 * function would make `await mockBackend()` wait for it - a deadlock before goto.)
 */
export async function mockBackend(page) {
  let resolveStatus;
  const statusServed = new Promise((r) => (resolveStatus = r));
  const unhandled = [];

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const { pathname } = new URL(req.url());
    const method = req.method();
    const json = (body, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    // Routes/userRoutes.js GET /getUser
    if (pathname === "/api/users/getUser") {
      return json({ username: "e2e-tester", id: USER_ID });
    }
    // gameStatusController.getGameStatusCon
    if (method === "GET" && pathname === `/api/status/${USER_ID}`) {
      await json({ ok: true, gameStatus: gameStatus() });
      resolveStatus();
      return;
    }
    // playAgain / updateGameStatus / updateToCompleted / unlock
    if (method === "POST" && pathname.startsWith("/api/status/")) {
      return json({ ok: true, msg: "mocked" });
    }
    // gameSessionController add/get
    if (pathname.startsWith("/api/gamesessions")) {
      return method === "POST"
        ? json({ ok: true, msg: "Game session recorded successfully" })
        : json({ ok: true, gameSessions: [] });
    }
    unhandled.push(`${method} ${pathname}`);
    return json({ ok: true });
  });

  // three.js FontLoader in dijkstra.js / prim.js / Astar.js
  await page.route("https://threejs.org/examples/fonts/**", (route) =>
    route.fulfill({ path: FONT_FILE, contentType: "application/json" })
  );
  await page.route("https://cdn.lordicon.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" })
  );

  return { statusServed, unhandled };
}
