import { decrementHealth } from "./UI/ui.js";
import { shakeScreen } from "./UI/animations.js";

export class GameHelper {
  static handleGameFailure(curRoomUI, curGameSession) {
    curRoomUI.fillInfoFailureSuccessCompletionModal?.();
    curGameSession.setFinalScore(curRoomUI.currentScore);
    curGameSession.setSuccessStatus(false);
    curGameSession.endSession();
    curRoomUI.isTutorial = false;

    curRoomUI.openCompletionModal();
    curRoomUI.disableMouseEventListeners_K_P();
  }

  static handleWrongSelection(
    curRoomUI,
    errorMessage,
    isTutorial = false,
    curGameSession
  ) {
    document.querySelector(".Hint-Text").classList.add("hidden");
    curRoomUI.uiText.innerText = errorMessage;
    curRoomUI.wrongSelectionFeedback?.();

    if (!isTutorial) {
      curRoomUI.health = decrementHealth(curRoomUI.health);
      shakeScreen();

      if (
        curRoomUI.health < 0 &&
        curRoomUI.currentMode === "regular" &&
        !curRoomUI.isTutorial
      ) {
        this.handleGameFailure(curRoomUI, curGameSession);
      }
    }
  }

  static handleLevelCompletion(
    curRoomUI,
    curGameSession,
    maxLevelScore
  ) {
    // Score Calculation
    curRoomUI.currentScore = Math.floor(
      maxLevelScore * ((curRoomUI.health + 1) * 0.1 + 1)
    );

    // UI Text Update
    curRoomUI.uiText.innerHTML = `Congratulations! You've completed the game!`;
    curRoomUI.fillInfoSuccessCompletionModal?.();

    // Game Session Finalization
    curGameSession.setFinalScore(curRoomUI.currentScore);
    curGameSession.setSuccessStatus(true);
    curGameSession.endSession();

    const sessionData = curGameSession.toObject();
    console.log("Submitting session data:", sessionData);

    fetch("/api/gamesessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessionData),
    });

    // Update level UI
    curRoomUI.updateLevelStatus(curRoomUI.currentLevel, curRoomUI.totalStars);

    // First-time completion handling
    const updateStatus =
      curRoomUI.currentLevel !== 3 ? "completed" : "completed_first_time";

    curRoomUI.gameStatusService.updateGameStatus(
      curRoomUI.gameName, // dynamic: "Kruskal", "Dijkstra", etc.
      curRoomUI.currentLevel,
      curRoomUI.currentMode,
      curRoomUI.currentScore,
      curRoomUI.totalStars + 1,
      updateStatus
    );

    // Unlock next level
    curRoomUI.gameStatusService.unlockGameLevel(
      curRoomUI.gameName,
      curRoomUI.currentLevel + 1,
      curRoomUI.currentMode
    );

    // Show modal and disable input
    curRoomUI.openCompletionModal?.();
    curRoomUI.disableMouseEventListeners_K_P?.();
  }
}
