import * as THREE from "three";
import gsap from "gsap";
import Swiper from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination } from "swiper/modules";

import { setStars } from "./ui";
class GameRoomUI {
  constructor(
    gameName,
    initialLevel,
    camera,
    callbacks = {} // Object containing multiple callback functions
  ) {
    this.gameName = gameName;
    this.currentLevel = initialLevel;
    this.currentMode = "";
    this.gameStatusService = null;
    this.curGameSession = null;
    this.isModalOpen = false;
    this.levelModalOpen = true;
    this.health = 4;
    this.currentScore = 0;
    this.choosingModeNotCurrent = "training";
    this.totalstars = 0;

    this.callbacks = callbacks;
    this.camera = camera;
    this.swiper = new Swiper(".mySwiper", {
      modules: [Navigation, Pagination], // ✅ Ensure modules are included
      slidesPerView: 1,
      grabCursor: true,
      loop: true,
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
    });
    // Assigning callbacks with default empty functions to avoid errors
    this.callbacks = {
      resetLevel: callbacks.resetLevel || (() => {}),
      onMouseMove: callbacks.onMouseMove || (() => {}),
      onClick: callbacks.onClick || (() => {}),
    };
    this.initializeUIElements();
    this.addEventListeners();
  }

  setGameStatusService(gameStatusService) {
    this.gameStatusService = gameStatusService;
  }

  setGameSession(curGameSession) {
    this.curGameSession = curGameSession;
  }

  initializeUIElements() {
    this.uiText = document.getElementById("UI-Text");
    this.scoreElements = document.querySelectorAll(".score-label-2");
    this.scoreText = document.querySelector(".score-label-2");

    this.svgStars = document.querySelectorAll(
      ".level__stars__holder svg.feather-star"
    );

    this.instructionModal = document.querySelector(".instruction");
    this.overlay = document.querySelector(".overlay");
    this.hoverEffects = document.querySelectorAll(".hover");

    this.pseudoBoxButton = document.querySelector(".Pesudocode-Icon");
    this.reArrangeButton = document.querySelector(".Rearrange-Action");
    this.helpInstructionButton = document.querySelector(".Instruction-Icon");

    // Level Completion Modal (Both Success and Failure)
    this.modalCompletion = document.querySelector(".modal__completion");
    this.modalCompletionHeader = document.querySelector(
      ".modal__completion__header"
    );
    this.finalScoreText = document.querySelector(".label__final_score span");
    this.buttonNextLevel = document.querySelector(".btn__next");
    this.buttonAgain = document.querySelector(".btn__again");
    this.buttonChangeLevel = document.querySelector(".btn__change__level");
    this.labelCompletionText = document.querySelector(
      ".label__completion_text"
    );

    this.buttonStartInstructionModal = document.querySelector(
      ".btn__instruction__start"
    );

    this.settingsModal = document.querySelector(".modal__settings");
    this.settingsTogglerEle = document.querySelector(".settings__icon");
    this.btnSettingsRestart = document.querySelector(".btn__setting__restart");
    this.btnSettingsDiffLvl = document.querySelector(".btn__setting__diffLvl");
    this.btnSettingsGoMainDungeon = document.querySelectorAll(
      ".btn__setting__mainDungeon"
    );

    this.settingsCloseButton = document.querySelector(
      ".modal__settings .btn__close"
    );

    this.levelsModal = document.querySelector(".modal__level__selection");
    this.levelButtons = document.querySelectorAll(".level__btn__holder");
    this.btnLevelClose = document.querySelector(".btn__level__close");

    // Algorithm Instruction
    this.algoInstructionModal = document.querySelector(
      ".algo-instruction-modal"
    );
    this.btnAlgoInstrClose = document.querySelector(
      ".btn-algo-instruction-close"
    );

    // headers for two modes
    this.headerWithHealth = document.getElementById("header-with-health");
    this.headerWithoutHealth = document.getElementById("header-without-health");

    // buttons for modes in level selection modal
    this.trainingBtn = document.getElementById("training-mode-btn");
    this.regularBtn = document.getElementById("regular-mode-btn");
  }

  addEventListeners() {
    // click events for mode selection buttons
    this.trainingBtn.addEventListener("click", () =>
      this.toggleMode("training")
    );
    this.regularBtn.addEventListener("click", () => this.toggleMode("regular"));

    // this.levelButtons.forEach((button, index) => {
    //   button.addEventListener("click", () =>
    //     this.handleLevelSelection(index + 1)
    //   );
    // });

    // -------Instruction Modal---------
    this.addAllEventListenersInstructionModal();
    // -------Pseudo Modal-------
    this.listenEventPseudoModalToggle();
    // -------settings Modal-----
    this.addAllEventListenersForSettingsModal();
    // -------completion Modal-----
    // Adding event listener to aa buttons in level selection Modal
    this.addAllEventListenersForCompletionModal();
    // Adding event listener to each level buttons in level selection Modal
    this.finalizeLevelEventListener();

    this.addAllEventListenersAlgoInstructionModal();
  }

  resetAllComponents() {}

  updateScore(newScore) {
    this.currentScore = newScore;
    this.scoreElements.forEach((element) => {
      element.textContent = newScore.toString().padStart(2, "0");
    });
    this.scoreText.innerHTML = `${this.currentScore}`;
  }

  hideStars() {
    this.svgStars.forEach((star) => {
      star.style.visibility = "hidden"; // Hide stars
    });
  }

  showStars() {
    this.svgStars.forEach((star) => {
      star.style.visibility = "visible"; // Show stars
    });
  }

  toggleHeader(showHealth) {
    if (showHealth) {
      this.headerWithHealth.classList.remove("hidden");
      this.headerWithoutHealth.classList.add("hidden");
    } else {
      this.headerWithHealth.classList.add("hidden");
      this.headerWithoutHealth.classList.remove("hidden");
    }
  }

  async toggleMode(mode) {
    if (!this.gameStatusService) {
      console.error("Error: gameStatusService is not initialized.");
      return;
    }

    if (mode === "training") {
      this.trainingBtn.classList.add("active");
      this.regularBtn.classList.remove("active");
      this.choosingModeNotCurrent = "training";
      this.hideStars();
    } else if (mode === "regular") {
      this.regularBtn.classList.add("active");
      this.trainingBtn.classList.remove("active");
      this.choosingModeNotCurrent = "regular";
      this.showStars();
    }

    await this.initializeLevelStatus(mode);
  }
  // DONE be careful with this.gameName (ex. Kruskal and kruskal)
  async initializeLevelStatus(mode) {
    try {
      if (!this.gameStatusService) {
        console.error("Error: gameStatusService is not initialized.");
        return;
      }

      const gameStatus = await this.gameStatusService.getLocalGameStatus();

      if (!gameStatus) {
        console.error("No game status found for this user.");
        return;
      }

      this.resetAllLevels();

      const levels = gameStatus.games[this.gameName]?.[mode];
      if (!levels) {
        console.error(`No levels found for mode: ${mode}`);
        return;
      }

      let highestCompletedLevel = 0;
      levels.forEach((gameData, index) => {
        const level = index + 1;
        const currentLevelButton = document.querySelector(
          `.btn__level__${level}`
        );
        const currentStarsHolder = currentLevelButton.querySelector(
          ".level__stars__holder"
        );

        const stars = currentStarsHolder.querySelectorAll("svg.feather-star");
        for (let i = 0; i < stars.length; i++) {
          if (i < gameData.stars) {
            stars[i].classList.add("filled");
            stars[i].style.fill = "#a5d8ff";
          } else {
            stars[i].classList.remove("filled");
            stars[i].style.fill = "none";
          }
        }

        if (gameData.status === "completed") {
          highestCompletedLevel = level;
          this.unlockLevelUI(level);
        }
      });

      if (highestCompletedLevel > 0 && highestCompletedLevel < levels.length) {
        this.unlockLevelUI(highestCompletedLevel + 1);
      }
    } catch (error) {
      console.error("Error initializing level status:", error);
    }
  }

  // DONE
  resetAllLevels() {
    this.levelButtons.forEach((button) => {
      button.classList.add("level__locked");
      const stars = button.querySelectorAll(
        ".level__stars__holder svg.feather-star"
      );
      stars.forEach((star) => {
        star.classList.remove("filled");
        star.style.fill = "none";
      });

      const lockIcon = button.querySelector(".feather-lock");
      if (lockIcon) lockIcon.style.display = "block";
    });

    const firstLevelButton = document.querySelector(".btn__level__1");
    if (firstLevelButton) {
      firstLevelButton.classList.remove("level__locked");
      const lockIcon = firstLevelButton.querySelector(".feather-lock");
      if (lockIcon) lockIcon.style.display = "none";
    }
  }

  // DONE
  unlockLevelUI(level) {
    const nextLevelButton = document.querySelector(`.btn__level__${level}`);
    if (nextLevelButton) {
      nextLevelButton.classList.remove("level__locked");
      const lockIcon = nextLevelButton.querySelector(".feather-lock");
      if (lockIcon) lockIcon.style.display = "none";
    }
  }

  updateLevelStatus(level, starsCount) {
    const currentLevelButton = document.querySelector(`.btn__level__${level}`);
    const currentStarsHolder = currentLevelButton.querySelector(
      ".level__stars__holder"
    );

    // Update stars based on the zero-based starsCount
    const stars = currentStarsHolder.querySelectorAll("svg.feather-star");
    for (let i = 0; i < stars.length; i++) {
      if (i <= starsCount) {
        stars[i].classList.add("filled");
        stars[i].style.fill = "#a5d8ff"; // Gold color for filled stars
      } else {
        stars[i].classList.remove("filled");
        stars[i].style.fill = "none"; // Default color for unfilled stars
      }
    }

    // Unlock the next level
    const nextLevel = level + 1;
    const nextLevelButton = document.querySelector(`.btn__level__${nextLevel}`);
    if (nextLevelButton) {
      nextLevelButton.classList.remove("level__locked");
      const lockIcon = nextLevelButton.querySelector(".feather-lock");
      if (lockIcon) {
        lockIcon.style.display = "none"; // Hide the lock icon
      }
    }
  }

  // Level Finalize Button
  finalizeLevelEventListener() {
    this.levelButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        if (button.classList.contains("level__locked")) {
          console.log(`Level ${index + 1} is locked.`);
          return; // Exit if the level is locked
        }

        this.closeModal(this.levelsModal);

        const chosenLevel = index + 1; // Levels are 1-based
        console.log(`Level ${chosenLevel} selected.`);

        // Only reset the level if it is different from the current level
        // or the mode has changed
        if (
          chosenLevel !== this.currentLevel ||
          this.choosingModeNotCurrent !== this.currentMode ||
          this.health < 0
        ) {
          this.currentLevel = chosenLevel;
          this.currentMode = this.choosingModeNotCurrent; // Update the current mode
          this.disableMouseEventListeners_K_P();

          this.callbacks.resetLevel(this.currentLevel); // Reset the scene for the chosen level

          // Show or hide the health bar based on the chosen mode
          if (this.currentMode === "regular") {
            this.toggleHeader(true); // Show health bar for regular mode
          } else {
            this.toggleHeader(false); // Hide health bar for training mode
          }

          this.curGameSession.resetGameSession(
            this.gameName,
            this.currentLevel,
            this.currentMode
          );
          if (this.gameName == "Kruskal" || this.gameName == "Prim") {
            this.initailCameraAnimationGSAP(); // Trigger the camera animation
          }
        }
      });
    });
  }

  initailCameraAnimationGSAP() {
    const timeline = gsap.timeline();
    const midPosition = { x: 0, y: 5, z: 26 };
    const endPosition = { x: 0, y: 26, z: 26 };

    // First animation to move to the midPosition
    timeline.to(this.camera.position, {
      x: midPosition.x,
      y: midPosition.y,
      z: midPosition.z,
      duration: 2, // Duration of the first animation
      ease: "power2.inOut",
      onUpdate: () => {
        this.camera.lookAt(new THREE.Vector3(0, 0, 4)); // Keep looking at the target
      },
    });

    // Second animation to move to the endPosition
    timeline.to(this.camera.position, {
      x: endPosition.x,
      y: endPosition.y,
      z: endPosition.z,
      duration: 2, // Duration of the second animation
      ease: "power2.inOut",
      onUpdate: () => {
        this.camera.lookAt(new THREE.Vector3(0, 0, 4)); // Keep looking at the target
      },
    });
  }

  // -------Instruction Modal---------
  addAllEventListenersInstructionModal() {
    this.listenEventInstructionModalGameStart();
    this.listenEventHelpButtonInstructionModalOpen();
    this.listenEventGameFeatureInstrModal();
    this.listenEventAlgorithmInstrModal();
  }

  listenEventInstructionModalGameStart() {
    this.buttonStartInstructionModal.addEventListener("click", () => {
      this.disableMouseEventListeners_K_P();
      console.log("inside Instruction Game Start");
      console.log(this.levelModalOpen);
      if (!this.levelModalOpen) {
        console.log("inside Instruction Game Start enabling");
        this.overlay.classList.add("hidden");
        this.closeModal(this.instructionModal);
      }
      this.instructionModal.classList.add("hidden");
      this.levelModalOpen = false;
    });
  }
  listenEventHelpButtonInstructionModalOpen() {
    this.helpInstructionButton.addEventListener("click", () => {
      // this.openModal(this.instructionModal);
      // document.querySelector(".btn__instruction__start").textContent =
      //   "Close Instruction";
      let subMenu = document.getElementById("subMenu");

      subMenu.classList.toggle("open-menu");
    });
  }

  listenEventGameFeatureInstrModal() {
    const gameFeatureBtn = document.querySelector(".sub-menu-game-features");
    gameFeatureBtn.addEventListener("click", () => {
      this.openModal(this.instructionModal);
      document.querySelector(".btn__instruction__start").textContent =
        "Close Instruction";
      let subMenu = document.getElementById("subMenu");

      subMenu.classList.toggle("open-menu");
    });
  }

  listenEventAlgorithmInstrModal() {
    const algoInstrBtn = document.querySelector(".sub-menu-algo-instructions");
    algoInstrBtn.addEventListener("click", () => {
      console.log(this.algoInstructionModal);
      this.openModal(this.algoInstructionModal);
      let subMenu = document.getElementById("subMenu");

      subMenu.classList.toggle("open-menu");
    });
  }

  // -------Algo Instruction Modal-------
  addAllEventListenersAlgoInstructionModal() {
    this.listenEventCloseButtonAlgoInstructionModal();
  }
  listenEventCloseButtonAlgoInstructionModal() {
    this.btnAlgoInstrClose.addEventListener("click", () => {
      this.closeModal(this.algoInstructionModal);
    });
  }
  // -------Pseudo Modal-------
  listenEventPseudoModalToggle() {
    this.pseudoBoxButton.addEventListener("click", () => {
      this.pseudoModalToggle();
    });
  }

  pseudoModalToggle() {
    const pseudoModal = document.querySelector(".pseudo");
    pseudoModal.classList.toggle("hidden");
  }
  pseudoModalClose() {
    const pseudoModal = document.querySelector(".pseudo");
    pseudoModal.classList.add("hidden");
  }
  // -------Setting Modal--------
  addAllEventListenersForSettingsModal() {
    this.listenEventSettingsModalOpen();
    this.listenEventSettingsModalClose();
    this.listenEventLvlSelectionModalOpen();
    this.listenEventLvlSelectionModalClose();
    this.listenEventGoToMainDungeon();
    this.listenEventSettingsModalRestartLevel();
  }
  // Event Listener for Opening Settings Modal
  listenEventSettingsModalOpen() {
    this.settingsTogglerEle.addEventListener("click", () => {
      this.openModal(this.settingsModal);
    });
  }

  // Event Listener for Closing Settings Modal
  listenEventSettingsModalClose() {
    this.settingsCloseButton.addEventListener("click", () => {
      this.closeModal(this.settingsModal);
    });
  }

  // Event Listener for restarting Level from Settings Modal
  listenEventSettingsModalRestartLevel() {
    this.btnSettingsRestart.addEventListener("click", () => {
      this.closeModal(this.settingsModal);
      this.callbacks.resetLevel(this.currentLevel);
    });
  }

  // Button to open level Selection in setting modal
  // ----------Level Modal-----------------
  listenEventLvlSelectionModalOpen() {
    this.btnSettingsDiffLvl.addEventListener("click", async (e) => {
      e.preventDefault();

      // Close the settings modal first
      await this.closeModal(this.settingsModal);

      setTimeout(() => {
        this.disableMouseEventListeners_K_P();
      }, 1500); // Re-enable mouse events when modal is closed
      // Open the level sel
      this.btnLevelClose.classList.remove("hidden");
      this.openModal(this.levelsModal);
    });
  }

  // Button to close level Selection in setting modal
  listenEventLvlSelectionModalClose() {
    this.btnLevelClose.addEventListener("click", (e) => {
      e.preventDefault();
      this.closeModal(this.levelsModal);
    });
  }

  // Button to go back to main Dungeon in setting modal
  listenEventGoToMainDungeon() {
    this.btnSettingsGoMainDungeon.forEach((button) => {
      button.addEventListener("click", () => {
        window.location.href = "mainDungeon.html";
      });
    });
  }

  // --------Modal Completion----------
  addAllEventListenersForCompletionModal() {
    this.listenEventPlayAgainCompletionModal();
    this.listenEventPlayNextLevelCompletionModal();
    this.listenEventChangeLevelCompletionModal();
  }
  // TO DO used to be openModal in Kruskal
  openCompletionModal() {
    this.openModal(this.modalCompletion);
    // Check if it's level 3
    // if (this.currentLevel === 3) {
    //   // Remove or hide the "Next Level" button if it's level 3
    //   this.buttonNextLevel.style.display = "none";
    // } else {
    //   // Ensure the "Next Level" button is visible for other levels
    //   this.buttonNextLevel.style.display = "inline-block";
    // }
  }

  // TO DO used to be closeModal in Kruskal
  closeCompletionModal() {
    this.closeModal(this.modalCompletion);
  }

  fillInfoSuccessCompletionModal() {
    this.modalCompletionHeader.innerHTML = "Congratulations!";
    this.finalScoreText.innerHTML = `${this.currentScore}`;
    this.labelCompletionText.innerHTML = `
        You have successfully completed level ${this.currentLevel} of ${this.gameName}'s Algorithm in ${this.currentMode} mode!
      `;
    if (this.currentMode == "regular") {
      this.totalStars = setStars(this.health);
    } else {
      this.totalStars = setStars(4);
    }
    this.buttonChangeLevel.style.display = "none";
    if (this.currentLevel === 3) {
      // Remove or hide the "Next Level" button if it's level 3
      this.buttonNextLevel.style.display = "none";
    } else {
      // Ensure the "Next Level" button is visible for other levels
      this.buttonNextLevel.style.display = "inline-block";
    }
  }

  fillInfoFailureSuccessCompletionModal() {
    this.modalCompletionHeader.innerHTML = "Game Over!";
    this.finalScoreText.innerHTML = `${this.currentScore}`;
    this.labelCompletionText.innerHTML = `
        You have failed level ${this.currentLevel} of ${this.gameName}'s Algorithm in ${this.currentMode} mode!
      `;

    this.totalStars = setStars(this.health);
    this.buttonChangeLevel.style.display = "inline-block";
    this.buttonNextLevel.style.display = "none";
  }

  listenEventPlayAgainCompletionModal() {
    this.buttonAgain.addEventListener("click", () => {
      this.callbacks.resetLevel(this.currentLevel);
    });
  }

  listenEventPlayNextLevelCompletionModal() {
    this.buttonNextLevel.addEventListener("click", () => {
      this.currentLevel++;
      this.callbacks.resetLevel(this.currentLevel);
    });
  }

  listenEventChangeLevelCompletionModal() {
    this.buttonChangeLevel.addEventListener("click", () => {
      this.closeCompletionModal();

      setTimeout(() => {
        this.disableMouseEventListeners_K_P();
      }, 1500); // Re-enable mouse events when modal is closed
      // Open the level sel
      this.btnLevelClose.classList.remove("hidden");
      this.openModal(this.levelsModal);
    });
  }

  // Functions for all modals
  // Function to open a modal
  openModal(modal) {
    modal.classList.remove("hidden"); // Show the given modal
    this.overlay.classList.remove("hidden"); // Show overlay
    this.isModalOpen = true; // Update modal state
    this.disableMouseEventListeners_K_P(); // Disable mouse events when modal is open
  }

  // Function to close a modal
  closeModal(modal) {
    modal.classList.add("hidden"); // Hide the given modal
    this.overlay.classList.add("hidden"); // Hide overlay
    this.isModalOpen = false; // Update modal state
    console.log("inside closeModal");
    console.log(this.gameName);
    // this.enableMouseEventListeners_K_P();
    setTimeout(() => {
      this.enableMouseEventListeners_K_P();
    }, 1000); // Re-enable mouse events when modal is closed
  }

  // -------For Kruskal and Prim Only------------
  // enable Mouse event listeners
  enableMouseEventListeners_K_P() {
    console.log(this.gameName);
    if (this.gameName == "Kruskal" || this.gameName == "Prim") {
      if (this.callbacks?.onMouseMove) {
        console.log("mousemove added back");
        window.addEventListener("mousemove", this.callbacks.onMouseMove, false);
      }
      if (this.callbacks?.onClick) {
        console.log("click added back");
        window.addEventListener("click", this.callbacks.onClick, false);
      }
    }
  }

  // Disable mouse event listeners
  disableMouseEventListeners_K_P() {
    if (this.gameName == "Kruskal" || this.gameName == "Prim") {
      if (this.callbacks?.onMouseMove) {
        console.log("mousemove removed");
        window.removeEventListener(
          "mousemove",
          this.callbacks.onMouseMove,
          false
        );
      }
      if (this.callbacks?.onClick) {
        console.log("click removed");
        window.removeEventListener("click", this.callbacks.onClick, false);
      }
    }
  }
  // -------Done For Kruskal and Prim Only------------
}

export default GameRoomUI;
