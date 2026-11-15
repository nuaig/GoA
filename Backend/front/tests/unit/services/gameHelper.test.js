// @vitest-environment jsdom
// Characterization tests for utils/gameHelper.js (GameHelper).
// jsdom is needed because gameHelper.js imports ./UI/ui.js, which reads
// `document` at module load and whose real decrementHealth mutates .health-icon images.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../utils/UI/animations.js", () => ({
  shakeScreen: vi.fn(),
}));

import { GameHelper } from "../../../utils/gameHelper.js";
import { shakeScreen } from "../../../utils/UI/animations.js";
import { GameSession } from "../../../utils/gameRelated/gameSession.js";

// Copied from Dijkstra.html (#health-bar)
const HEALTH_BAR_HTML = `
  <div id="health-bar">
    <img class="health-icon" src="./symbols/health-full-icon.svg" alt="Health Icon" width="20" height="20" />
    <img class="health-icon" src="./symbols/health-full-icon.svg" alt="Health Icon" width="20" height="20" />
    <img class="health-icon" src="./symbols/health-full-icon.svg" alt="Health Icon" width="20" height="20" />
    <img class="health-icon" src="./symbols/health-full-icon.svg" alt="Health Icon" width="20" height="20" />
    <img class="health-icon" src="./symbols/health-full-icon.svg" alt="Health Icon" width="20" height="20" />
  </div>`;

const EMPTY_ICON = "./../../symbols/health-empty-icon.svg";

function iconSrcs() {
  return [...document.querySelectorAll(".health-icon")].map((el) =>
    el.getAttribute("src")
  );
}

function makeRoomUI(overrides = {}) {
  return {
    uiText: { innerText: "", innerHTML: "" },
    health: 4,
    currentMode: "regular",
    isTutorial: false,
    currentScore: 0,
    currentLevel: 1,
    totalStars: 0,
    gameName: "Dijkstra",
    wrongSelectionFeedback: vi.fn(),
    fillInfoFailureSuccessCompletionModal: vi.fn(),
    fillInfoSuccessCompletionModal: vi.fn(),
    openCompletionModal: vi.fn(),
    disableMouseEventListeners_K_P: vi.fn(),
    updateLevelStatus: vi.fn(),
    gameStatusService: {
      updateGameStatus: vi.fn(),
      unlockGameLevel: vi.fn(),
    },
    ...overrides,
  };
}

function makeSession() {
  return {
    setFinalScore: vi.fn(),
    setSuccessStatus: vi.fn(),
    endSession: vi.fn(),
    incrementMistakes: vi.fn(),
    toObject: vi.fn(() => ({ userId: "u1", gameSession: { game_name: "Dijkstra" } })),
  };
}

describe("GameHelper", () => {
  let fetchMock;

  beforeEach(() => {
    document.body.innerHTML = HEALTH_BAR_HTML;
    fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    shakeScreen.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  describe("handleWrongSelection", () => {
    it("sets the UI text and calls wrongSelectionFeedback", () => {
      const ui = makeRoomUI();
      GameHelper.handleWrongSelection(ui, "Wrong node!", false, makeSession());
      expect(ui.uiText.innerText).toBe("Wrong node!");
      expect(ui.wrongSelectionFeedback).toHaveBeenCalledTimes(1);
    });

    it("tolerates a curRoomUI without wrongSelectionFeedback", () => {
      const ui = makeRoomUI({ wrongSelectionFeedback: undefined });
      expect(() =>
        GameHelper.handleWrongSelection(ui, "x", false, makeSession())
      ).not.toThrow();
      expect(ui.health).toBe(3);
    });

    it("sets the UI text to an empty string when given '' (as dijkstra.js does)", () => {
      const ui = makeRoomUI();
      ui.uiText.innerText = "previous";
      GameHelper.handleWrongSelection(ui, "", false, makeSession());
      expect(ui.uiText.innerText).toBe("");
    });

    describe("tutorial (isTutorial argument = true)", () => {
      it("does not change health, does not shake, does not touch icons", () => {
        const ui = makeRoomUI({ health: 4 });
        GameHelper.handleWrongSelection(ui, "tut", true, makeSession());
        expect(ui.health).toBe(4);
        expect(shakeScreen).not.toHaveBeenCalled();
        expect(iconSrcs()).toEqual(Array(5).fill("./symbols/health-full-icon.svg"));
        // feedback still runs in tutorial
        expect(ui.uiText.innerText).toBe("tut");
        expect(ui.wrongSelectionFeedback).toHaveBeenCalledTimes(1);
      });

      it("never triggers failure, even with health already below 0 in regular mode", () => {
        const ui = makeRoomUI({ health: -1, currentMode: "regular" });
        const session = makeSession();
        GameHelper.handleWrongSelection(ui, "tut", true, session);
        expect(ui.health).toBe(-1);
        expect(ui.openCompletionModal).not.toHaveBeenCalled();
        expect(session.setSuccessStatus).not.toHaveBeenCalled();
      });
    });

    describe("non-tutorial", () => {
      it("defaults isTutorial to false when omitted", () => {
        const ui = makeRoomUI({ health: 4 });
        GameHelper.handleWrongSelection(ui, "x");
        expect(ui.health).toBe(3);
        expect(shakeScreen).toHaveBeenCalledTimes(1);
      });

      it("decrements health by one, empties the icon at the old health index, shakes once", () => {
        const ui = makeRoomUI({ health: 4 });
        GameHelper.handleWrongSelection(ui, "x", false, makeSession());
        expect(ui.health).toBe(3);
        expect(shakeScreen).toHaveBeenCalledTimes(1);
        const srcs = iconSrcs();
        expect(srcs[4]).toBe(EMPTY_ICON);
        expect(srcs.slice(0, 4)).toEqual(Array(4).fill("./symbols/health-full-icon.svg"));
      });

      it("health 4 -> 0 over four mistakes, no failure yet", () => {
        const ui = makeRoomUI({ health: 4 });
        const session = makeSession();
        for (let i = 0; i < 4; i++) {
          GameHelper.handleWrongSelection(ui, "x", false, session);
        }
        expect(ui.health).toBe(0);
        expect(ui.openCompletionModal).not.toHaveBeenCalled();
        expect(iconSrcs()).toEqual([
          "./symbols/health-full-icon.svg",
          EMPTY_ICON,
          EMPTY_ICON,
          EMPTY_ICON,
          EMPTY_ICON,
        ]);
      });

      it("health 1 -> 0 does not trigger failure (0 is still alive)", () => {
        const ui = makeRoomUI({ health: 1 });
        GameHelper.handleWrongSelection(ui, "x", false, makeSession());
        expect(ui.health).toBe(0);
        expect(ui.openCompletionModal).not.toHaveBeenCalled();
      });

      it("health 0 -> -1 in regular mode triggers handleGameFailure", () => {
        const ui = makeRoomUI({ health: 0, currentScore: 37 });
        const session = makeSession();
        const spy = vi.spyOn(GameHelper, "handleGameFailure");
        GameHelper.handleWrongSelection(ui, "x", false, session);
        expect(ui.health).toBe(-1);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(ui, session);
        expect(ui.openCompletionModal).toHaveBeenCalledTimes(1);
        expect(session.setFinalScore).toHaveBeenCalledWith(37);
        expect(session.setSuccessStatus).toHaveBeenCalledWith(false);
        expect(iconSrcs()[0]).toBe(EMPTY_ICON);
      });

      it("health 0 -> -1 in training mode does NOT trigger failure", () => {
        const ui = makeRoomUI({ health: 0, currentMode: "training" });
        const session = makeSession();
        GameHelper.handleWrongSelection(ui, "x", false, session);
        expect(ui.health).toBe(-1);
        expect(ui.openCompletionModal).not.toHaveBeenCalled();
        expect(session.endSession).not.toHaveBeenCalled();
      });

      it("health 0 -> -1 in regular mode with curRoomUI.isTutorial = true does NOT trigger failure", () => {
        const ui = makeRoomUI({ health: 0, isTutorial: true });
        GameHelper.handleWrongSelection(ui, "x", false, makeSession());
        expect(ui.health).toBe(-1);
        expect(ui.openCompletionModal).not.toHaveBeenCalled();
        expect(ui.isTutorial).toBe(true);
      });

      it("health already -1 in regular mode: health stays -1 but failure is triggered AGAIN", () => {
        // NOTE: current behavior, possibly a bug: decrementHealth is a no-op below 0,
        // so every further wrong click after game over re-runs handleGameFailure
        // (gameHelper.js:30-35) — re-opening the modal and re-ending the session.
        const ui = makeRoomUI({ health: -1 });
        const session = makeSession();
        GameHelper.handleWrongSelection(ui, "x", false, session);
        GameHelper.handleWrongSelection(ui, "x", false, session);
        expect(ui.health).toBe(-1);
        expect(ui.openCompletionModal).toHaveBeenCalledTimes(2);
        expect(session.endSession).toHaveBeenCalledTimes(2);
        expect(shakeScreen).toHaveBeenCalledTimes(2);
      });

      it("health above max (5) is left unchanged and does not fail", () => {
        const ui = makeRoomUI({ health: 5 });
        GameHelper.handleWrongSelection(ui, "x", false, makeSession());
        expect(ui.health).toBe(5);
        expect(shakeScreen).toHaveBeenCalledTimes(1);
        expect(ui.openCompletionModal).not.toHaveBeenCalled();
      });

      it("does not increment the session's mistake counter", () => {
        // NOTE: current behavior, possibly a bug: handleWrongSelection never calls
        // curGameSession.incrementMistakes() (gameHelper.js:16-38). kruskal.js/prim.js/heapsort.js
        // call it inline, but dijkstra.js and Astar.js rely solely on GameHelper, so their
        // stored total_mistakes is always 0.
        const ui = makeRoomUI({ health: 4 });
        const session = makeSession();
        GameHelper.handleWrongSelection(ui, "x", false, session);
        expect(session.incrementMistakes).not.toHaveBeenCalled();
      });

      it("does not need a session unless failure is triggered", () => {
        const ui = makeRoomUI({ health: 3 });
        expect(() => GameHelper.handleWrongSelection(ui, "x", false, undefined)).not.toThrow();
      });

      it("throws if failure is triggered without a session", () => {
        const ui = makeRoomUI({ health: 0 });
        expect(() => GameHelper.handleWrongSelection(ui, "x", false, undefined)).toThrow(TypeError);
      });
    });
  });

  describe("handleGameFailure", () => {
    it("fills the failure modal, finalizes the session as failed, clears tutorial flag, opens modal, disables input (in that order)", () => {
      const calls = [];
      const ui = makeRoomUI({ currentScore: 55, isTutorial: true });
      ui.fillInfoFailureSuccessCompletionModal.mockImplementation(() => calls.push("fill"));
      ui.openCompletionModal.mockImplementation(() => calls.push("open"));
      ui.disableMouseEventListeners_K_P.mockImplementation(() => calls.push("disable"));
      const session = makeSession();
      session.setFinalScore.mockImplementation(() => calls.push("score"));
      session.setSuccessStatus.mockImplementation(() => calls.push("success"));
      session.endSession.mockImplementation(() => calls.push("end"));

      GameHelper.handleGameFailure(ui, session);

      expect(calls).toEqual(["fill", "score", "success", "end", "open", "disable"]);
      expect(session.setFinalScore).toHaveBeenCalledWith(55);
      expect(session.setSuccessStatus).toHaveBeenCalledWith(false);
      expect(ui.isTutorial).toBe(false);
    });

    it("works without fillInfoFailureSuccessCompletionModal (optional call)", () => {
      const ui = makeRoomUI({ fillInfoFailureSuccessCompletionModal: undefined });
      expect(() => GameHelper.handleGameFailure(ui, makeSession())).not.toThrow();
      expect(ui.openCompletionModal).toHaveBeenCalledTimes(1);
    });

    it("requires openCompletionModal and disableMouseEventListeners_K_P (not optional-chained)", () => {
      expect(() =>
        GameHelper.handleGameFailure(makeRoomUI({ openCompletionModal: undefined }), makeSession())
      ).toThrow(TypeError);
      expect(() =>
        GameHelper.handleGameFailure(
          makeRoomUI({ disableMouseEventListeners_K_P: undefined }),
          makeSession()
        )
      ).toThrow(TypeError);
    });

    it("does not POST the failed session or touch game status", () => {
      // NOTE: current behavior, possibly a bug: kruskal.js/prim.js POST failed sessions to
      // /api/gamesessions, but GameHelper.handleGameFailure (gameHelper.js:5-14) does not,
      // so failed Dijkstra/A* runs are never recorded.
      const ui = makeRoomUI();
      const session = makeSession();
      GameHelper.handleGameFailure(ui, session);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(session.toObject).not.toHaveBeenCalled();
      expect(ui.gameStatusService.updateGameStatus).not.toHaveBeenCalled();
      expect(ui.gameStatusService.unlockGameLevel).not.toHaveBeenCalled();
    });

    it("does not modify health", () => {
      const ui = makeRoomUI({ health: -1 });
      GameHelper.handleGameFailure(ui, makeSession());
      expect(ui.health).toBe(-1);
    });
  });

  describe("handleLevelCompletion", () => {
    it.each([
      // health, maxLevelScore, expected score = floor(max * ((health+1)*0.1 + 1))
      [4, 100, 150],
      [3, 100, 140],
      [2, 100, 130],
      [1, 100, 120],
      [0, 100, 110],
      [-1, 100, 100],
      [4, 333, 499],
      [2, 333, 432],
      [0, 0, 0],
    ])("health %i, max %i -> score %i", (health, max, expected) => {
      const ui = makeRoomUI({ health });
      GameHelper.handleLevelCompletion(ui, makeSession(), max);
      expect(ui.currentScore).toBe(expected);
    });

    it("an undefined maxLevelScore yields NaN (no guard)", () => {
      const ui = makeRoomUI({ health: 4 });
      const session = makeSession();
      GameHelper.handleLevelCompletion(ui, session, undefined);
      expect(ui.currentScore).toBeNaN();
      expect(session.setFinalScore).toHaveBeenCalledWith(NaN);
    });

    it("sets the congratulations HTML and fills the success modal", () => {
      const ui = makeRoomUI();
      GameHelper.handleLevelCompletion(ui, makeSession(), 100);
      expect(ui.uiText.innerHTML).toBe("Congratulations! You've completed the game!");
      expect(ui.fillInfoSuccessCompletionModal).toHaveBeenCalledTimes(1);
    });

    it("finalizes the session as a success with the computed score", () => {
      const ui = makeRoomUI({ health: 3 });
      const session = makeSession();
      GameHelper.handleLevelCompletion(ui, session, 200);
      expect(session.setFinalScore).toHaveBeenCalledWith(280);
      expect(session.setSuccessStatus).toHaveBeenCalledWith(true);
      expect(session.endSession).toHaveBeenCalledTimes(1);
      expect(session.toObject).toHaveBeenCalledTimes(1);
    });

    it("POSTs the session snapshot to /api/gamesessions (fire-and-forget)", () => {
      const ui = makeRoomUI();
      const session = makeSession();
      const ret = GameHelper.handleLevelCompletion(ui, session, 100);
      expect(ret).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("/api/gamesessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "u1", gameSession: { game_name: "Dijkstra" } }),
      });
    });

    it("with a real GameSession, the POST body matches the backend's {userId, gameSession} contract", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-05-05T00:00:00.000Z"));
      try {
        const session = new GameSession("user-7", "Dijkstra", "regular", 2);
        vi.advanceTimersByTime(42_500);
        const ui = makeRoomUI({ health: 2, currentLevel: 2 });
        GameHelper.handleLevelCompletion(ui, session, 100);
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body).toEqual({
          userId: "user-7",
          gameSession: {
            game_name: "Dijkstra",
            mode: "regular",
            level: 2,
            total_mistakes: 0,
            final_score: 130,
            start_time: "2025-05-05T00:00:00.000Z",
            duration: 42,
            success: true,
          },
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it("updates level UI with the (post-fill) totalStars, then saves status and unlocks the next level", () => {
      const ui = makeRoomUI({ currentLevel: 2, currentMode: "regular", gameName: "Astar", health: 4 });
      ui.fillInfoSuccessCompletionModal.mockImplementation(() => {
        ui.totalStars = 2; // setStars(4) returns 2 (=3 stars)
      });
      GameHelper.handleLevelCompletion(ui, makeSession(), 100);

      expect(ui.updateLevelStatus).toHaveBeenCalledWith(2, 2);
      expect(ui.gameStatusService.updateGameStatus).toHaveBeenCalledWith(
        "Astar",
        2,
        "regular",
        150,
        3,
        "completed"
      );
      expect(ui.gameStatusService.unlockGameLevel).toHaveBeenCalledWith("Astar", 3, "regular");
      expect(ui.openCompletionModal).toHaveBeenCalledTimes(1);
      expect(ui.disableMouseEventListeners_K_P).toHaveBeenCalledTimes(1);
    });

    it.each([
      // level, totalStars (0-based from setStars), expected status
      [1, 2, "completed"],
      [1, 0, "completed"],
      [2, 2, "completed"],
      [3, 2, "completed_first_time"],
      [3, 1, "completed"],
      [3, 0, "completed"],
      [3, -1, "completed"],
    ])("level %i with totalStars %i -> status %s", (level, totalStars, status) => {
      const ui = makeRoomUI({ currentLevel: level, totalStars });
      GameHelper.handleLevelCompletion(ui, makeSession(), 100);
      const args = ui.gameStatusService.updateGameStatus.mock.calls[0];
      expect(args[4]).toBe(totalStars + 1);
      expect(args[5]).toBe(status);
    });

    it("level 3 asks to unlock level 4 (GameStatusService rejects it client-side)", () => {
      const ui = makeRoomUI({ currentLevel: 3 });
      GameHelper.handleLevelCompletion(ui, makeSession(), 100);
      expect(ui.gameStatusService.unlockGameLevel).toHaveBeenCalledWith("Dijkstra", 4, "regular");
    });

    it("passes the training mode through to status + unlock", () => {
      const ui = makeRoomUI({ currentMode: "training", currentLevel: 1 });
      GameHelper.handleLevelCompletion(ui, makeSession(), 100);
      expect(ui.gameStatusService.updateGameStatus.mock.calls[0][2]).toBe("training");
      expect(ui.gameStatusService.unlockGameLevel).toHaveBeenCalledWith("Dijkstra", 2, "training");
    });

    it("runs steps in order: fill modal -> session -> POST -> level UI -> status -> unlock -> open -> disable", () => {
      const calls = [];
      const ui = makeRoomUI();
      ui.fillInfoSuccessCompletionModal.mockImplementation(() => calls.push("fill"));
      ui.updateLevelStatus.mockImplementation(() => calls.push("levelUI"));
      ui.gameStatusService.updateGameStatus.mockImplementation(() => calls.push("status"));
      ui.gameStatusService.unlockGameLevel.mockImplementation(() => calls.push("unlock"));
      ui.openCompletionModal.mockImplementation(() => calls.push("open"));
      ui.disableMouseEventListeners_K_P.mockImplementation(() => calls.push("disable"));
      const session = makeSession();
      session.endSession.mockImplementation(() => calls.push("end"));
      fetchMock.mockImplementation(() => {
        calls.push("fetch");
        return Promise.resolve({ ok: true });
      });
      GameHelper.handleLevelCompletion(ui, session, 100);
      expect(calls).toEqual(["fill", "end", "fetch", "levelUI", "status", "unlock", "open", "disable"]);
    });

    it("optional hooks (fill/open/disable) may be missing", () => {
      const ui = makeRoomUI({
        fillInfoSuccessCompletionModal: undefined,
        openCompletionModal: undefined,
        disableMouseEventListeners_K_P: undefined,
      });
      expect(() => GameHelper.handleLevelCompletion(ui, makeSession(), 100)).not.toThrow();
    });

    it("does not change health or call shakeScreen", () => {
      const ui = makeRoomUI({ health: 2 });
      GameHelper.handleLevelCompletion(ui, makeSession(), 100);
      expect(ui.health).toBe(2);
      expect(shakeScreen).not.toHaveBeenCalled();
    });
  });
});
