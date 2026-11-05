// Characterization tests for utils/gameRelated/gameSession.js
// GameSession is a pure in-memory record. It performs NO network calls itself;
// the POST to /api/gamesessions happens in GameHelper.handleLevelCompletion
// (see tests/unit/services/gameHelper.test.js) and inline in kruskal.js/prim.js.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameSession } from "../../../utils/gameRelated/gameSession.js";

const T0 = new Date("2025-01-02T03:04:05.000Z");

describe("GameSession", () => {
  let fetchMock;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("stores userId and builds a default session (arg order: userId, gameName, mode, level)", () => {
      const s = new GameSession("user-1", "Dijkstra", "regular", 2);
      expect(s.userId).toBe("user-1");
      expect(s.gameSession).toEqual({
        game_name: "Dijkstra",
        mode: "regular",
        level: 2,
        total_mistakes: 0,
        final_score: 0,
        start_time: "2025-01-02T03:04:05.000Z",
        duration: 0,
        success: false,
      });
      expect(s.startTime).toBe(T0.getTime());
    });

    it("accepts undefined/null values without validation", () => {
      const s = new GameSession(undefined, undefined, undefined, null);
      expect(s.userId).toBeUndefined();
      expect(s.gameSession.game_name).toBeUndefined();
      expect(s.gameSession.mode).toBeUndefined();
      expect(s.gameSession.level).toBeNull();
    });

    it("does not call fetch", () => {
      new GameSession("u", "Kruskal", "training", 1);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("incrementMistakes", () => {
    it("increments total_mistakes by exactly 1 per call", () => {
      const s = new GameSession("u", "Prim", "regular", 1);
      s.incrementMistakes();
      expect(s.gameSession.total_mistakes).toBe(1);
      s.incrementMistakes();
      s.incrementMistakes();
      expect(s.gameSession.total_mistakes).toBe(3);
    });

    it("has no upper bound (keeps counting past the 5 health icons)", () => {
      const s = new GameSession("u", "Prim", "regular", 1);
      for (let i = 0; i < 10; i++) s.incrementMistakes();
      expect(s.gameSession.total_mistakes).toBe(10);
    });
  });

  describe("setFinalScore / setSuccessStatus", () => {
    it("overwrites final_score with whatever is passed (no validation)", () => {
      const s = new GameSession("u", "Heapsort", "regular", 1);
      s.setFinalScore(150);
      expect(s.gameSession.final_score).toBe(150);
      s.setFinalScore(0);
      expect(s.gameSession.final_score).toBe(0);
      s.setFinalScore(-5);
      expect(s.gameSession.final_score).toBe(-5);
      s.setFinalScore(undefined);
      expect(s.gameSession.final_score).toBeUndefined();
    });

    it("overwrites success with whatever is passed", () => {
      const s = new GameSession("u", "Heapsort", "regular", 1);
      s.setSuccessStatus(true);
      expect(s.gameSession.success).toBe(true);
      s.setSuccessStatus(false);
      expect(s.gameSession.success).toBe(false);
    });
  });

  describe("endSession", () => {
    it("sets duration to whole elapsed seconds (floored)", () => {
      const s = new GameSession("u", "Astar", "regular", 1);
      vi.advanceTimersByTime(12_999);
      s.endSession();
      expect(s.gameSession.duration).toBe(12);
    });

    it("gives 0 when ended immediately", () => {
      const s = new GameSession("u", "Astar", "regular", 1);
      s.endSession();
      expect(s.gameSession.duration).toBe(0);
    });

    it("can be called multiple times and always measures from startTime", () => {
      const s = new GameSession("u", "Astar", "regular", 1);
      vi.advanceTimersByTime(5_000);
      s.endSession();
      expect(s.gameSession.duration).toBe(5);
      vi.advanceTimersByTime(3_500);
      s.endSession();
      expect(s.gameSession.duration).toBe(8);
    });

    it("does not change start_time, score, success or mistakes", () => {
      const s = new GameSession("u", "Astar", "regular", 1);
      s.incrementMistakes();
      s.setFinalScore(42);
      s.setSuccessStatus(true);
      vi.advanceTimersByTime(2_000);
      s.endSession();
      expect(s.gameSession).toMatchObject({
        start_time: "2025-01-02T03:04:05.000Z",
        final_score: 42,
        success: true,
        total_mistakes: 1,
        duration: 2,
      });
    });

    it("does not call fetch", () => {
      const s = new GameSession("u", "Astar", "regular", 1);
      s.endSession();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("resetGameSession", () => {
    it("rebuilds the session (arg order: gameName, level, mode) and restarts the clock", () => {
      const s = new GameSession("user-9", "Dijkstra", "regular", 1);
      s.incrementMistakes();
      s.setFinalScore(99);
      s.setSuccessStatus(true);
      vi.advanceTimersByTime(60_000);
      s.endSession();

      s.resetGameSession("Dijkstra", 3, "training");

      expect(s.userId).toBe("user-9");
      expect(s.gameSession).toEqual({
        game_name: "Dijkstra",
        mode: "training",
        level: 3,
        total_mistakes: 0,
        final_score: 0,
        start_time: "2025-01-02T03:05:05.000Z",
        duration: 0,
        success: false,
      });
      expect(s.startTime).toBe(T0.getTime() + 60_000);

      vi.advanceTimersByTime(4_000);
      s.endSession();
      expect(s.gameSession.duration).toBe(4);
    });

    it("can change game name (no validation)", () => {
      const s = new GameSession("u", "Dijkstra", "regular", 1);
      s.resetGameSession("Kruskal", 2, "regular");
      expect(s.gameSession.game_name).toBe("Kruskal");
      expect(s.gameSession.level).toBe(2);
    });

    it("logs the toObject() snapshot and does not call fetch", () => {
      const s = new GameSession("u", "Dijkstra", "regular", 1);
      s.resetGameSession("Dijkstra", 1, "regular");
      expect(console.log).toHaveBeenCalledWith(s.toObject());
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("replaces the gameSession object (old references are not mutated)", () => {
      const s = new GameSession("u", "Dijkstra", "regular", 1);
      const before = s.gameSession;
      before.total_mistakes = 7;
      s.resetGameSession("Dijkstra", 1, "regular");
      expect(s.gameSession).not.toBe(before);
      expect(before.total_mistakes).toBe(7);
      expect(s.gameSession.total_mistakes).toBe(0);
    });
  });

  describe("toObject", () => {
    it("returns { userId, gameSession } with the exact body shape the backend expects", () => {
      const s = new GameSession("abc", "Prim", "regular", 2);
      s.incrementMistakes();
      s.setFinalScore(120);
      s.setSuccessStatus(true);
      vi.advanceTimersByTime(30_000);
      s.endSession();
      expect(s.toObject()).toEqual({
        userId: "abc",
        gameSession: {
          game_name: "Prim",
          mode: "regular",
          level: 2,
          total_mistakes: 1,
          final_score: 120,
          start_time: "2025-01-02T03:04:05.000Z",
          duration: 30,
          success: true,
        },
      });
    });

    it("returns a shallow copy of gameSession (mutating it does not affect the instance)", () => {
      const s = new GameSession("abc", "Prim", "regular", 2);
      const obj = s.toObject();
      obj.gameSession.total_mistakes = 100;
      expect(s.gameSession.total_mistakes).toBe(0);
      expect(s.toObject()).not.toBe(obj);
    });

    it("serializes cleanly to JSON", () => {
      const s = new GameSession("abc", "Prim", "regular", 2);
      expect(JSON.parse(JSON.stringify(s.toObject()))).toEqual(s.toObject());
    });
  });
});
