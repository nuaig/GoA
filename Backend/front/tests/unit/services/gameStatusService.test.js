// Characterization tests for utils/gameStatus/gameStatusService.js
//
// Request shapes were cross-checked (read-only) against
//   Backend/server.js                       -> app.use("/api/status", gameStatusRouter)
//   Backend/Routes/gameStatusRoutes.js
//   Backend/controllers/gameStatusController.js
// and match:
//   GET  /api/status/:userId                                   (getGameStatusCon -> { ok, gameStatus })
//   POST /api/status/:userId/playAgain           body {playAgain} (updatePlayAgainCon -> { ok, msg })
//   POST /api/status/:userId/:gameName/:mode     body {level, score, stars, status} (updateGameStatusCon)
//   POST /api/status/unlock/:userId/:gameName/:mode/:level     (unlockGameLevelCon)
//   POST /api/status/updateToCompleted/:userId/:gameName/:mode/:level (updateStatusToCompletedCon)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameStatusService } from "../../../utils/gameStatus/gameStatusService.js";

function okResponse(body, status = 200) {
  return {
    ok: true,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

function errorResponse(status, body = { ok: false, msg: "server says no" }) {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

function makeLevels(statuses) {
  return statuses.map((status, i) => ({
    level: i + 1,
    score: 0,
    stars: 0,
    status,
  }));
}

function makeStatus() {
  return {
    role: "user",
    playAgain: false,
    games: {
      Dijkstra: {
        regular: makeLevels(["unlocked", "locked", "locked"]),
        training: makeLevels(["completed", "unlocked", "locked"]),
      },
      Kruskal: {
        regular: [
          { level: 1, score: 100, stars: 3, status: "completed" },
          { level: 2, score: 50, stars: 1, status: "completed" },
          { level: 3, score: 0, stars: 0, status: "completed_first_time" },
        ],
        training: makeLevels(["unlocked", "locked", "locked"]),
      },
    },
  };
}

describe("GameStatusService", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("constructor and simple getters", () => {
    it("starts with null gameStatus and stores the userId", () => {
      const svc = new GameStatusService("u1");
      expect(svc.userId).toBe("u1");
      expect(svc.gameStatus).toBeNull();
      expect(svc.getUserId()).toBe("u1");
      expect(svc.getLocalGameStatus()).toBeNull();
      expect(svc._updateToCompletedInFlight).toBeInstanceOf(Set);
      expect(svc._updateToCompletedInFlight.size).toBe(0);
    });

    it("getLocalGameStatus returns the cached object by reference", () => {
      const svc = new GameStatusService("u1");
      const status = makeStatus();
      svc.gameStatus = status;
      expect(svc.getLocalGameStatus()).toBe(status);
    });

    it("makes no network requests on construction", () => {
      new GameStatusService("u1");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("getGameStatus", () => {
    it("GETs /api/status/:userId with no options and caches data.gameStatus", async () => {
      const status = makeStatus();
      fetchMock.mockResolvedValue(okResponse({ ok: true, gameStatus: status }));
      const svc = new GameStatusService("abc123");

      await svc.getGameStatus();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("/api/status/abc123");
      expect(fetchMock.mock.calls[0]).toHaveLength(1);
      expect(svc.gameStatus).toBe(status);
    });

    it("interpolates the userId verbatim (no encoding)", async () => {
      fetchMock.mockResolvedValue(okResponse({ gameStatus: {} }));
      const svc = new GameStatusService("a b/c");
      await svc.getGameStatus();
      expect(fetchMock).toHaveBeenCalledWith("/api/status/a b/c");
    });

    it("on non-ok response: leaves gameStatus null, does not parse json, logs error, resolves", async () => {
      const res = errorResponse(404);
      fetchMock.mockResolvedValue(res);
      const svc = new GameStatusService("u1");

      await expect(svc.getGameStatus()).resolves.toBeUndefined();

      expect(res.json).not.toHaveBeenCalled();
      expect(svc.gameStatus).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Error in getGameStatus:",
        expect.objectContaining({ message: "Failed to fetch game status." })
      );
    });

    it("on non-ok response after a previous success: keeps the previously cached status", async () => {
      const status = makeStatus();
      fetchMock
        .mockResolvedValueOnce(okResponse({ gameStatus: status }))
        .mockResolvedValueOnce(errorResponse(500));
      const svc = new GameStatusService("u1");
      await svc.getGameStatus();
      await svc.getGameStatus();
      expect(svc.gameStatus).toBe(status);
    });

    it("when fetch rejects: swallows the error and leaves gameStatus null", async () => {
      fetchMock.mockRejectedValue(new TypeError("network down"));
      const svc = new GameStatusService("u1");
      await expect(svc.getGameStatus()).resolves.toBeUndefined();
      expect(svc.gameStatus).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Error in getGameStatus:",
        expect.objectContaining({ message: "network down" })
      );
    });

    it("when json() rejects: swallows the error", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new SyntaxError("bad json")),
      });
      const svc = new GameStatusService("u1");
      await expect(svc.getGameStatus()).resolves.toBeUndefined();
      expect(svc.gameStatus).toBeNull();
    });

    it("when the ok body lacks gameStatus: caches undefined (not null)", async () => {
      fetchMock.mockResolvedValue(okResponse({ ok: true }));
      const svc = new GameStatusService("u1");
      await svc.getGameStatus();
      expect(svc.gameStatus).toBeUndefined();
    });
  });

  describe("init", () => {
    it("delegates to getGameStatus and caches the result", async () => {
      const status = makeStatus();
      fetchMock.mockResolvedValue(okResponse({ gameStatus: status }));
      const svc = new GameStatusService("u1");
      const spy = vi.spyOn(svc, "getGameStatus");
      await svc.init();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("/api/status/u1");
      expect(svc.getLocalGameStatus()).toBe(status);
    });

    it("never rejects, even if fetch rejects", async () => {
      fetchMock.mockRejectedValue(new Error("boom"));
      const svc = new GameStatusService("u1");
      await expect(svc.init()).resolves.toBeUndefined();
      expect(svc.gameStatus).toBeNull();
    });

    it("catches an error thrown by getGameStatus itself", async () => {
      const svc = new GameStatusService("u1");
      vi.spyOn(svc, "getGameStatus").mockRejectedValue(new Error("x"));
      await expect(svc.init()).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to initialize game status:",
        expect.any(Error)
      );
    });
  });

  describe("updatePlayAgainStatus", () => {
    it("POSTs JSON {playAgain} to /api/status/:userId/playAgain and updates the cache", async () => {
      fetchMock.mockResolvedValue(okResponse({ ok: true, msg: "ok" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();

      await svc.updatePlayAgainStatus(true);

      expect(fetchMock).toHaveBeenCalledWith("/api/status/u1/playAgain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playAgain: true }),
      });
      expect(fetchMock.mock.calls[0][1].body).toBe('{"playAgain":true}');
      expect(svc.gameStatus.playAgain).toBe(true);
      // other fields untouched
      expect(svc.gameStatus.role).toBe("user");
    });

    it("can set playAgain back to false", async () => {
      fetchMock.mockResolvedValue(okResponse({ msg: "ok" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = { playAgain: true };
      await svc.updatePlayAgainStatus(false);
      expect(fetchMock.mock.calls[0][1].body).toBe('{"playAgain":false}');
      expect(svc.gameStatus.playAgain).toBe(false);
    });

    it("creates a cache object when gameStatus was null", async () => {
      fetchMock.mockResolvedValue(okResponse({ msg: "ok" }));
      const svc = new GameStatusService("u1");
      await svc.updatePlayAgainStatus(true);
      expect(svc.gameStatus).toEqual({ playAgain: true });
    });

    it("on non-ok response: does not touch the cache and resolves", async () => {
      const res = errorResponse(400);
      fetchMock.mockResolvedValue(res);
      const svc = new GameStatusService("u1");
      svc.gameStatus = { playAgain: false };
      await expect(svc.updatePlayAgainStatus(true)).resolves.toBeUndefined();
      expect(res.json).not.toHaveBeenCalled();
      expect(svc.gameStatus.playAgain).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        "Error in updatePlayAgainStatus:",
        expect.objectContaining({ message: "Failed to update playAgain." })
      );
    });

    it("on non-ok response with null cache: cache stays null", async () => {
      fetchMock.mockResolvedValue(errorResponse(500));
      const svc = new GameStatusService("u1");
      await svc.updatePlayAgainStatus(true);
      expect(svc.gameStatus).toBeNull();
    });

    it("when fetch rejects: swallows the error, cache unchanged", async () => {
      fetchMock.mockRejectedValue(new Error("offline"));
      const svc = new GameStatusService("u1");
      svc.gameStatus = { playAgain: false };
      await expect(svc.updatePlayAgainStatus(true)).resolves.toBeUndefined();
      expect(svc.gameStatus.playAgain).toBe(false);
    });
  });

  describe("updateGameStatus", () => {
    it("POSTs {level, score, stars, status} to /api/status/:userId/:gameName/:mode when the score improves", async () => {
      fetchMock.mockResolvedValue(okResponse({ ok: true, msg: "updated" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();

      await svc.updateGameStatus("Dijkstra", 1, "regular", 120, 2, "completed");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("/api/status/u1/Dijkstra/regular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: 1, score: 120, stars: 2, status: "completed" }),
      });
      expect(fetchMock.mock.calls[0][1].body).toBe(
        '{"level":1,"score":120,"stars":2,"status":"completed"}'
      );
    });

    it("replaces the cached level entry with exactly the update payload", async () => {
      fetchMock.mockResolvedValue(okResponse({ msg: "updated" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      svc.gameStatus.games.Dijkstra.regular[1].extra = "dropped";

      await svc.updateGameStatus("Dijkstra", 2, "regular", 80, 1, "completed");

      expect(svc.gameStatus.games.Dijkstra.regular[1]).toEqual({
        level: 2,
        score: 80,
        stars: 1,
        status: "completed",
      });
      // other levels untouched
      expect(svc.gameStatus.games.Dijkstra.regular[0].status).toBe("unlocked");
      expect(svc.gameStatus.games.Dijkstra.regular[2].status).toBe("locked");
    });

    it("passes the status through unchanged (completed_first_time is not overridden)", async () => {
      fetchMock.mockResolvedValue(okResponse({ msg: "updated" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      // Kruskal regular L2 is 'completed' with score 50; send completed_first_time with a better score
      await svc.updateGameStatus("Kruskal", 2, "regular", 51, 3, "completed_first_time");
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).status).toBe("completed_first_time");
      expect(svc.gameStatus.games.Kruskal.regular[1].status).toBe("completed_first_time");
    });

    it("skips (no fetch) when the new score is equal to the cached score", async () => {
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.updateGameStatus("Kruskal", 1, "regular", 100, 3, "completed");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(svc.gameStatus.games.Kruskal.regular[0].score).toBe(100);
    });

    it("skips (no fetch) when the new score is lower than the cached score", async () => {
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.updateGameStatus("Kruskal", 1, "regular", 99, 3, "completed");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("cached score 0 and new score 0: skips", async () => {
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.updateGameStatus("Dijkstra", 1, "regular", 0, 0, "completed");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("cached entry without a score: posts (undefined >= n is false)", async () => {
      fetchMock.mockResolvedValue(okResponse({ msg: "ok" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      delete svc.gameStatus.games.Dijkstra.regular[0].score;
      await svc.updateGameStatus("Dijkstra", 1, "regular", 0, 0, "completed");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("uses the mode to pick the cache array (training vs regular)", async () => {
      fetchMock.mockResolvedValue(okResponse({ msg: "ok" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.updateGameStatus("Dijkstra", 1, "training", 10, 3, "completed");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/status/u1/Dijkstra/training",
        expect.any(Object)
      );
      expect(svc.gameStatus.games.Dijkstra.training[0].score).toBe(10);
      expect(svc.gameStatus.games.Dijkstra.regular[0].score).toBe(0);
    });

    it("on non-ok response: cache unchanged and resolves", async () => {
      const res = errorResponse(404);
      fetchMock.mockResolvedValue(res);
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await expect(
        svc.updateGameStatus("Dijkstra", 1, "regular", 120, 2, "completed")
      ).resolves.toBeUndefined();
      expect(res.json).not.toHaveBeenCalled();
      expect(svc.gameStatus.games.Dijkstra.regular[0].score).toBe(0);
      expect(console.error).toHaveBeenCalledWith(
        "Error in updateGameStatus:",
        expect.objectContaining({ message: "Failed to update game status." })
      );
    });

    it("when fetch rejects: swallows the error, cache unchanged", async () => {
      fetchMock.mockRejectedValue(new Error("offline"));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await expect(
        svc.updateGameStatus("Dijkstra", 1, "regular", 120, 2, "completed")
      ).resolves.toBeUndefined();
      expect(svc.gameStatus.games.Dijkstra.regular[0].score).toBe(0);
    });

    it("with null cache: still POSTs, then fails to update the cache (TypeError swallowed)", async () => {
      // NOTE: current behavior, possibly a bug: the server is updated but the
      // local write `this.gameStatus.games[...]` throws because gameStatus is null
      // (gameStatusService.js:88). The error is only logged.
      fetchMock.mockResolvedValue(okResponse({ msg: "ok" }));
      const svc = new GameStatusService("u1");
      await expect(
        svc.updateGameStatus("Dijkstra", 1, "regular", 120, 2, "completed")
      ).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(svc.gameStatus).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Error in updateGameStatus:",
        expect.any(TypeError)
      );
    });

    it("with a game missing from the cache: POSTs, then the cache write throws (swallowed)", async () => {
      // NOTE: current behavior, possibly a bug: same as above for an unknown game (gameStatusService.js:88).
      fetchMock.mockResolvedValue(okResponse({ msg: "ok" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.updateGameStatus("Astar", 1, "regular", 120, 2, "completed");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/status/u1/Astar/regular",
        expect.any(Object)
      );
      expect(svc.gameStatus.games.Astar).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        "Error in updateGameStatus:",
        expect.any(TypeError)
      );
    });

    it("with a cache lacking `games` (e.g. only playAgain was set): throws before fetch (swallowed)", async () => {
      // NOTE: current behavior, possibly a bug: `this.gameStatus?.games[gameName]`
      // only guards gameStatus, not games (gameStatusService.js:60), so no request is sent.
      const svc = new GameStatusService("u1");
      svc.gameStatus = { playAgain: true };
      await expect(
        svc.updateGameStatus("Dijkstra", 1, "regular", 120, 2, "completed")
      ).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "Error in updateGameStatus:",
        expect.any(TypeError)
      );
    });
  });

  describe("updateStatusToCompleted", () => {
    it("POSTs to /api/status/updateToCompleted/:userId/:gameName/:mode/:level with JSON header and no body", async () => {
      fetchMock.mockResolvedValue(okResponse({ ok: true, msg: "Status updated to completed" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();

      await svc.updateStatusToCompleted("Kruskal", 3, "regular");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/status/updateToCompleted/u1/Kruskal/regular/3",
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("body");
      expect(svc.gameStatus.games.Kruskal.regular[2].status).toBe("completed");
      expect(svc._updateToCompletedInFlight.size).toBe(0);
    });

    it("skips (no fetch) when the cached status is already 'completed'", async () => {
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.updateStatusToCompleted("Kruskal", 1, "regular");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("does not skip for non-'completed' statuses such as 'locked' or 'unlocked'", async () => {
      fetchMock.mockResolvedValue(okResponse({ msg: "No update needed" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.updateStatusToCompleted("Dijkstra", 1, "regular"); // unlocked
      await svc.updateStatusToCompleted("Dijkstra", 2, "regular"); // locked
      expect(fetchMock).toHaveBeenCalledTimes(2);
      // and sets local status to completed regardless of the server's "No update needed"
      expect(svc.gameStatus.games.Dijkstra.regular[0].status).toBe("completed");
      expect(svc.gameStatus.games.Dijkstra.regular[1].status).toBe("completed");
    });

    it("with null cache: still POSTs and does not crash", async () => {
      fetchMock.mockResolvedValue(okResponse({ msg: "ok" }));
      const svc = new GameStatusService("u1");
      await expect(
        svc.updateStatusToCompleted("Kruskal", 3, "regular")
      ).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(svc.gameStatus).toBeNull();
      expect(console.error).not.toHaveBeenCalled();
    });

    it("on non-ok response: warns with status + server msg, but still marks local status completed", async () => {
      fetchMock.mockResolvedValue(errorResponse(400, { ok: false, msg: "Invalid level" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.updateStatusToCompleted("Kruskal", 3, "regular");
      expect(console.warn).toHaveBeenCalledWith(
        "updateStatusToCompleted:",
        400,
        "Invalid level"
      );
      expect(svc.gameStatus.games.Kruskal.regular[2].status).toBe("completed");
      expect(svc._updateToCompletedInFlight.size).toBe(0);
    });

    it("on non-ok response with unparsable body: falls back to the default message", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new SyntaxError("not json")),
      });
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.updateStatusToCompleted("Kruskal", 3, "regular");
      expect(console.warn).toHaveBeenCalledWith(
        "updateStatusToCompleted:",
        500,
        "Failed to update status to completed."
      );
      expect(svc.gameStatus.games.Kruskal.regular[2].status).toBe("completed");
    });

    it("on ok response with unparsable body: still marks completed (json failure is tolerated)", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new SyntaxError("not json")),
      });
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.updateStatusToCompleted("Kruskal", 3, "regular");
      expect(svc.gameStatus.games.Kruskal.regular[2].status).toBe("completed");
      expect(console.error).not.toHaveBeenCalled();
    });

    it("when fetch rejects: logs the error, local status unchanged, in-flight key cleared", async () => {
      fetchMock.mockRejectedValue(new Error("offline"));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await expect(
        svc.updateStatusToCompleted("Kruskal", 3, "regular")
      ).resolves.toBeUndefined();
      expect(svc.gameStatus.games.Kruskal.regular[2].status).toBe("completed_first_time");
      expect(console.error).toHaveBeenCalledWith(
        "Error in updateStatusToCompleted:",
        expect.objectContaining({ message: "offline" })
      );
      expect(svc._updateToCompletedInFlight.size).toBe(0);

      // a retry is allowed after the failure
      fetchMock.mockResolvedValue(okResponse({ msg: "ok" }));
      await svc.updateStatusToCompleted("Kruskal", 3, "regular");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(svc.gameStatus.games.Kruskal.regular[2].status).toBe("completed");
    });

    it("de-duplicates concurrent calls for the same game/mode/level", async () => {
      let resolveFetch;
      fetchMock.mockReturnValue(
        new Promise((r) => {
          resolveFetch = r;
        })
      );
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();

      const p1 = svc.updateStatusToCompleted("Kruskal", 3, "regular");
      expect(svc._updateToCompletedInFlight.has("Kruskal/regular/3")).toBe(true);
      const p2 = svc.updateStatusToCompleted("Kruskal", 3, "regular");
      await p2; // returns immediately
      expect(fetchMock).toHaveBeenCalledTimes(1);

      resolveFetch(okResponse({ msg: "ok" }));
      await p1;
      expect(svc._updateToCompletedInFlight.size).toBe(0);
      expect(svc.gameStatus.games.Kruskal.regular[2].status).toBe("completed");
    });

    it("the duplicate call's early return clears the first call's in-flight key, so a third concurrent call fetches again", async () => {
      let resolveFetch;
      fetchMock.mockReturnValue(new Promise((r) => (resolveFetch = r)));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      const p1 = svc.updateStatusToCompleted("Kruskal", 3, "regular");
      await svc.updateStatusToCompleted("Kruskal", 3, "regular");
      // NOTE: current behavior, possibly a bug: the early `return` inside try still
      // runs `finally`, which deletes the key that belongs to the first call
      // (gameStatusService.js:104-105 + 133-134). A third concurrent call would then fetch again.
      expect(svc._updateToCompletedInFlight.has("Kruskal/regular/3")).toBe(false);
      const p3 = svc.updateStatusToCompleted("Kruskal", 3, "regular");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      resolveFetch(okResponse({ msg: "ok" }));
      await Promise.all([p1, p3]);
      expect(svc.gameStatus.games.Kruskal.regular[2].status).toBe("completed");
    });

    it("does not de-duplicate across different levels/modes/games", async () => {
      fetchMock.mockImplementation(() => new Promise(() => {}));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      svc.updateStatusToCompleted("Kruskal", 3, "regular");
      svc.updateStatusToCompleted("Kruskal", 2, "training");
      svc.updateStatusToCompleted("Dijkstra", 3, "regular");
      await Promise.resolve();
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect([...svc._updateToCompletedInFlight].sort()).toEqual([
        "Dijkstra/regular/3",
        "Kruskal/regular/3",
        "Kruskal/training/2",
      ]);
    });

    it("with a cache lacking `games`: throws before fetch (swallowed)", async () => {
      // NOTE: current behavior, possibly a bug: `this.gameStatus?.games[gameName]`
      // does not guard a missing `games` (gameStatusService.js:100); no request is sent.
      const svc = new GameStatusService("u1");
      svc.gameStatus = { playAgain: true };
      await svc.updateStatusToCompleted("Kruskal", 3, "regular");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "Error in updateStatusToCompleted:",
        expect.any(TypeError)
      );
    });
  });

  describe("unlockGameLevel", () => {
    it("POSTs to /api/status/unlock/:userId/:gameName/:mode/:level with only {method:'POST'} and caches 'unlocked'", async () => {
      fetchMock.mockResolvedValue(okResponse({ ok: true, msg: "Level 2 unlocked successfully" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();

      await svc.unlockGameLevel("Dijkstra", 2, "regular");

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/status/unlock/u1/Dijkstra/regular/2",
        { method: "POST" }
      );
      expect(svc.gameStatus.games.Dijkstra.regular[1].status).toBe("unlocked");
      expect(svc.gameStatus.games.Dijkstra.regular[2].status).toBe("locked");
    });

    it("unlocks level 3", async () => {
      fetchMock.mockResolvedValue(okResponse({ msg: "ok" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.unlockGameLevel("Dijkstra", 3, "regular");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/status/unlock/u1/Dijkstra/regular/3",
        { method: "POST" }
      );
      expect(svc.gameStatus.games.Dijkstra.regular[2].status).toBe("unlocked");
    });

    it("level > 3 (e.g. after completing level 3): warns, no fetch", async () => {
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.unlockGameLevel("Dijkstra", 4, "regular");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        "Invalid level: 4. Levels range from 1 to 3."
      );
    });

    it.each(["unlocked", "completed", "completed_first_time"])(
      "skips (no fetch) when current status is %s",
      async (status) => {
        const svc = new GameStatusService("u1");
        svc.gameStatus = makeStatus();
        svc.gameStatus.games.Dijkstra.regular[1].status = status;
        await svc.unlockGameLevel("Dijkstra", 2, "regular");
        expect(fetchMock).not.toHaveBeenCalled();
        expect(svc.gameStatus.games.Dijkstra.regular[1].status).toBe(status);
      }
    );

    it("level 0 is not rejected client-side: POSTs, then the cache write throws (swallowed)", async () => {
      // NOTE: current behavior, possibly a bug: there is only an upper-bound check
      // (gameStatusService.js:141); level 0 hits games[..][-1] at line 168.
      fetchMock.mockResolvedValue(okResponse({ msg: "ok" }));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await svc.unlockGameLevel("Dijkstra", 0, "regular");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/status/unlock/u1/Dijkstra/regular/0",
        { method: "POST" }
      );
      expect(console.error).toHaveBeenCalledWith(
        "Error in unlockGameLevel:",
        expect.any(TypeError)
      );
    });

    it("on non-ok response: cache unchanged and resolves", async () => {
      const res = errorResponse(400, { ok: false, msg: "Failed to unlock the game level" });
      fetchMock.mockResolvedValue(res);
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await expect(
        svc.unlockGameLevel("Dijkstra", 2, "regular")
      ).resolves.toBeUndefined();
      expect(res.json).not.toHaveBeenCalled();
      expect(svc.gameStatus.games.Dijkstra.regular[1].status).toBe("locked");
      expect(console.error).toHaveBeenCalledWith(
        "Error in unlockGameLevel:",
        expect.objectContaining({ message: "Failed to unlock game level." })
      );
    });

    it("when fetch rejects: swallows the error, cache unchanged", async () => {
      fetchMock.mockRejectedValue(new Error("offline"));
      const svc = new GameStatusService("u1");
      svc.gameStatus = makeStatus();
      await expect(
        svc.unlockGameLevel("Dijkstra", 2, "regular")
      ).resolves.toBeUndefined();
      expect(svc.gameStatus.games.Dijkstra.regular[1].status).toBe("locked");
    });

    it("with null cache: POSTs, then the cache write throws (swallowed)", async () => {
      // NOTE: current behavior, possibly a bug: server unlocked but local cache write
      // at gameStatusService.js:168 throws on null gameStatus.
      fetchMock.mockResolvedValue(okResponse({ msg: "ok" }));
      const svc = new GameStatusService("u1");
      await expect(
        svc.unlockGameLevel("Dijkstra", 2, "regular")
      ).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(svc.gameStatus).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        "Error in unlockGameLevel:",
        expect.any(TypeError)
      );
    });
  });
});
