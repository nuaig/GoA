import * as THREE from "three"; // the three js library
import { loadStaticObject } from "./utils/modelLoader.js"; // the basic model loader used to import 3d models
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";
import {
  generateRandomArray,
  createTextMesh,
  createTextMesh1,
  createCube,
  updateText,
} from "./utils/HeapSort-Related/arrayHelper.js"; // import helper functions
import {
  createDebossedAreas,
  updateNextSwapIndices,
  arraySorted,
  checkMaxHeapProperties,
  findClosestDebossedIndex,
} from "./utils/HeapSort-Related/HeapSort.js";
import { createThreePointLighting } from "./utils/threePointLighting.js";
import {
  toggleInstructions,
  closePseudocode,
  updateHealth,
  resetHealth,
  setStars,
  resetStars,
  updateHintIcons,
  updateLabelRotations,
  removeFromScene,
} from "./utils/UI/ui.js";
import { GameStatusService } from "./utils/gameStatus/gameStatusService.js";
import {
  effectForHoverSelect,
  removingEffectForHoverSelect,
  effectForCorrectSelect,
  shakeForWrongSelect,
  shakeScreen,
} from "./utils/UI/animations.js";

import { loadModel } from "./utils/threeModels.js";
import gsap from "gsap";
//create an export function with your scene name that takes a scene object and renderer as a constructor

//basic scene management
let mixers;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const dungeonRoomURL = new URL(
  "./src/dungeonroom_heapsort.glb",
  import.meta.url
);

async function createDungeonRoom() {
  const position = new THREE.Vector3(0, -4, 36);
  try {
    const { model, mixer, action } = await loadModel(
      dungeonRoomURL.href,
      position,
      scene,
      mixers
    );

    model.scale.set(1.75, 1.75, 1.75);
  } catch (error) {
    console.error("Error loading dungeon room:", error);
  }
}

createDungeonRoom();
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0xa3a3a3);
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0x000); // Sky blue
createThreePointLighting(scene);

const instancedObjects = new THREE.Group();
scene.add(instancedObjects);

const startPosition = { x: 0, y: 2, z: 80 };
const endPosition = { x: 0, y: 2, z: 10 };

// Set the camera to the start position
camera.position.set(startPosition.x, startPosition.y, startPosition.z);

// Animate the camera position with GSAP

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

var cameraOrbit = new OrbitControls(camera, renderer.domElement);
cameraOrbit.target.set(0, 2, 0); // Set the OrbitControls target
cameraOrbit.update(); // Update the OrbitControls to apply the new target
cameraOrbit.enabled = false;

// var controls = new DragControls(
//   instancedObjects.children,
//   camera,
//   renderer.domElement
// );
// console.log("hello");
// console.log(controls);
// console.log(controls.raycaster);
// Initialize DragControls
const controls = new DragControls(
  instancedObjects.children,
  camera,
  renderer.domElement
);

// Initialize game variables
let arrayElements = [];
let correctPositions = new Map();
let currentSwapIndices = null;
let lastUnsortedIndex = arrayElements.length;
let currentStep = 0;
let currentMode;
let choosingModeNotCurrent = null; // Initialize variable

// Step 1 : Building Binary Heap Tree
let currentIndexForBuildingBinaryHeap = 0;

// Step 2 : Heapifying starting from non-leaf Index
let currentNonLeafIndexToHeapify;
let affectedSubTree = false;

let score = 0;
let hasSortingStarted = false;
let correctlyPlacedTreeNodes = 0;
let stepText;
let levelModalOpen = true;
let indexTexts = [];
let valueTexts = [];
let treeNodeTexts = [];
let DebossedAreaTexts = [];
let trackedObjects = [];

let health = 4;

const levels = [2, 3, 3];
let currentLevel = 1;
let curlvlNodesNum = levels[currentLevel - 1];

let isModalOpen = false;

const levelDescriptions = [
  "Build the original binary heap from the array",
  "MaxHeapify - Building the first maxHeap",
  "Sorting - Swap and reheapify",
  "Awesome! You just completed the heap sort game!",
];

const stepInstructions = [
  "Drag the numbers into the green boxes to create binary heap tree!",
  "For this step, find the highest index non-leaf node that is smaller than its children and swap it with the largest child to maintain heap property. Then proceed to lower index",
  "For this step, repeatedly remove the largest node (the root of the heap) and place it at the end of the array, then reheapify.",
];
// Function to update the score
function updateScore(newScore) {
  // Iterate over each element and update its text content
  scoreElements.forEach((element) => {
    element.textContent = newScore.toString().padStart(2, "0"); // Ensures a two-digit format (e.g., '00')
  });
}

// Function to hide stars
function hideStars() {
  const svgStars = document.querySelectorAll(
    ".level__stars__holder svg.feather-star"
  );
  svgStars.forEach((star) => {
    star.style.visibility = "hidden"; // Hide stars
  });
}

// Function to show stars
function showStars() {
  const svgStars = document.querySelectorAll(
    ".level__stars__holder svg.feather-star"
  );
  svgStars.forEach((star) => {
    star.style.visibility = "visible"; // Show stars
  });
}

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

// Event listeners for mode buttons
document.getElementById("training-mode-btn").addEventListener("click", () => {
  toggleMode("training");
});

document.getElementById("regular-mode-btn").addEventListener("click", () => {
  toggleMode("regular");
});

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
    const heapSortLevels = gameStatus.games["Heapsort"]?.[mode];
    if (!heapSortLevels) {
      console.error(`No levels found for mode: ${mode}`);
      return;
    }

    console.log(`Initializing levels for mode: ${mode}`, heapSortLevels);

    heapSortLevels.forEach((gameData, index) => {
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
      highestCompletedLevel < heapSortLevels.length
    ) {
      unlockLevelUI(highestCompletedLevel + 1);
    }
  } catch (error) {
    console.error("Error initializing level status:", error);
  }
}

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

      resetLevel(currentLevel); // Reset the scene for the chosen level

      // Show or hide the health bar based on the chosen mode
      if (currentMode === "regular") {
        toggleHeader(true); // Show health bar for regular mode
      } else {
        toggleHeader(false); // Hide health bar for training mode
      }
      gsap.to(camera.position, {
        x: endPosition.x,
        y: endPosition.y,
        z: endPosition.z,
        duration: 4, // Duration of the animation in seconds
        ease: "power2.inOut", // Easing function for smooth movement
        onUpdate: () => {
          // Ensure the camera keeps looking at the target point
          camera.lookAt(new THREE.Vector3(0, 2, 0));
        },
      });
      // initailCameraAnimationGSAP(); // Trigger the camera animation
    }
  });
});

buttonStart.addEventListener("click", () => {
  if (!levelModalOpen) {
    overlay.classList.add("hidden");
  }
  instructionModal.classList.add("hidden");
  levelModalOpen = false;
});

pseudoBoxButton.addEventListener("click", () => {
  console.log("clicked");
  toggleInstructions("heapsort");
});

helpInstructionButton.addEventListener("click", () => {
  instructionModal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  document.querySelector(".btn__instruction__start").textContent =
    "Close Instruction";
});

const openModal = function () {
  modalCompletion.classList.remove("hidden");
  overlay.classList.remove("hidden");
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

const closeModal = function () {
  modalCompletion.classList.add("hidden");
  overlay.classList.add("hidden");
  // enableEventListeners();
};

function openCompleteModal(currentScore, health, finalScoreHolder) {
  currentScore = Math.floor(currentScore * ((health + 1) * 0.1 + 1));

  finalScoreHolder.innerHTML = `${currentScore}`;
  setStars(health);
  openModal();
  return currentScore;
}

settingsTogglerEle.addEventListener("click", () => {
  settingsModal.classList.toggle("hidden");
  overlay.classList.toggle("hidden");
  isModalOpen = !isModalOpen;
  // disableEventListeners();
});

settingsCloseButton.addEventListener("click", () => {
  settingsModal.classList.toggle("hidden");
  overlay.classList.toggle("hidden");
  isModalOpen = false;
  // enableEventListeners();
});

function closeLevelModal() {
  levelsModal.classList.add("hidden");
  overlay.classList.add("hidden");
  isModalOpen = false;
}
function openLevelModal() {
  levelsModal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  isModalOpen = true;
  // disableEventListeners();
}

function closeSettingModal() {
  settingsModal.classList.add("hidden");
  overlay.classList.add("hidden");
  isModalOpen = false;
  // enableEventListeners();
}

btnSettingsDiffLvl.addEventListener("click", async (e) => {
  e.preventDefault();

  // Close the settings modal first
  await closeSettingModal();

  // Open the levels modal after the settings modal is fully closed
  btnLevelClose.classList.remove("hidden");
  openLevelModal();
  // disableEventListeners();
});

btnLevelClose.addEventListener("click", (e) => {
  e.preventDefault();
  closeLevelModal();
});

btnSettingsGoMainDungeon.forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = "mainDungeon.html";
  });
});

document.addEventListener("DOMContentLoaded", generateArray);

let messageTimeoutID = null;

stepText = await createTextMesh1(
  `Step ${currentStep + 1}: ${levelDescriptions[currentStep]}`,
  0.2,
  "#000"
);
stepText.position.set(0, 6, 0.1);
scene.add(stepText);

function displayMessage(
  message,
  messageHolder,
  isTemporary = false,
  duration = 2000
) {
  // Clear the previous timeout if it exists
  if (messageTimeoutID) {
    clearTimeout(messageTimeoutID);
    messageTimeoutID = null;
  }

  // Display the message
  messageHolder.textContent = message;

  // If the message is temporary, set a timeout to revert it back
  if (isTemporary) {
    const originalText = stepInstructions[currentStep];
    messageTimeoutID = setTimeout(() => {
      messageHolder.textContent = originalText;
      // Reset the timeout ID
      messageTimeoutID = null;
    }, duration);
  }
}

async function generateArray() {
  console.log("generateArray function called");

  const randomArray = generateRandomArray(curlvlNodesNum, 1, 99);
  // const randomArray = [73, 88, 78, 86];
  // const randomArray = [3, 2, 1];
  for (let i = 0; i < randomArray.length; i++) {
    await addArrayAndTreeNodeElement(
      randomArray[i],
      i,
      i - Math.floor(curlvlNodesNum / 2)
    );
  }
  lastUnsortedIndex = arrayElements.length;

  createDebossedAreas(
    curlvlNodesNum,
    correctPositions,
    scene,
    DebossedAreaTexts,
    trackedObjects
  );
  checkLevelCompletionAndUpdate();
}

function createTransparentPlane(mesh, sizeMultiplier = 2) {
  const meshBox = new THREE.Box3().setFromObject(mesh);
  const meshSize = meshBox.getSize(new THREE.Vector3());

  // Create a plane geometry larger than the mesh
  const planeGeometry = new THREE.PlaneGeometry(
    meshSize.x * sizeMultiplier,
    meshSize.y * sizeMultiplier
  );
  const planeMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0, // Make the plane invisible
    depthTest: false, // Ensure the plane doesn't interfere with other clickable items
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);

  // Position the plane in front of the mesh
  plane.position.copy(mesh.position);
  plane.position.z -= 0.3; // Slightly in front of the mesh for easy interaction

  // Rotate the plane to face the camera if necessary (optional, depends on your camera setup)
  plane.lookAt(camera.position);

  return plane;
}

async function addArrayAndTreeNodeElement(value, index, positionIndex) {
  console.log(`Creating elements for value: ${value}, index: ${index}`);
  const width = 0.65;
  const height = 0.5;
  const depth = 0.12;
  // const color = 0xd55920; // Color for stationary mesh
  const color = "#15aabf"; // Color for stationary mesh

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshBasicMaterial({ color: color });

  // Create stationary mesh
  const stationaryMesh = new THREE.Mesh(geometry, material);
  stationaryMesh.position.set(positionIndex * (width + 0.15), 5, 0.1);

  // Create text mesh for the value and position
  const valueTextMesh = await createTextMesh(value.toString(), 0.18, "#ffffff");
  valueTextMesh.geometry.center();
  valueTextMesh.position.set(positionIndex * (width + 0.15), 5, 0.3);
  valueTextMesh.userData.index = index;

  // Create text mesh for the index and position idx above the cube
  const indexTextMesh = await createTextMesh(`[${index}]`, 0.12, "#ffff00");
  indexTextMesh.geometry.center();
  indexTextMesh.position.set(positionIndex * (width + 0.15), 5.5, 0.1);
  indexTextMesh.userData.index = index;

  indexTexts.push(indexTextMesh);
  valueTexts.push(valueTextMesh);

  // Create a group to hold the cube and its texts
  const stationaryGroup = new THREE.Group();
  stationaryGroup.add(stationaryMesh);
  stationaryGroup.add(valueTextMesh);
  stationaryGroup.add(indexTextMesh);
  stationaryGroup.userData.index = index;

  // Create draggable text for the tree node
  const treeNodeTextMesh = await createTextMesh(
    value.toString(),
    0.18,
    "#060e37"
  );
  treeNodeTextMesh.geometry.center();
  treeNodeTextMesh.position.set(positionIndex * (width + 0.15), 5, 0.3);
  treeNodeTextMesh.userData.index = index;
  instancedObjects.add(treeNodeTextMesh);
  const interactionPlane = createTransparentPlane(stationaryMesh, 0.9); // 2 times the size for easier interaction
  interactionPlane.userData.linkedMesh = treeNodeTextMesh;
  treeNodeTextMesh.userData.linkedPlane = interactionPlane;
  instancedObjects.add(interactionPlane);

  scene.add(stationaryGroup);

  // Store with the associated value and index
  arrayElements.push({
    value: value,
    stationaryGroup: stationaryGroup,
    treeNodeTextMesh: treeNodeTextMesh,
    valueTextMesh: valueTextMesh,
    index: index,
  });

  console.log(`Element with value: ${value} added to the scene`);
}

function advanceStep() {
  if (currentStep < levelDescriptions.length - 1) {
    correctlyPlacedTreeNodes = 0; // Reset the counter
    currentStep += 1;

    updateText(
      `Step ${currentStep + 1}: ${levelDescriptions[currentStep]}`,
      stepText,
      0.2,
      0.05,
      "#000"
    );
    displayMessage(
      "Congratulations! Level completed. Moving to the next step...",
      uiText
    );
    setTimeout(() => {
      if (currentStep == 1) {
        makeTextMeshesVisible();
        displayMessage(stepInstructions[currentStep], uiText);
      } else if (currentStep == 2) {
        displayMessage(stepInstructions[currentStep], uiText);
      }
    }, 1000);

    console.log(currentStep);
  } else {
    displayMessage(
      "Congratulations! You've completed the heap sort game!",
      uiText
    );
  }
}

function checkLevelCompletionAndUpdate() {
  let isLevelComplete = false;

  switch (currentStep) {
    case 0:
      // Check if the count of correctly placed nodes matches the total nodes
      isLevelComplete = correctlyPlacedTreeNodes === arrayElements.length;
      if (isLevelComplete) {
        currentSwapIndices = updateNextSwapIndices(
          lastUnsortedIndex,
          arrayElements
        );
        if (currentSwapIndices === null) {
          advanceStep();
        } else {
          currentNonLeafIndexToHeapify = currentSwapIndices[0];
        }
      }
      break;
    case 1:
      isLevelComplete =
        checkMaxHeapProperties(arrayElements) && !hasSortingStarted;
      break;
    case 2:
      isLevelComplete = arraySorted(arrayElements);
      if (isLevelComplete) {
        score = openCompleteModal(score, health, finalScoreText);
        const status_update_string =
          currentLevel != 3 ? "completed" : "completed_first_time";
        let totalStars;
        if (currentMode == "regular") {
          totalStars = setStars(health);
        } else {
          totalStars = setStars(4);
        }
        updateLevelStatus(currentLevel, totalStars);
        gameStatusService.updateGameStatus(
          "Heapsort",
          currentLevel,
          currentMode,
          score,
          totalStars + 1,
          status_update_string
        );
      }

      break;
  }

  if (isLevelComplete) {
    advanceStep();
  }
}

function evaluateActionAndUpdateScore(isCorrect, nodeIndex) {
  let message;

  message = `Correct! Node ${nodeIndex} is correctly swapped.`;
  if (isCorrect) displayMessage(message, uiText);
  score += isCorrect ? 10 : 0;

  // Increment correctly placed tree nodes if placement is correct
  if (isCorrect && currentStep === 0) {
    correctlyPlacedTreeNodes++;
  }
  if (!isCorrect) {
    health = updateHealth(health);
    shakeScreen();
  }

  scoreText.innerHTML = `${score}`;
  checkLevelCompletionAndUpdate(); // Check if the level is completed
}

// Adjust the drag event handlers to manage the draggable text meshes
controls.addEventListener("dragstart", function (event) {
  cameraOrbit.enabled = false;
  // let draggableTextMesh = event.object;
  let draggableTextMesh = event.object.userData.linkedMesh || event.object;
  draggableTextMesh.userData.initialPosition =
    draggableTextMesh.position.clone();
  effectForHoverSelect();
});

controls.addEventListener("drag", function (event) {
  let draggableTextMesh = event.object.userData.linkedMesh || event.object;
  if (event.object.userData.linkedMesh) {
    // Ensure the linked mesh follows the plane during the drag
    draggableTextMesh.position.copy(event.object.position);
    draggableTextMesh.position.z = draggableTextMesh.userData.initialPosition.z; // Maintain the initial z position if needed
  }
});

controls.addEventListener("dragend", function (event) {
  removingEffectForHoverSelect();
  // cameraOrbit.enabled = true;
  let draggableTextMesh = event.object.userData.linkedMesh || event.object;
  let draggableIndex = draggableTextMesh.userData.index;
  let initialPositionDragged = draggableTextMesh.userData.initialPosition;

  let closestDebossedIndex = findClosestDebossedIndex(
    draggableTextMesh.position,
    draggableIndex,
    correctPositions,
    currentStep
  );

  if (event.object.userData.linkedMesh) {
    draggableTextMesh.position.copy(event.object.position);
    draggableTextMesh.position.z = initialPositionDragged.z; // Reset z to initial if needed
  }

  const isValidDrag =
    typeof draggableIndex !== "undefined" && closestDebossedIndex !== null;

  if (isValidDrag) {
    // Level 1 specific logic for exact placements
    if (currentStep === 0) {
      handleStepOnePlacement(
        draggableIndex,
        closestDebossedIndex,
        draggableTextMesh,
        initialPositionDragged
      );
    } else {
      // For levels 2 and 3, handle the swap logic and snap back if not correct
      handleStepTwoAndThreePlacement(
        draggableIndex,
        closestDebossedIndex,
        initialPositionDragged,
        draggableTextMesh
      );
    }
  } else {
    draggableTextMesh.position.copy(initialPositionDragged);
    if (event.object.userData.linkedMesh) {
      // Also reset the plane's position if the draggable object is a plane
      event.object.position.copy(initialPositionDragged);
    }
    displayMessage(
      "Please make sure to drag the element close to the index box",
      uiText
    );
  }
});

function handleStepOnePlacement(
  draggableIndex,
  closestDebossedIndex,
  draggableTextMesh,
  initialPositionDragged
) {
  const correctPositionFortheDraggedElement =
    draggableIndex === closestDebossedIndex;
  const correctTurnFortheDraggedElement =
    draggableIndex === currentIndexForBuildingBinaryHeap;

  const placeAlreadyTaken =
    closestDebossedIndex < draggableIndex &&
    draggableIndex == currentIndexForBuildingBinaryHeap;
  const isCorrectPlacement =
    correctPositionFortheDraggedElement && correctTurnFortheDraggedElement;
  const hintForWrongChoice =
    "Wrong Move! Iterate through the array and add each element from left to right at each level, starting from the top and moving down to correctly build the heap!";

  if (isCorrectPlacement) {
    currentIndexForBuildingBinaryHeap += 1;
    const snapPosition = correctPositions.get(closestDebossedIndex);
    draggableTextMesh.position.set(
      snapPosition.x,
      snapPosition.y,
      snapPosition.z + 0.1
    );
    draggableTextMesh.userData.linkedPlane.position.set(
      snapPosition.x,
      snapPosition.y,
      snapPosition.z + 0.2
    );
    highlightMeshTemporarily(draggableTextMesh, "#00ff00", 3000);
  } else {
    draggableTextMesh.position.copy(initialPositionDragged);
    draggableTextMesh.userData.linkedPlane.position.copy(
      initialPositionDragged
    );
    highlightMeshTemporarily(draggableTextMesh, "#f03e3e", 3000);
  }

  evaluateActionAndUpdateScore(isCorrectPlacement, draggableIndex);

  // Show Hints for Wrong Moves
  if (!isCorrectPlacement) {
    if (
      correctPositionFortheDraggedElement ||
      !correctTurnFortheDraggedElement
    ) {
      // displayMessage(
      //   `Wrong Move! You need to correctly place the number at index ${currentIndexForBuildingBinaryHeap} first before you can place this number!`,
      //   uiInstructions
      // );
      displayMessage(
        `Wrong Move! Please check if there are any remaining nodes to the left of this node.`,
        uiText
      );
    } else if (placeAlreadyTaken) {
      displayMessage(
        `Wrong Move! The place is already occupied by another node. Please select next available spot!`,
        uiText
      );
    } else {
      displayMessage(hintForWrongChoice, uiText);
    }
  }
}

function handleStepTwoAndThreePlacement(
  draggableIndex,
  closestDebossedIndex,
  initialPositionDragged,
  draggableTextMesh
) {
  const swapSuccess = checkAndHandleSwap(
    draggableIndex,
    closestDebossedIndex,
    initialPositionDragged
  );

  if (!swapSuccess) {
    draggableTextMesh.position.copy(initialPositionDragged);
    draggableTextMesh.userData.linkedPlane.position.copy(
      initialPositionDragged
    );
  }
  evaluateActionAndUpdateScore(swapSuccess, draggableIndex);
}

function checkAndHandleSwap(draggableIndex, targetIndex, initialPosition) {
  const element1 = arrayElements[draggableIndex].treeNodeTextMesh;
  const element2 = arrayElements[targetIndex].treeNodeTextMesh;
  let isCorrect = false;
  console.log(currentSwapIndices);
  // Allow swap in both directions
  let indicesAreCorrect =
    currentSwapIndices &&
    ((currentSwapIndices.includes(draggableIndex) &&
      currentSwapIndices.includes(targetIndex)) ||
      (currentSwapIndices.includes(targetIndex) &&
        currentSwapIndices.includes(draggableIndex)));

  if (currentStep === 1) {
    isCorrect = indicesAreCorrect;
    if (isCorrect) {
      performSwap(draggableIndex, targetIndex, initialPosition);
      currentSwapIndices = updateNextSwapIndices(
        lastUnsortedIndex,
        arrayElements
      );
      // only update currentNonLeafIndex when we move on to next non-leaf
      // do not update if we are still swapping down the tree within currentNonLeafIndex
      if (currentSwapIndices) {
        currentNonLeafIndexToHeapify =
          currentSwapIndices[0] < currentNonLeafIndexToHeapify
            ? currentSwapIndices[0]
            : currentNonLeafIndexToHeapify;
        affectedSubTree =
          currentSwapIndices[0] > currentNonLeafIndexToHeapify ? true : false;
      }
      highlightMeshTemporarily(element1, "#00ff00", 3000);
      highlightMeshTemporarily(element2, "#00ff00", 3000);
    } else {
      console.log("wrong move, going into showhints function");
      showHintsForStepTwoHeapify(draggableIndex, targetIndex);
      highlightMeshTemporarily(element1, "#f03e3e", 3000);
      highlightMeshTemporarily(element2, "#f03e3e", 3000);
    }
  } else if (currentStep === 2) {
    if (currentSwapIndices === null) {
      if (
        (draggableIndex === 0 && targetIndex === lastUnsortedIndex - 1) ||
        (draggableIndex === lastUnsortedIndex - 1 && targetIndex === 0)
      ) {
        performSwap(draggableIndex, targetIndex, initialPosition);
        // Highlight Sorted Nodes as final after swapping
        const sortedTreeNodeMesh =
          draggableIndex === 0
            ? arrayElements[targetIndex].treeNodeTextMesh
            : arrayElements[draggableIndex].treeNodeTextMesh;
        const valueTextOfSortedNode =
          draggableIndex === 0
            ? arrayElements[targetIndex].valueTextMesh
            : arrayElements[draggableIndex].valueTextMesh;

        highlightMesh(valueTextOfSortedNode, "#00ff00");
        highlightMesh(sortedTreeNodeMesh, "#00ff00");

        lastUnsortedIndex--;
        isCorrect = true;
        if (lastUnsortedIndex > 0) {
          currentSwapIndices = updateNextSwapIndices(
            lastUnsortedIndex,
            arrayElements
          );
        }
      } else {
        // displayMessage(
        //   "Wrong Move! Please remove the largest element (the root of the heap) and place it at the end of the unsorted array",
        //   uiInstructions
        // );
        showHintsForStepThreeSwappingWithLastIndex(draggableIndex, targetIndex);
        highlightMeshTemporarily(element1, "#f03e3e", 3000);
        highlightMeshTemporarily(element2, "#f03e3e", 3000);
      }
    } else if (indicesAreCorrect) {
      performSwap(draggableIndex, targetIndex, initialPosition);
      isCorrect = true;
      currentSwapIndices = updateNextSwapIndices(
        lastUnsortedIndex,
        arrayElements
      );
      highlightMeshTemporarily(element1, "#00ff00", 3000);
      highlightMeshTemporarily(element2, "#00ff00", 3000);
    } else {
      showHintsForStepThreeHeapSort(draggableIndex, targetIndex);
      highlightMeshTemporarily(element1, "#f03e3e", 3000);
      highlightMeshTemporarily(element2, "#f03e3e", 3000);
    }
  }

  return isCorrect;
}

function findParentAndItsChildren(draggableIndex, targetIndex) {
  const parentIndexAmongTwo =
    draggableIndex < targetIndex ? draggableIndex : targetIndex;
  const indexSwappingWithParent =
    draggableIndex < targetIndex ? targetIndex : draggableIndex;
  const leftChildIndex = 2 * parentIndexAmongTwo + 1;
  const rightChildIndex = 2 * parentIndexAmongTwo + 2;
  return [
    parentIndexAmongTwo,
    indexSwappingWithParent,
    leftChildIndex,
    rightChildIndex,
  ];
}

function showHintsForStepTwoHeapify(draggableIndex, targetIndex) {
  const [
    parentIndexAmongTwo,
    indexSwappingWithParent,
    leftChildIndex,
    rightChildIndex,
  ] = findParentAndItsChildren(draggableIndex, targetIndex);
  console.log(
    parentIndexAmongTwo,
    indexSwappingWithParent,
    leftChildIndex,
    rightChildIndex,
    currentNonLeafIndexToHeapify
  );

  if (affectedSubTree) {
    if (
      draggableIndex !== currentSwapIndices[0] &&
      targetIndex !== currentSwapIndices[0]
    ) {
      // displayMessage(
      //   `Wrong Move! At this moment, ensure that all elements below the non-leaf node at index ${currentNonLeafIndexToHeapify} maintain the heap property, with each parent node being greater than or equal to its children.`,
      //   uiInstructions
      // );
      displayMessage(
        "Wrong Move! Make sure that the sub-tree affected by the previous swap still satisfies the heap property",
        uiText
      );
    } else if (indexSwappingWithParent === currentSwapIndices[0]) {
      displayMessage(
        "Wrong Move! You cannot swap the child node with its parent",
        uiText
      );
    } else {
      console.log("Going into showhintsforwrongmovebetweenparentsandchild");
      showHintsForWrongMovesBetweenParentsAndChild(
        parentIndexAmongTwo,
        indexSwappingWithParent,
        leftChildIndex,
        rightChildIndex
      );
    }
  } else {
    if (
      draggableIndex !== currentNonLeafIndexToHeapify &&
      targetIndex !== currentNonLeafIndexToHeapify
    ) {
      // displayMessage(
      //   `Wrong Move! At this moment, ensure that all elements below the non-leaf node at index ${currentNonLeafIndexToHeapify} maintain the heap property, with each parent node being greater than or equal to its children.`,
      //   uiInstructions
      // );
      if (parentIndexAmongTwo < currentNonLeafIndexToHeapify) {
        displayMessage(
          `Wrong Move! This is currently not the turn for this node. You should find the lowest leaf that is smaller than its children`,
          uiText
        );
      } else if (parentIndexAmongTwo > currentNonLeafIndexToHeapify) {
        displayMessage(
          `Wrong Move! The sub-tree starting with this node already maintains heap property`,
          uiText
        );
      }
    } else if (indexSwappingWithParent === currentNonLeafIndexToHeapify) {
      displayMessage(
        "Wrong Move! You cannot swap the child node with its parent",
        uiText
      );
    } else {
      console.log("Going into showhintsforwrongmovebetweenparentsandchild");
      showHintsForWrongMovesBetweenParentsAndChild(
        parentIndexAmongTwo,
        indexSwappingWithParent,
        leftChildIndex,
        rightChildIndex
      );
    }
  }
}

function showHintsForStepThreeSwappingWithLastIndex(
  draggableIndex,
  targetIndex
) {
  const [
    parentIndexAmongTwo,
    indexSwappingWithParent,
    leftChildIndex,
    rightChildIndex,
  ] = findParentAndItsChildren(draggableIndex, targetIndex);
  if (parentIndexAmongTwo !== 0) {
    displayMessage(
      "Wrong Move! This is already max heap. Remove the largest node and swap it with the node at the end of unsorted array.",
      uiText
    );
  } else if (indexSwappingWithParent > lastUnsortedIndex - 1) {
    displayMessage(
      "Wrong Move! You don't need to swap the nodes that are already sorted",
      uiText
    );
  } else {
    displayMessage(
      "Wrong Move! This is already max heap. Remove the largest node and swap it with the node at the end of unsorted array.",
      uiText
    );
  }
}

function showHintsForStepThreeHeapSort(draggableIndex, targetIndex) {
  const [
    parentIndexAmongTwo,
    indexSwappingWithParent,
    leftChildIndex,
    rightChildIndex,
  ] = findParentAndItsChildren(draggableIndex, targetIndex);
  console.log(
    parentIndexAmongTwo,
    indexSwappingWithParent,
    leftChildIndex,
    rightChildIndex
  );
  console.log("last unsorted index", lastUnsortedIndex);
  if (indexSwappingWithParent === lastUnsortedIndex - 1) {
    displayMessage(
      "Wrong Move! Make sure that the current tree, except those already sorted, maintains the heap property.",
      uiText
    );
  } else if (indexSwappingWithParent > lastUnsortedIndex - 1) {
    displayMessage(
      "Wrong Move! You don't need to swap the nodes that are already sorted",
      uiText
    );
  } else {
    if (
      draggableIndex !== currentSwapIndices[0] &&
      targetIndex !== currentSwapIndices[0]
    ) {
      // displayMessage(
      //   `Wrong Move! At this moment, ensure that all elements below the non-leaf node at index ${currentNonLeafIndexToHeapify} maintain the heap property, with each parent node being greater than or equal to its children.`,
      //   uiInstructions
      // );
      displayMessage(
        "Wrong Move! Make sure that the sub-tree affected by the previous swap still satisfies the heap property",
        uiText
      );
    } else if (indexSwappingWithParent === currentSwapIndices[0]) {
      displayMessage(
        "Wrong Move! You cannot swap the child node with its parent",
        uiText
      );
    } else {
      console.log("Going into showhintsforwrongmovebetweenparentsandchild");
      showHintsForWrongMovesBetweenParentsAndChild(
        parentIndexAmongTwo,
        indexSwappingWithParent,
        leftChildIndex,
        rightChildIndex
      );
    }
  }
}

function showHintsForWrongMovesBetweenParentsAndChild(
  parentIndexAmongTwo,
  indexSwappingWithParent,
  leftChildIndex,
  rightChildIndex
) {
  console.log(
    parentIndexAmongTwo,
    indexSwappingWithParent,
    leftChildIndex,
    rightChildIndex
  );
  if (
    indexSwappingWithParent !== leftChildIndex &&
    indexSwappingWithParent !== rightChildIndex
  ) {
    displayMessage(
      "You can only swap a node with its children. Swapping with other nodes is not allowed",
      uiText
    );
    return;
  }
  if (
    arrayElements[parentIndexAmongTwo].value >
    arrayElements[indexSwappingWithParent].value
  ) {
    displayMessage(
      "Wrong Move! There's no need to swap if the parent node is larger than the child",
      uiText
    );
    return;
  }

  if (
    arrayElements[parentIndexAmongTwo].value <
    arrayElements[indexSwappingWithParent].value
  ) {
    if (
      arrayElements[leftChildIndex].value ===
      arrayElements[rightChildIndex].value
    ) {
      displayMessage(
        "Wrong Move! Check the left child first. Swap it with the parent if it's larger.",
        uiText
      );
    } else {
      displayMessage(
        "Wrong Move! Please make sure to swap the parent node with the larger child",
        uiText
      );
    }
    return;
  }
}

function performSwap(index1, index2, initialPosition) {
  // Retrieve mesh objects from the updated arrayElements
  let treeNodeMesh1 = arrayElements[index1].treeNodeTextMesh;
  let treeNodeMesh2 = arrayElements[index2].treeNodeTextMesh;
  // Swap positions of the value text meshes
  let valueTextMesh1 = arrayElements[index1].valueTextMesh;
  let valueTextMesh2 = arrayElements[index2].valueTextMesh;

  // Swap array elements
  [arrayElements[index1], arrayElements[index2]] = [
    arrayElements[index2],
    arrayElements[index1],
  ];

  // Update the userData index before swapping positions
  let tempIndex = treeNodeMesh1.userData.index;
  treeNodeMesh1.userData.index = treeNodeMesh2.userData.index;
  treeNodeMesh2.userData.index = tempIndex;

  // Swap positions of the tree node text meshes
  // const tempPosition = treeNodeMesh1.position.clone();
  treeNodeMesh1.position.copy(treeNodeMesh2.position);
  treeNodeMesh1.userData.linkedPlane.position.copy(treeNodeMesh2.position);
  treeNodeMesh2.position.copy(initialPosition);
  treeNodeMesh2.userData.linkedPlane.position.copy(initialPosition);

  const tempValuePosition = valueTextMesh1.position.clone();
  valueTextMesh1.position.copy(valueTextMesh2.position);
  valueTextMesh2.position.copy(tempValuePosition);
}

function highlightMesh(mesh, color) {
  mesh.material.color.set(color);
}

function highlightMeshTemporarily(mesh, highlightColor, duration) {
  // Store the original color of the mesh
  const originalColor = "#060e37";

  // Change the color to the highlight color
  mesh.material.color.set(highlightColor);

  // Set a timeout to revert the color after the specified duration
  setTimeout(() => {
    mesh.material.color.set(originalColor);
  }, duration);
}

function makeTextMeshesVisible() {
  DebossedAreaTexts.forEach((textMesh) => {
    textMesh.visible = true;
  });
}

function resetScene() {
  removeFromScene(
    arrayElements.map((e) => e.stationaryGroup),
    scene
  );
  removeFromScene(
    arrayElements.map((e) => e.treeNodeTextMesh),
    scene
  );
  removeFromScene(
    arrayElements.map((e) => e.valueTextMesh),
    scene
  );
  removeFromScene(indexTexts, scene);
  removeFromScene(valueTexts, scene);
  removeFromScene(treeNodeTexts, scene);
  removeFromScene(DebossedAreaTexts, scene);
  removeFromScene(instancedObjects.children, instancedObjects);
  trackedObjects.forEach((object) => {
    scene.remove(object);
    if (object.geometry) object.geometry.dispose(); // Dispose geometry
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => mat.dispose());
      } else {
        object.material.dispose(); // Dispose material
      }
    }
  });
  trackedObjects = []; // Clear the array after removing all objects
  correctPositions.clear(); // Reset correctPositions
  arrayElements = [];
  indexTexts = [];
  valueTexts = [];
  treeNodeTexts = [];
  DebossedAreaTexts = [];
  currentIndexForBuildingBinaryHeap = 0;

  currentStep = 0;
  correctlyPlacedTreeNodes = 0;
  updateText(
    `Step ${currentStep + 1}: ${levelDescriptions[currentStep]}`,
    stepText,
    0.2,
    0.05,
    "#000"
  );

  score = 0;
  health = resetHealth();
  scoreText.innerHTML = "00";
  resetStars();
}

function resetLevel(curlvl) {
  resetScene();
  closeModal();
  closePseudocode();
  currentLevel = curlvl;
  curlvlNodesNum = levels[currentLevel - 1];
  generateArray();
}

function render() {
  // updateLabelRotations(indexTexts, camera);
  // updateLabelRotations(valueTexts, camera);
  // updateLabelRotations(treeNodeTexts, camera);
  // updateLabelRotations(DebossedAreaTexts, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
render();

buttonAgain.addEventListener("click", () => {
  uiText.innerHTML = stepInstructions[0];
  console.log("clicked");
  closeModal();
  resetScene();
  generateArray();
});

buttonNextLevel.addEventListener("click", () => {
  uiText.innerHTML = stepInstructions[0];
  console.log("clicked");
  closeModal();
  resetScene();
  currentLevel++;
  curlvlNodesNum = levels[currentLevel - 1];
  generateArray();
});

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize, false);
