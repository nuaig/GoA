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
}
