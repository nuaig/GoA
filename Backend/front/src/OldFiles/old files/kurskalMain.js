import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Graph, createRandomConnectedGraph } from "../graph.js";
import { createThreePointLighting } from "../utils/threePointLighting.js";
import { KruskalAlgorithm } from "../utils/graphRelated/kruskal.js";
import { PrimAlgorithm } from "../utils/graphRelated/prims.js";
import { GameSession } from "../utils/gameRelated/gameSession.js";
import { loadModel } from "../utils/threeModels.js";
import { GameStatusService } from "../utils/gameStatus/gameStatusService.js";
import gsap from "gsap";
import {
  toggleInstructions,
  closePseudocode,
  decrementHealth,
  resetHealth,
  setStars,
  resetStars,
  updateHintIcons,
} from "../utils/UI/ui.js";
import {
  effectForCorrectSelect,
  shakeForWrongSelect,
  shakeScreen,
} from "../utils/UI/animations.js";
import {
  drawLine,
  updateLinePosition,
  isTriangleInequalitySatisfied,
  setFont,
  createNodeLabel,
  updateNodeLabel,
  updateNodeLabelColor,
  updateComponentColors,
  getRandomColor,
  createRing,
  highlightChest,
} from "../utils/graphRelated/drawLine.js";

const uiText = document.getElementById("UI-Text");
const scoreElements = document.querySelectorAll(".score-label-2");
const scoreText = document.querySelector(".score-label-2");
const finalScoreText = document.querySelector(".label__final_score span");
const labelCompletionText = document.querySelector(".label__completion_text");
const stars = document.querySelectorAll(".star path:last-child");

const instructionModal = document.querySelector(".instruction");
const overlay = document.querySelector(".overlay");
const hoverEffects = document.querySelectorAll(".hover");

const pseudoBoxButton = document.querySelector(".Pesudocode-Icon");
const reArrangeButton = document.querySelector(".Rearrange-Action");
const helpInstructionButton = document.querySelector(".Instruction-Icon");

const buttonNextLevel = document.querySelector(".btn__next");
const modalCompletion = document.querySelector(".modal__completion");

const buttonAgain = document.querySelector(".btn__again");
const buttonStart = document.querySelector(".btn__instruction__start");

const settingsModal = document.querySelector(".modal__settings");
const settingsTogglerEle = document.querySelector(".settings__icon");
const btnSettingsRestart = document.querySelector(".btn__setting__restart");
const btnSettingsDiffLvl = document.querySelector(".btn__setting__diffLvl");
const btnSettingsGoMainDungeon = document.querySelectorAll(
  ".btn__setting__mainDungeon"
);

const settingsCloseButton = document.querySelector(
  ".modal__settings .btn__close"
);

const levelsModal = document.querySelector(".modal__level__selection");

// Select all level buttons
const levelButtons = document.querySelectorAll(".level__btn__holder");
const btnLevelClose = document.querySelector(".btn__level__close");

let curGameSession;
let levelModalOpen = true;
// DONE
// Function to update the score
function updateScore(newScore) {
  // Iterate over each element and update its text content
  scoreElements.forEach((element) => {
    element.textContent = newScore.toString().padStart(2, "0"); // Ensures a two-digit format (e.g., '00')
  });
}
// DONE
// Function to hide stars
function hideStars() {
  const svgStars = document.querySelectorAll(
    ".level__stars__holder svg.feather-star"
  );
  svgStars.forEach((star) => {
    star.style.visibility = "hidden"; // Hide stars
  });
}
// DONE
// Function to show stars
function showStars() {
  const svgStars = document.querySelectorAll(
    ".level__stars__holder svg.feather-star"
  );
  svgStars.forEach((star) => {
    star.style.visibility = "visible"; // Show stars
  });
}
// DONE
// Function to toggle headers
function toggleHeader(showHealth) {
  const headerWithHealth = document.getElementById("header-with-health");
  const headerWithoutHealth = document.getElementById("header-without-health");

  if (showHealth) {
    headerWithHealth.classList.remove("hidden");
    headerWithoutHealth.classList.add("hidden");
  } else {
    headerWithHealth.classList.add("hidden");
    headerWithoutHealth.classList.remove("hidden");
  }
}
// DONE
async function toggleMode(mode) {
  if (!gameStatusService) {
    console.error("Error: gameStatusService is not initialized.");
    return;
  }

  const trainingBtn = document.getElementById("training-mode-btn");
  const regularBtn = document.getElementById("regular-mode-btn");

  if (mode === "training") {
    trainingBtn.classList.add("active");
    regularBtn.classList.remove("active");
    choosingModeNotCurrent = "training";
    hideStars(); // Hide stars for training mode
    // toggleHeader(false); // Hide health bar for training mode
  } else if (mode === "regular") {
    regularBtn.classList.add("active");
    trainingBtn.classList.remove("active");
    choosingModeNotCurrent = "regular";
    console.log(choosingModeNotCurrent);
    showStars(); // Show stars for regular mode
    // toggleHeader(true); // Show health bar for regular mode
  }

  // Initialize level status for the selected mode
  await initializeLevelStatus(mode);
}
// DONE
// Event listeners for mode buttons
document.getElementById("training-mode-btn").addEventListener("click", () => {
  toggleMode("training");
});
// DONE
document.getElementById("regular-mode-btn").addEventListener("click", () => {
  toggleMode("regular");
});

// Initialize to regular mode
// toggleMode("regular");

let isModalOpen = false;

let currentScore = 0;
let currentLevel = 1;
let currentMode;
let choosingModeNotCurrent;
let curNodes;
let curEdges;
let graph;

const levelConfig = {
  1: { nodes: 5, edges: 7 },
  2: { nodes: 6, edges: 9 },
  3: { nodes: 7, edges: 11 },
};

const usedColors = new Set();
const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
curNodes = Array.from({ length: numNodes }, (_, i) => i);
curEdges = numEdges;

graph = createRandomConnectedGraph(curNodes, curEdges);

let componentColors = {};

let curAlgorithmForGraph = new KruskalAlgorithm(graph);
let currentAlgorithm = "kruskal";

let startingNodeLabelForPrim;
let startingNodeRingForPrim;

let health = 4;

let onMouseMove;
let onClick;
let gameStatusService;

// Add an event listener to initialize the game after login
document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch("/api/users/getUser", {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const userData = await response.json();
      console.log("User is logged in:", userData);

      // Initialize GameStatusService with the logged-in userId
      gameStatusService = new GameStatusService(userData.id);

      // Await the initialization of GameStatusService
      await gameStatusService.init();
      const userId = gameStatusService.getUserId();
      curGameSession = new GameSession(userId, "Kruskal", currentLevel);
      console.log(curGameSession.toObject());
      // Ensure toggleMode is called only after initialization
      await toggleMode("regular");
    } else {
      console.warn("User is not logged in. Redirecting to login page.");
      window.location.href = "signInSignUp.html";
    }
  } catch (error) {
    console.error("Error checking login status:", error);
    window.location.href = "signInSignUp.html";
  }
});

// DONE
async function initializeLevelStatus(mode) {
  try {
    if (!gameStatusService) {
      console.error("Error: gameStatusService is not initialized.");
      return;
    }

    // Fetch game status for the user
    const gameStatus = await gameStatusService.getLocalGameStatus();

    if (!gameStatus) {
      console.error("No game status found for this user.");
      return;
    }

    // Reset all levels to the locked state and clear stars
    resetAllLevels();

    let highestCompletedLevel = 0;

    // Get the specific levels based on the selected mode
    const kruskalLevels = gameStatus.games["Kruskal"]?.[mode];
    if (!kruskalLevels) {
      console.error(`No levels found for mode: ${mode}`);
      return;
    }

    console.log(`Initializing levels for mode: ${mode}`, kruskalLevels);

    kruskalLevels.forEach((gameData, index) => {
      const level = index + 1; // Levels are 1-based index

      // Find the button and star elements for the current level
      const currentLevelButton = document.querySelector(
        `.btn__level__${level}`
      );
      const currentStarsHolder = currentLevelButton.querySelector(
        ".level__stars__holder"
      );

      // Update the stars based on the level data
      const stars = currentStarsHolder.querySelectorAll("svg.feather-star");
      for (let i = 0; i < stars.length; i++) {
        if (i < gameData.stars) {
          stars[i].classList.add("filled");
          stars[i].style.fill = "#a5d8ff"; // Filled stars color
        } else {
          stars[i].classList.remove("filled");
          stars[i].style.fill = "none"; // Default color for unfilled stars
        }
      }

      // Check if the level is completed and track the highest completed level
      if (gameData.status === "completed") {
        highestCompletedLevel = level;
        unlockLevelUI(level);
      }
    });

    // Unlock the next level if there is a completed level
    if (
      highestCompletedLevel > 0 &&
      highestCompletedLevel < kruskalLevels.length
    ) {
      unlockLevelUI(highestCompletedLevel + 1);
    }
  } catch (error) {
    console.error("Error initializing level status:", error);
  }
}

// DONE
// Function to reset all levels to the original state
function resetAllLevels() {
  const levelButtons = document.querySelectorAll(".level__btn__holder");

  levelButtons.forEach((button, index) => {
    button.classList.add("level__locked"); // Lock the level

    // Reset stars
    const stars = button.querySelectorAll(
      ".level__stars__holder svg.feather-star"
    );
    stars.forEach((star) => {
      star.classList.remove("filled");
      star.style.fill = "none"; // Default color for unfilled stars
    });

    // Show lock icon
    const lockIcon = button.querySelector(".feather-lock");
    if (lockIcon) {
      lockIcon.style.display = "block"; // Show the lock icon
    }
  });

  // Always unlock the first level
  const firstLevelButton = document.querySelector(".btn__level__1");
  if (firstLevelButton) {
    firstLevelButton.classList.remove("level__locked");
    const lockIcon = firstLevelButton.querySelector(".feather-lock");
    if (lockIcon) {
      lockIcon.style.display = "none"; // Hide the lock icon
    }
  }

  console.log(
    "All levels have been reset to the original state, and the first level is unlocked."
  );
}

// DONE
function unlockLevelUI(level) {
  const nextLevelButton = document.querySelector(`.btn__level__${level}`);
  if (nextLevelButton) {
    nextLevelButton.classList.remove("level__locked");
    const lockIcon = nextLevelButton.querySelector(".feather-lock");
    if (lockIcon) {
      lockIcon.style.display = "none"; // Hide the lock icon
    }
  }
}

// DONE
function updateLevelStatus(level, starsCount) {
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
// DONE
levelButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    if (button.classList.contains("level__locked")) {
      console.log(`Level ${index + 1} is locked.`);
      return; // Exit if the level is locked
    }

    closeLevelModal();

    const chosenLevel = index + 1; // Levels are 1-based
    console.log(`Level ${chosenLevel} selected.`);

    // Only reset the level if it is different from the current level
    // or the mode has changed
    if (
      chosenLevel !== currentLevel ||
      choosingModeNotCurrent !== currentMode
    ) {
      currentLevel = chosenLevel;
      currentMode = choosingModeNotCurrent; // Update the current mode
      window.removeEventListener("mousemove", onMouseMove, false);
      window.removeEventListener("click", onClick, false);

      resetLevel(currentLevel); // Reset the scene for the chosen level

      // Show or hide the health bar based on the chosen mode
      if (currentMode === "regular") {
        toggleHeader(true); // Show health bar for regular mode
      } else {
        toggleHeader(false); // Hide health bar for training mode
      }
      initailCameraAnimationGSAP(); // Trigger the camera animation
    }
  });
});

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0x000);
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

const closedChestURL = new URL("./src/Prop_Chest_Closed.gltf", import.meta.url);
const openChestURL = new URL("./src/Prop_Chest_Gold.gltf", import.meta.url);
const dungeonRoomURL = new URL("./src/DungeonRoom.glb", import.meta.url);

let chestList = [];
let openChestList = [];
let chestLabelList = [];
let edgeList = [];
let edgeLabelList = [];
let ringList = [];
let sphereInter;
const mixers = [];
const cubeSize = 1;
const minDistance = cubeSize * 10;
const gridSize = 40;
let labels = [];
let dungeonRoomMixer;
let dungeonRoomAction;
// DONE
// Setting Toggler for Setting Modal
settingsTogglerEle.addEventListener("click", () => {
  settingsModal.classList.toggle("hidden");
  overlay.classList.toggle("hidden");
  isModalOpen = !isModalOpen;
  disableEventListeners();
});

// DONE
settingsCloseButton.addEventListener("click", () => {
  settingsModal.classList.toggle("hidden");
  overlay.classList.toggle("hidden");
  isModalOpen = false;
  enableEventListeners();
});
// FIXME
function closeLevelModal() {
  levelsModal.classList.add("hidden");
  overlay.classList.add("hidden");
  isModalOpen = false;

  // Delay enabling event listeners by 300ms
  setTimeout(() => {
    enableEventListeners();
  }, 300);
}
// FIXME
function openLevelModal() {
  levelsModal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  isModalOpen = true;
  disableEventListeners();
}
// FIXME
function closeSettingModal() {
  settingsModal.classList.add("hidden");
  overlay.classList.add("hidden");
  isModalOpen = false;
  enableEventListeners();
}
// FIXME
function openSettingModal() {
  settingsModal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  isModalOpen = true;
}

const startPosition = { x: 0, y: 5, z: 35 };
const midPosition = { x: 0, y: 5, z: 26 };
const endPosition = { x: 0, y: 26, z: 26 };
// camera.position.set(0, 26, 26); // Set the camera position
camera.position.set(startPosition.x, startPosition.y, startPosition.z);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 4);
// DONE
function initailCameraAnimationGSAP() {
  const timeline = gsap.timeline();

  // First animation to move to the midPosition
  timeline.to(camera.position, {
    x: midPosition.x,
    y: midPosition.y,
    z: midPosition.z,
    duration: 2, // Duration of the first animation
    ease: "power2.inOut",
    onUpdate: () => {
      camera.lookAt(new THREE.Vector3(0, 0, 4)); // Keep looking at the target
    },
  });

  // Second animation to move to the endPosition
  timeline.to(camera.position, {
    x: endPosition.x,
    y: endPosition.y,
    z: endPosition.z,
    duration: 2, // Duration of the second animation
    ease: "power2.inOut",
    onUpdate: () => {
      camera.lookAt(new THREE.Vector3(0, 0, 4)); // Keep looking at the target
    },
  });
}

// DONE
btnSettingsDiffLvl.addEventListener("click", async (e) => {
  e.preventDefault();

  // Close the settings modal first
  await closeSettingModal();

  // Open the levels modal after the settings modal is fully closed
  btnLevelClose.classList.remove("hidden");
  openLevelModal();
  disableEventListeners();
});
// DONE
btnLevelClose.addEventListener("click", (e) => {
  e.preventDefault();
  closeLevelModal();
});

// DONE
btnSettingsGoMainDungeon.forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = "mainDungeon.html";
  });
});

disableEventListeners();

// DONE
buttonStart.addEventListener("click", () => {
  disableEventListeners();
  // overlay.classList.add("hidden");
  if (!levelModalOpen) {
    overlay.classList.add("hidden");
    enableEventListeners();
  }
  instructionModal.classList.add("hidden");
  levelModalOpen = false;

  // levelsModal.classList.remove("hidden");
  // const userId = gameStatusService.getUserId();
  // curGameSession = new GameSession(userId, "Kruskal", currentLevel);
  // console.log(curGameSession.toObject());
});

// FIXME
function showPrimInstructions() {
  overlay.classList.remove("hidden");
  instructionModal.classList.remove("hidden");
  document
    .querySelector('.instruction__img[src="./src/Kruskal Instructions.png"]')
    .classList.add("hidden");
  document
    .querySelector('.instruction__img[src="./src/Prim Instructions.png"]')
    .classList.remove("hidden");
}

reArrangeButton.addEventListener("click", () => {
  console.log("Rearrange Button Clicked");
  const margin = 0.1;
  // Recompute positions for chests
  for (let i = 0; i < curNodes.length; i++) {
    let validPosition = false;
    let position = new THREE.Vector3();

    while (!validPosition) {
      const randomX = (Math.random() - 0.5) * gridSize;
      const randomZ = (Math.random() - 0.5) * gridSize;
      position.set(randomX, 0, randomZ);
      validPosition = true;

      for (let x = 0; x < chestList.length; x++) {
        if (chestList[x].position.distanceTo(position) < minDistance) {
          validPosition = false;
          break;
        }

        for (let y = x + 1; y < chestList.length; y++) {
          if (
            !isTriangleInequalitySatisfied(
              chestList[x].position,
              chestList[y].position,
              position,
              margin
            )
          ) {
            validPosition = false;
            break;
          }
        }

        if (!validPosition) break;
      }
    }

    // Update the position of the chests and their labels
    chestList[i].position.copy(position);
    openChestList[i].position.copy(position);
    chestLabelList[i].position.copy(position.clone().setY(position.y + 2.5));
  }

  console.log(edgeList[0].userData.startCube);

  // Update the positions of the lines and their labels
  edgeList.forEach((line, index) => {
    console.log(graph.edges[index]);
    const [start, end, weight] = graph.edges[index];
    updateLinePosition(line, chestList[start], chestList[end]);
  });
});

function primSetup() {
  // const randomIndex = Math.floor(Math.random() * chestList.length);
  const randomIndex = 0;
  const startClosedChest = chestList[randomIndex];
  const startOpenChest = openChestList[randomIndex];
  const startLabelPosition = startClosedChest.position.clone();
  startLabelPosition.y += 4;

  startingNodeLabelForPrim = createNodeLabel(
    "Start",
    startLabelPosition,
    scene
  );
  // Hide the closed chest and show the open chest
  startClosedChest.visible = false;
  startOpenChest.visible = true;

  startingNodeRingForPrim = highlightChest(startOpenChest, scene);

  // Set the starting node in Prim's algorithm
  curAlgorithmForGraph.setStartingNode(randomIndex);
}

// FIXME
window.toggleInstructions = function () {
  toggleInstructions(currentAlgorithm);
};
// DONE
pseudoBoxButton.addEventListener("click", () => {
  toggleInstructions(currentAlgorithm);
});

// DONE
helpInstructionButton.addEventListener("click", () => {
  instructionModal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  document.querySelector(".btn__instruction__start").textContent =
    "Close Instruction";
});

// DONE
const openModal = function (currentLevel) {
  // Show modal and overlay
  modalCompletion.classList.remove("hidden");
  disableEventListeners();
  overlay.classList.remove("hidden");

  // Select the "Next Level" button
  const nextButton = document.querySelector(".btn__next");

  // Check if it's level 3
  if (currentLevel === 3) {
    // Remove or hide the "Next Level" button if it's level 3
    nextButton.style.display = "none";
  } else {
    // Ensure the "Next Level" button is visible for other levels
    nextButton.style.display = "inline-block";
  }
};

// DONE
const closeModal = function () {
  modalCompletion.classList.add("hidden");
  overlay.classList.add("hidden");
  enableEventListeners();
};

async function createModels() {
  const margin = 0.1;
  const fixed = [];

  for (let i = 0; i < curNodes.length; i++) {
    let position;
    if (i < fixed.length) {
      // Use the fixed positions for the first three nodes
      position = new THREE.Vector3(fixed[i][0], fixed[i][1], fixed[i][2]);
    } else {
      // Generate random positions for the remaining nodes
      let validPosition = false;
      position = new THREE.Vector3();

      while (!validPosition) {
        const randomX = (Math.random() - 0.5) * gridSize;
        const randomZ = (Math.random() - 0.5) * gridSize;
        position.set(randomX, 0, randomZ);
        validPosition = true;

        for (let x = 0; x < chestList.length; x++) {
          if (chestList[x].position.distanceTo(position) < minDistance) {
            validPosition = false;
            break;
          }

          for (let y = x + 1; y < chestList.length; y++) {
            if (
              !isTriangleInequalitySatisfied(
                chestList[x].position,
                chestList[y].position,
                position,
                margin
              )
            ) {
              validPosition = false;
              break;
            }
          }

          if (!validPosition) break;
        }
      }
    }

    const closedModel = await loadModel(closedChestURL.href, position, scene);
    closedModel.model.scale.set(1.5, 1.5, 1.5);
    chestList.push(closedModel.model);

    const openModel = await loadModel(openChestURL.href, position, scene);
    openModel.model.scale.set(1.5, 1.5, 1.5);
    openModel.model.visible = false;
    openChestList.push(openModel.model);

    const labelPosition = position.clone();
    labelPosition.y += 2.5;

    const chestLabel = createNodeLabel(`${i}`, labelPosition, scene);
    chestLabelList.push(chestLabel);
  }

  if (currentAlgorithm === "prim") {
    primSetup();
  }

  console.log("All models loaded. Final chestList:", chestList);
  drawLines();
}

const fontLoader = new FontLoader();
let font;
let chapterTitle;
let levelTitle;
fontLoader.load(
  "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  (loadedFont) => {
    font = loadedFont;
    setFont(font);
    createModels();
    chapterTitle = createNodeLabel(
      "Kruskal's Algorithm",
      new THREE.Vector3(13, 7, -30),
      scene,
      1,
      0.3,
      0x212529
    );
    levelTitle = createNodeLabel(
      "Level 1",
      new THREE.Vector3(11, 4, -30),
      scene,
      0.9,
      0.3,
      0x212529
    );
  }
);

const labelDepth = 0.1;
let hoverRing = createRing(0.8, 0.9, labelDepth, 0x000000);
scene.add(hoverRing);

function updateNodeColorsForSameTree(edge) {
  function getNodesWithSameParentsAndColor(edge, color) {
    const nodesWithSameParentStart =
      curAlgorithmForGraph.getAllNodesWithSameParent(edge.start);
    const nodesWithSameParentEnd =
      curAlgorithmForGraph.getAllNodesWithSameParent(edge.end);
    nodesWithSameParentStart.concat(nodesWithSameParentEnd).forEach((node) => {
      updateNodeLabelColor(chestLabelList[node], color);
      componentColors[node] = color;
    });
  }

  const nodeStartColor = componentColors[edge.start];
  const nodeEndColor = componentColors[edge.end];
  if (nodeStartColor && nodeEndColor) {
    getNodesWithSameParentsAndColor(edge, nodeStartColor);
    usedColors.delete(nodeEndColor);
  } else if (!nodeStartColor && nodeEndColor) {
    getNodesWithSameParentsAndColor(edge, nodeEndColor);
  } else if (nodeStartColor && !nodeEndColor) {
    getNodesWithSameParentsAndColor(edge, nodeStartColor);
  } else {
    let newColor;
    do {
      newColor = getRandomColor();
    } while (usedColors.has(newColor));

    usedColors.add(newColor);

    getNodesWithSameParentsAndColor(edge, newColor);
  }
}

function handleSelectionEffect(intersectedObject) {
  intersectedObject.material.color.set(0x00ff00); // Set line to green
  intersectedObject.userData.selected = true; // Mark as selected

  const { startCube, endCube } = intersectedObject.userData;
  const closedStart = chestList[chestList.indexOf(startCube)];
  const openStart = openChestList[chestList.indexOf(startCube)];
  const closedEnd = chestList[chestList.indexOf(endCube)];
  const openEnd = openChestList[chestList.indexOf(endCube)];

  closedStart.visible = false;
  openStart.visible = true;
  closedEnd.visible = false;
  openEnd.visible = true;

  const permanentRing = createRing(0.8, 0.9, labelDepth, 0x000000);
  permanentRing.position.copy(intersectedObject.userData.label.position);
  permanentRing.position.y -= labelDepth / 2;
  scene.add(permanentRing);
  permanentRing.visible = true;
  ringList.push(permanentRing);
  intersectedObject.userData.ring = permanentRing;

  currentScore += 10;
  updateScore(currentScore);
  scoreText.innerHTML = `${currentScore}`;
}

function handleEdgeSelection(
  intersectedObject,
  currentAlgorithm,
  onClick,
  onMouseMove
) {
  const edge = intersectedObject.userData.edge;
  const selectEdgeResult = curAlgorithmForGraph.selectEdge([
    edge.start,
    edge.end,
    edge.weight,
  ]);
  const isComplete = curAlgorithmForGraph.isComplete();
  const currentWeight = curAlgorithmForGraph.currentWeight;

  if (selectEdgeResult.every((res) => res === 1)) {
    document.querySelector(".Hint-Text").classList.add("hidden");
    effectForCorrectSelect();
    if (currentAlgorithm === "kruskal") {
      // updateNodeColorsForSameTree({ ...edge, rootStart, rootEnd }, sameTree);
      updateNodeColorsForSameTree(edge);
    }
    handleSelectionEffect(intersectedObject);

    console.log("Selected edges:", curAlgorithmForGraph.selectedEdges);
    console.log("Current weight of the spanning tree:", currentWeight);

    if (isComplete) {
      currentScore = Math.floor(currentScore * ((health + 1) * 0.1 + 1));
      uiText.innerHTML = `Congratulations! You've completed the game!<br>The total weight of the minimum spanning tree is ${currentWeight}.`;
      finalScoreText.innerHTML = `${currentScore}`;
      const algoName = currentAlgorithm === "kruskal" ? "Kruskal" : "Prim";
      labelCompletionText.innerHTML = `
        You have successfully completed level ${currentLevel} of ${algoName}'s Algorithm in ${currentMode} mode!
      `;
      let totalStars;
      if (currentMode == "regular") {
        totalStars = setStars(health);
      } else {
        totalStars = setStars(4);
      }
      console.log(totalStars);

      curGameSession.setFinalScore(currentScore);
      curGameSession.setSuccessStatus(true);
      curGameSession.endSession();

      const sessionData = curGameSession.toObject();
      fetch("/api/gamesessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionData),
      }).then((res) => res.json());

      // Store the score and stars in localStorage with "kruskal" included
      const levelData = { score: currentScore, stars: totalStars };
      console.log(currentLevel);
      console.log(currentMode);
      // console.log(gameStatusService.gameStatus.games.Kruskal[2].status);
      updateLevelStatus(currentLevel, totalStars);
      const status_update_string =
        currentLevel != 3 ? "completed" : "completed_first_time";
      gameStatusService.updateGameStatus(
        "Kruskal",
        currentLevel,
        currentMode,
        currentScore,
        totalStars + 1,
        status_update_string
      );
      gameStatusService.unlockGameLevel(
        "Kruskal",
        currentLevel + 1,
        currentMode
      );

      openModal(currentLevel);
      window.removeEventListener("mousemove", onMouseMove, false);
      window.removeEventListener("click", onClick, false);
    } else {
      uiText.innerText = `Correct! Current weight is ${currentWeight}.`;
    }
  } else {
    shakeForWrongSelect();
    curGameSession.incrementMistakes();
    console.log("Incorrect edge selection:", edge);
    intersectedObject.material.color.set(0xff0000); // Set line to red
    if (intersectedObject.userData.label) {
      intersectedObject.userData.label.material.color.set(0xff0000); // Set label to red
    }
    health = decrementHealth(health);
    shakeScreen();
    document.querySelector(".Hint-Text").classList.remove("hidden");
    const hintItems = document.querySelectorAll(".Hint-Text li");
    updateHintIcons(hintItems[0], selectEdgeResult[0]);
    updateHintIcons(hintItems[1], selectEdgeResult[1]);
    if (currentAlgorithm === "prim") {
      const primHintItem = document.querySelector(".Prim-Hint");
      if (primHintItem) {
        primHintItem.classList.remove("hidden");
        updateHintIcons(primHintItem, selectEdgeResult[2]);
      }
    }
    uiText.innerText =
      "Incorrect Selection. Make sure to meet the following conditions:";

    setTimeout(() => {
      intersectedObject.material.color.set(0x74c0fc);
      if (intersectedObject.userData.label) {
        intersectedObject.userData.label.material.color.set(0x000000);
      }
    }, 3000);
  }
}

function drawLines() {
  console.log("Drawing lines between chests.");
  console.log("Graph edges:", graph.edges);
  const lines = [];
  graph.edges.forEach(([start, end, weight]) => {
    console.log("Drawing line between:", start, end);
    const edge = { start, end, weight };
    const line = drawLine(
      chestList[start],
      chestList[end],
      weight,
      edge,
      scene
    );
    lines.push(line);
    edgeList.push(line);
    edgeLabelList.push(line.userData.label);
  });

  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.5;
  const mouse = new THREE.Vector2();
  let selectedLine = null;

  const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  sphereInter = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereInter.visible = false;
  scene.add(sphereInter);

  // Assign the function to the global variable
  onMouseMove = function (event) {
    event.preventDefault();
    if (isModalOpen) return;
    if (curAlgorithmForGraph.isComplete()) {
      sphereInter.visible = false;
      hoverRing.visible = false;
      return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([...lines, ...labels]);

    if (intersects.length > 0) {
      hoverEffects.forEach((hoverEffect) => {
        hoverEffect.classList.add("highlight");
      });
      const intersectedObject = intersects[0].object;
      if (intersectedObject.userData.selected) {
        sphereInter.visible = false;
        hoverRing.visible = false;
        return;
      }

      sphereInter.position.copy(intersects[0].point);
      sphereInter.visible = true;

      if (selectedLine !== intersectedObject) {
        if (selectedLine && !selectedLine.userData.selected) {
          selectedLine.material.color.set(0x74c0fc);
          hoverRing.visible = false;
        }
        selectedLine = intersectedObject;
        if (!selectedLine.userData.selected) {
          selectedLine.material.color.set(0x00ff00);
          hoverRing.position.copy(selectedLine.userData.label.position);
          hoverRing.visible = true;
        }
      }
    } else {
      hoverEffects.forEach((hoverEffect) => {
        hoverEffect.classList.remove("highlight");
      });
      sphereInter.visible = false;
      hoverRing.visible = false;

      if (selectedLine && !selectedLine.userData.selected) {
        selectedLine.material.color.set(0x74c0fc);
        hoverRing.visible = false;
      }
      selectedLine = null;
    }
  };

  // Assign the function to the global variable
  onClick = function (event) {
    event.preventDefault();
    if (isModalOpen) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([...lines, ...labels]);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      if (intersectedObject.userData.selected) {
        return;
      }

      if (intersectedObject.userData) {
        handleEdgeSelection(
          intersectedObject,
          currentAlgorithm,
          onClick,
          onMouseMove
        );
      }
    }
  };

  // Add event listeners
  window.addEventListener("mousemove", onMouseMove, false);
  window.addEventListener("click", onClick, false);
}

createThreePointLighting(scene);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize, false);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const deltaSeconds = clock.getDelta();
  mixers.forEach((mixer) => {
    mixer.update(deltaSeconds);
  });
  controls.update();

  updateLabelRotation(); // Update label rotation on each frame
  renderer.render(scene, camera);
}
animate();

function updateLabelRotation() {
  chestLabelList.forEach((label) => {
    label.lookAt(camera.position);
  });
  edgeLabelList.forEach((label) => {
    label.lookAt(camera.position);
  });
  ringList.forEach((label) => {
    label.lookAt(camera.position);
  });
  hoverRing.lookAt(camera.position);
  if (startingNodeLabelForPrim) {
    startingNodeLabelForPrim.lookAt(camera.position);
  }
}

async function createDungeonRoom() {
  const position = new THREE.Vector3(0, -0.1, 0);
  try {
    const { model, mixer, action } = await loadModel(
      dungeonRoomURL.href,
      position,
      scene,
      mixers
    );

    if (mixer && action) {
      dungeonRoomMixer = mixer;
      dungeonRoomAction = action;
      console.log("Mixer and action initialized:", mixer, action);
      dungeonRoomAction.timeScale = 0.25;
      dungeonRoomAction.setLoop(THREE.LoopOnce);
      dungeonRoomAction.clampWhenFinished = true;
      dungeonRoomAction.paused = false;
    } else {
      console.log("Mixer or action is undefined.");
    }
    model.scale.set(1.5, 1.5, 1.5);
  } catch (error) {
    console.error("Error loading dungeon room:", error);
  }
}

createDungeonRoom();

// Function to enable event listeners
function enableEventListeners() {
  window.addEventListener("mousemove", onMouseMove, false);
  window.addEventListener("click", onClick, false);
}

// Function to disable event listeners
function disableEventListeners() {
  window.removeEventListener("mousemove", onMouseMove, false);
  window.removeEventListener("click", onClick, false);
}

function resetScene() {
  // Remove objects from the scene and dispose of their resources
  chestList.forEach((chest) => {
    scene.remove(chest);
    if (chest.geometry) chest.geometry.dispose();
    if (chest.material) chest.material.dispose();
  });
  openChestList.forEach((chest) => {
    scene.remove(chest);
    if (chest.geometry) chest.geometry.dispose();
    if (chest.material) chest.material.dispose();
  });
  chestLabelList.forEach((label) => {
    scene.remove(label);
    if (label.geometry) label.geometry.dispose();
    if (label.material) label.material.dispose();
  });
  edgeList.forEach((edge) => {
    scene.remove(edge);
    if (edge.geometry) edge.geometry.dispose();
    if (edge.material) edge.material.dispose();
  });
  edgeLabelList.forEach((label) => {
    scene.remove(label);
    if (label.geometry) label.geometry.dispose();
    if (label.material) label.material.dispose();
  });
  ringList.forEach((ring) => {
    scene.remove(ring);
    if (ring.geometry) ring.geometry.dispose();
    if (ring.material) ring.material.dispose();
  });

  // Reset arrays and variables
  chestList.length = 0;
  openChestList.length = 0;
  chestLabelList.length = 0;
  edgeList.length = 0;
  edgeLabelList.length = 0;
  ringList.length = 0;

  // Clear raycaster references
  window.removeEventListener("mousemove", onMouseMove, false);
  window.removeEventListener("click", onClick, false);
  onMouseMove = null;
  onClick = null;

  // Reset any leftover resources
  if (sphereInter) {
    scene.remove(sphereInter);
    sphereInter.geometry.dispose();
    sphereInter.material.dispose();
  }

  if (startingNodeLabelForPrim) {
    scene.remove(startingNodeLabelForPrim);
    startingNodeLabelForPrim.geometry.dispose();
    startingNodeLabelForPrim.material.dispose();
    startingNodeLabelForPrim = null;
  }
  if (startingNodeRingForPrim) {
    scene.remove(startingNodeRingForPrim);
    startingNodeRingForPrim.geometry.dispose();
    startingNodeRingForPrim.material.dispose();
    startingNodeRingForPrim = null;
  }

  hoverRing.visible = false;
  usedColors.clear();
  componentColors = {};

  // Reset score and UI
  currentScore = 0;
  updateScore(0);
  resetStars();
}

function createHoverElements() {
  const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  sphereInter = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereInter.visible = false;
  scene.add(sphereInter);

  hoverRing = createRing(0.8, 0.9, labelDepth, 0x000000);
  hoverRing.visible = false;
  scene.add(hoverRing);
}

function setUpGameModel(currentLevel) {
  console.log(levelConfig);
  console.log(currentLevel);
  if (!levelConfig[currentLevel]) {
    console.error(
      `Invalid level: ${currentLevel}. Level does not exist in levelConfig.`
    );
    return; // Exit the function if the level is invalid
  }
  const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
  curNodes = Array.from({ length: numNodes }, (_, i) => i);
  curEdges = numEdges;

  graph = createRandomConnectedGraph(curNodes, curEdges);
  if (currentLevel <= 3) {
    curAlgorithmForGraph = new KruskalAlgorithm(graph);
    currentAlgorithm = "kruskal";
  } else {
    if (currentLevel == 4) {
      showPrimInstructions();
    }
    curAlgorithmForGraph = new PrimAlgorithm(graph);
    currentAlgorithm = "prim";
  }

  // updateComponentColors(curAlgorithmForGraph.uf, curNodes, componentColors);
  createModels();
  createHoverElements();
}

function resetLevel(curlvl) {
  uiText.innerHTML = `Please click on the Edge to Create Minimum Spanning Tree`;
  health = resetHealth();
  document.querySelector(".Hint-Text").classList.add("hidden");
  closeModal();
  closePseudocode();
  resetScene();
  setUpGameModel(curlvl);
  updateNodeLabel(levelTitle, `Level ${curlvl}`, 0.9, 0.3, 0x212529);
}

buttonNextLevel.addEventListener("click", () => {
  uiText.innerHTML = `Please click on the Edge to Create Minimum Spanning Tree`;
  health = resetHealth();
  currentLevel++;
  closeModal();
  closePseudocode();
  resetScene();
  setUpGameModel(currentLevel);
  if (currentAlgorithm === "prim") {
    updateNodeLabel(chapterTitle, "Prim's Algorithm", 1, 0.3, 0x212529);
    chapterTitle.position.set(9.5, 6.5, -30);
  }
  if (currentLevel > 3) {
    updateNodeLabel(
      levelTitle,
      `Level ${currentLevel - 3}`,
      0.9,
      0.3,
      0x212529
    );
  } else {
    updateNodeLabel(levelTitle, `Level ${currentLevel}`, 0.9, 0.3, 0x212529);
  }
});

buttonAgain.addEventListener("click", () => {
  resetLevel(currentLevel);
});

btnSettingsRestart.addEventListener("click", () => {
  closeSettingModal();
  resetLevel(currentLevel);
});
