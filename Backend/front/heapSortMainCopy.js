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
import { createThreePointLightingRoom } from "./utils/threePointLighting.js";
import {
  decrementHealth,
  closePseudocode,
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
import { GameSession } from "./utils/gameRelated/gameSession.js";
import GameRoomUI from "./utils/UI/gameRoomUI.js";
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
createThreePointLightingRoom(scene);

const instancedObjects = new THREE.Group();
scene.add(instancedObjects);

const startPosition = { x: 0, y: 2, z: 80 };
const endPosition = { x: 0, y: 2, z: 10 };

// Set the camera to the start position
camera.position.set(startPosition.x, startPosition.y, startPosition.z);

// Animate the camera position with GSAP

var cameraOrbit = new OrbitControls(camera, renderer.domElement);
cameraOrbit.target.set(0, 2, 0); // Set the OrbitControls target
cameraOrbit.update(); // Update the OrbitControls to apply the new target
cameraOrbit.enabled = false;

const controls = new DragControls(
  instancedObjects.children,
  camera,
  renderer.domElement
);

// Define max score per level
const levelMaxScores = {
  1: 40,
  2: 50,
  3: 60,
};
let correctActionScoreAddition;
let arrayElements = [];
let correctPositions = new Map();
let currentSwapIndices = null;
let lastUnsortedIndex = arrayElements.length;
let currentStep = 0;

// Step 1 : Building Binary Heap Tree
let currentIndexForBuildingBinaryHeap = 0;

// Step 2 : Heapifying starting from non-leaf Index
let currentNonLeafIndexToHeapify;
let affectedSubTree = false;

let hasSortingStarted = false;
let correctlyPlacedTreeNodes = 0;
let stepText;

let indexTexts = [];
let valueTexts = [];
let treeNodeTexts = [];
let DebossedAreaTexts = [];
let trackedObjects = [];

const levels = [6, 8, 9];
// const levels = [2, 2, 2];

const curRoomUI = new GameRoomUI("Heapsort", 1, camera);
let curlvlNodesNum = levels[curRoomUI.currentLevel - 1];
let curGameSession;
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

const tutorialSteps = [
  {
    instruction:
      "Let's start by building a Binary Heap from the given array: [1, 5, 3, 4, 11]. Let's try to click, hold and drag one of the elements in the array to begin the tutorial. ",
    explanation:
      "Step 1 of HeapSort is converting the array into a Binary Heap. A Binary Heap is a complete binary tree where elements are inserted from top to bottom, left to right. We are building a **Max-Heap**, where each parent is **greater than or equal to** its children.",
    expectedAction: null, // No specific action yet
    errorMessage: "Click on the tree area to start the tutorial.",
  },
  {
    instruction: "Drag and insert 1 (index-0) at the root of the heap.",
    explanation:
      "In a binary heap, elements are inserted from top to bottom, left to right. We will fill the index-0 element at the top. Therefore, the first element in the array (1) becomes the root node in the binary heap. One thing to note is that each element from Binary Heap will have maximum 2 elements (left and right children).",
    expectedAction: [1], // Expecting node 1 to be placed at the root
    errorMessage: "Place 1 at the root of the tree.",
  },
  {
    instruction:
      "Drag and Insert 5 (index-1)  as the left child of 1 in Binary Heap.",
    explanation:
      "In a binary heap, elements are inserted from top to bottom, left to right. Since highest layer is already filled, we will go down one layer and start filling it from left to right. Therefore, the next element 5 (index-1) becomes the left child of 1.",
    expectedAction: [5], // Expecting node 5 to be placed as the left child of 1
    errorMessage: "Place 5 as the left child of node 1.",
  },
  {
    instruction:
      "Drag and Insert 3 (index-2) as the right child of 1 in Binary Heap.",
    explanation:
      "Since this second layer isn't filled yet, we will keep filling it from left to right. As a result, the next element 3 (index-2) will be dragged and inserted as the right child of 1 (index-0) to maintain the binary heap structure.",
    expectedAction: [3], // Expecting node 3 to be placed as the right child of 1
    errorMessage: "Place 3 as the right child of node 1.",
  },
  {
    instruction:
      "Drag and Insert 4 (index-3) as the left child of 5 in Binary Heap.",
    explanation:
      "Since second layer is already filled, you will go down to next layer and continue the left-to-right insertion. Therefore, the next element 4 (index-3) is placed as the left child of 5.",
    expectedAction: [4], // Expecting node 4 to be placed as the left child of 5
    errorMessage: "Place 4 as the left child of node 5.",
  },
  {
    instruction:
      "Drag and Insert 11 (index-4) as the right child of 5 in Binary Heap.",
    explanation:
      "Continuing the left-to-right insertion, the last element 11 (index-4) is placed as the right child of 5 to maintain the binary heap structure.",
    expectedAction: [11], // Expecting node 11 to be placed as the right child of 5
    errorMessage: "Place 11 as the right child of node 5.",
  },

  {
    instruction:
      "Now that you have binary heap data structure. Let's start building Max Heap. Swap 5 and 11 to maintain the Max-Heap property.",
    explanation:
      "Step 2 of Heapsort is to build Max Heap which means every element will be larger than its children. You will start at the last parent node (index ⌊n/2 - 1⌋). If that parent node is smaller than its children, we will need to swap it with the largest child. As a result, 5 (index-1) will be swapped with 11 (index-4).",
    expectedAction: [5, 11],
    errorMessage: "",
  },
  {
    instruction:
      "Next step is to decrement the index of last parent node (index-1). The parent node you will be checking becomes index-0. Now, swap 1 (index-0) and 11 (index-1)",
    explanation:
      "If you look at last parent node (index-1) which becomes 11 after previous swap, you will notice that it meets max heap property since it is larger than its children. You will move backwards from that parent index and land on index-0. After checking both of its children, wee will swap 1 (index-0) with 11 (index-1) as 11 is the bigger child.",
    expectedAction: [1, 11], // Expecting node 11 to be placed as the right child of 1
    errorMessage: "",
  },
  {
    instruction:
      "Swap 1 (index-1) and 5 (index-4) to maintain the Max-Heap property. Before you decrement the parent index, always remember to check if the sub-tree still maintains max heap property after swapping.",
    explanation:
      "After each swap, continue checking the newly swapped value with its children and swapping downwards to keep the entire subtree in correct heap order. After swapping 1 to index-1, it still violates the Max-Heap rule as it has a larger child (5 at index-4)",
    expectedAction: [1, 5],
    errorMessage: "",
  },
  {
    instruction:
      "Max-Heap construction is complete! Now, let's proceed with HeapSort. Swap the root (maximum element 11) with the last element 1 (index-4) and remove it.",
    explanation:
      "HeapSort works by repeatedly removing the largest element (root) and swapping it with the last element. This step **places the largest element at the correct sorted position**.",
    expectedAction: [11, 1],
    errorMessage: "",
  },
  {
    instruction:
      "Reheapify the heap after removing the root node. Swap 1 (index-0) and 5 (index-1) to restructure max-heap. ",
    explanation:
      "After removing the root (11), the heap is **restructured**. The new root (1 at index-0) violates the Max-Heap property, so we swap it with 5 (index-1).",
    expectedAction: [1, 5],
    errorMessage: "",
  },
  {
    instruction:
      "Continue checking the newly swapped value with its children and swapping downwards as needed. Swap 1 (index-1) with its left child 4 (index-3).",
    explanation:
      "We check the newly swapped element 1 (index-1) with its children to see if it requires more swapping downwards. Since left child 4 (index-3) is bigger than its parent 1 (index-1), we swap them to maintain max heap property",
    expectedAction: [1, 4],
    errorMessage: "",
  },
  {
    instruction:
      "Now that we have max heap again, swap the root (maximum element 5) with the last element 1 (index-3) and remove it.",
    explanation:
      "After restoring heap order, we remove the largest element (root) and swapping it with the last element. As we remove largest elements one after another, the array will becomed sorted",
    expectedAction: [5, 1],
    errorMessage: "",
  },
  {
    instruction:
      "Re-Heapify the tree. Swap 1 (index-0) with its left child 4 (index-1)",
    explanation:
      "After removing the root node, you must restore the Max-Heap property by performing heapify operations. as a result, the new root 1 (index-0) will be swapped with 4 (index-1) since 4 is the largest child of 1.",
    expectedAction: [1, 4],
    errorMessage: "",
  },
  {
    instruction:
      "Now that we have max heap again, swap the root (maximum element 4) with the last element 3 (index-2) and remove 4.",
    explanation:
      "Once the heap is restructured, we continue **extracting the max element**. Swap 4 with 3.",
    expectedAction: [4, 3],
    errorMessage: "",
  },
  {
    instruction:
      "Since we still have the max Heap after previous swap, let's swap the root (maximum element 3) with the last element 1 (index-1) and remove 3.",
    explanation:
      "After this swap, we will see that all elements will be sorted and heapsort algorithm will be completed.",
    expectedAction: [3, 1],
    errorMessage: "",
  },
];

function updateTutorialStep() {
  document.querySelector(".tuto-instruction-text").innerHTML =
    tutorialSteps[curRoomUI.currentTutorialStep].instruction;
  document.querySelector(".tuto-explanation-text").innerHTML =
    tutorialSteps[curRoomUI.currentTutorialStep].explanation;
}

// Call this function whenever the user makes a correct selection
function nextTutorialStep() {
  if (curRoomUI.currentTutorialStep < tutorialSteps.length - 1) {
    curRoomUI.currentTutorialStep++;
    updateTutorialStep();
  }
}

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
      const gameStatusService = new GameStatusService(userData.id);
      curRoomUI.setGameStatusService(gameStatusService);

      await curRoomUI.gameStatusService.init();
      const userId = curRoomUI.gameStatusService.getUserId();
      curGameSession = new GameSession(
        userId,
        "Heapsort",
        "regular",
        curRoomUI.currentLevel
      );
      curRoomUI.setGameSession(curGameSession);

      // Ensure toggleMode is called only after initialization
      await curRoomUI.toggleMode("regular");
    } else {
      console.warn("User is not logged in. Redirecting to login page.");
      window.location.href = "signInSignUp.html";
    }
  } catch (error) {
    console.error("Error checking login status:", error);
    window.location.href = "signInSignUp.html";
  }
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

// TO DO
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

// ✅ Function to count swaps needed to complete HeapSort
function countTotalSwapsForHeapSort(originalArr) {
  let swaps = 0;
  let arr = [...originalArr]; // ✅ Work on a copy of the array to preserve original
  let heapSize = arr.length;

  // Build Max-Heap and count swaps
  for (let i = Math.floor(heapSize / 2) - 1; i >= 0; i--) {
    swaps += countHeapifySwaps(arr, i, heapSize);
  }

  // Sorting: Extract elements from heap one by one
  for (let i = heapSize - 1; i > 0; i--) {
    swaps++; // ✅ Count the root swap with the last element
    [arr[0], arr[i]] = [arr[i], arr[0]]; // ✅ Perform actual swap in the copy
    swaps += countHeapifySwaps(arr, 0, i); // ✅ Reheapify after swap
  }

  // ✅ Total actions = swaps + inserting each element initially into binary heap
  return swaps + arr.length;
}

// ✅ Helper function to count swaps during heapify
function countHeapifySwaps(arr, index, heapSize) {
  let swaps = 0;
  let largest = index;
  let left = 2 * index + 1;
  let right = 2 * index + 2;

  if (left < heapSize && arr[left] > arr[largest]) {
    largest = left;
  }

  if (right < heapSize && arr[right] > arr[largest]) {
    largest = right;
  }

  if (largest !== index) {
    [arr[index], arr[largest]] = [arr[largest], arr[index]]; // ✅ Swap in copy
    swaps++;
    swaps += countHeapifySwaps(arr, largest, heapSize); // ✅ Recursively count further swaps
  }

  return swaps;
}

// DONE
async function generateArray(optionalArray = null) {
  console.log("generateArray function called");
  console.log(optionalArray);
  const randomArray = Array.isArray(optionalArray)
    ? optionalArray
    : generateRandomArray(curlvlNodesNum, 1, 99);

  console.log(randomArray);
  const totalActions = countTotalSwapsForHeapSort(randomArray);
  correctActionScoreAddition = Math.floor(
    levelMaxScores[curRoomUI.currentLevel] / totalActions
  );
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

// DONE
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

// DONE
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

// DONE
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
      curRoomUI.uiText
    );
    setTimeout(() => {
      if (currentStep == 1) {
        makeTextMeshesVisible();
        displayMessage(stepInstructions[currentStep], curRoomUI.uiText);
      } else if (currentStep == 2) {
        displayMessage(stepInstructions[currentStep], curRoomUI.uiText);
      }
    }, 1000);

    console.log(currentStep);
  } else {
    displayMessage(
      "Congratulations! You've completed the heap sort game!",
      curRoomUI.uiText
    );
  }
}

// DONE
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
        if (curRoomUI.isTutorial) {
          curRoomUI.updateTutorialModalToBeTutorialCompleteModal();
          curRoomUI.currentLevel = null;
          curRoomUI.isTutorial = false;
          return;
        }
        curRoomUI.currentScore = Math.floor(
          levelMaxScores[curRoomUI.currentLevel] *
            ((curRoomUI.health + 1) * 0.1 + 1)
        );
        // score = openCompleteModal(score, health, finalScoreText);
        curRoomUI.fillInfoSuccessCompletionModal();

        curGameSession.setFinalScore(curRoomUI.currentScore);
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

        const status_update_string =
          curRoomUI.currentLevel != 3 ? "completed" : "completed_first_time";

        curRoomUI.updateLevelStatus(
          curRoomUI.currentLevel,
          curRoomUI.totalStars
        );
        curRoomUI.gameStatusService.updateGameStatus(
          "Heapsort",
          curRoomUI.currentLevel,
          curRoomUI.currentMode,
          curRoomUI.currentScore,
          curRoomUI.totalStars + 1,
          status_update_string
        );
        curRoomUI.gameStatusService.unlockGameLevel(
          "Heapsort",
          curRoomUI.currentLevel + 1,
          curRoomUI.currentMode
        );
        curRoomUI.openCompletionModal();
      }

      break;
  }

  if (isLevelComplete) {
    advanceStep();
  }
}

// DONE
function evaluateActionAndUpdateScore(isCorrect, nodeIndex) {
  let message;

  message = `Correct! Node ${nodeIndex} is correctly swapped.`;
  if (isCorrect) displayMessage(message, curRoomUI.uiText);
  curRoomUI.currentScore += isCorrect ? correctActionScoreAddition : 0;

  // Increment correctly placed tree nodes if placement is correct
  if (isCorrect && currentStep === 0) {
    correctlyPlacedTreeNodes++;
  }
  if (!isCorrect) {
    curGameSession.incrementMistakes();
    curRoomUI.health = decrementHealth(curRoomUI.health);
    shakeScreen();
    if (
      curRoomUI.health < 0 &&
      curRoomUI.currentMode == "regular" &&
      !curRoomUI.isTutorial
    ) {
      curRoomUI.fillInfoFailureSuccessCompletionModal();
      curGameSession.setFinalScore(curRoomUI.currentScore);
      curGameSession.setSuccessStatus(false);
      curGameSession.endSession();

      const sessionData = curGameSession.toObject();
      console.log("printing session Data");
      console.log(sessionData);
      fetch("/api/gamesessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionData),
      }).then((res) => res.json());
      curRoomUI.openCompletionModal();
    }
  }
  if (isCorrect) {
    if (curRoomUI.isTutorial) {
      nextTutorialStep();
    }
  }
  curRoomUI.updateScore(curRoomUI.currentScore);
  checkLevelCompletionAndUpdate(); // Check if the level is completed
}

// DONE
// Adjust the drag event handlers to manage the draggable text meshes
controls.addEventListener("dragstart", function (event) {
  cameraOrbit.enabled = false;
  // let draggableTextMesh = event.object;
  let draggableTextMesh = event.object.userData.linkedMesh || event.object;
  draggableTextMesh.userData.initialPosition =
    draggableTextMesh.position.clone();
  effectForHoverSelect();
});

//DONE
controls.addEventListener("drag", function (event) {
  let draggableTextMesh = event.object.userData.linkedMesh || event.object;
  if (event.object.userData.linkedMesh) {
    // Ensure the linked mesh follows the plane during the drag
    draggableTextMesh.position.copy(event.object.position);
    draggableTextMesh.position.z = draggableTextMesh.userData.initialPosition.z; // Maintain the initial z position if needed
  }
});

// DONE
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

  if (curRoomUI.isTutorial) {
    const currentStep = tutorialSteps[curRoomUI.currentTutorialStep];
    if (currentStep.expectedAction === null) {
      draggableTextMesh.position.copy(initialPositionDragged);
      if (event.object.userData.linkedMesh) {
        // Also reset the plane's position if the draggable object is a plane
        event.object.position.copy(initialPositionDragged);
      }
      nextTutorialStep();
      return;
    }
  }

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
      curRoomUI.uiText
    );
  }
});

// DONE
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
        curRoomUI.uiText
      );
    } else if (placeAlreadyTaken) {
      displayMessage(
        `Wrong Move! The place is already occupied by another node. Please select next available spot!`,
        curRoomUI.uiText
      );
    } else {
      displayMessage(hintForWrongChoice, curRoomUI.uiText);
    }
  }
}

// DONE
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

// DONE
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

// DONE
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

// DONE
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
        curRoomUI.uiText
      );
    } else if (indexSwappingWithParent === currentSwapIndices[0]) {
      displayMessage(
        "Wrong Move! You cannot swap the child node with its parent",
        curRoomUI.uiText
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
          curRoomUI.uiText
        );
      } else if (parentIndexAmongTwo > currentNonLeafIndexToHeapify) {
        displayMessage(
          `Wrong Move! The sub-tree starting with this node already maintains heap property`,
          curRoomUI.uiText
        );
      }
    } else if (indexSwappingWithParent === currentNonLeafIndexToHeapify) {
      displayMessage(
        "Wrong Move! You cannot swap the child node with its parent",
        curRoomUI.uiText
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

// DONE
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
      curRoomUI.uiText
    );
  } else if (indexSwappingWithParent > lastUnsortedIndex - 1) {
    displayMessage(
      "Wrong Move! You don't need to swap the nodes that are already sorted",
      curRoomUI.uiText
    );
  } else {
    displayMessage(
      "Wrong Move! This is already max heap. Remove the largest node and swap it with the node at the end of unsorted array.",
      curRoomUI.uiText
    );
  }
}

// DONE
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
      curRoomUI.uiText
    );
  } else if (indexSwappingWithParent > lastUnsortedIndex - 1) {
    displayMessage(
      "Wrong Move! You don't need to swap the nodes that are already sorted",
      curRoomUI.uiText
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
        curRoomUI.uiText
      );
    } else if (indexSwappingWithParent === currentSwapIndices[0]) {
      displayMessage(
        "Wrong Move! You cannot swap the child node with its parent",
        curRoomUI.uiText
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
      curRoomUI.uiText
    );
    return;
  }
  if (
    arrayElements[parentIndexAmongTwo].value >
    arrayElements[indexSwappingWithParent].value
  ) {
    displayMessage(
      "Wrong Move! There's no need to swap if the parent node is larger than the child",
      curRoomUI.uiText
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
        curRoomUI.uiText
      );
    } else {
      displayMessage(
        "Wrong Move! Please make sure to swap the parent node with the larger child",
        curRoomUI.uiText
      );
    }
    return;
  }
}

// DONE
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

  curRoomUI.updateScore(0);
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

curRoomUI.callbacks.resetLevel = function (curlvl) {
  curRoomUI.uiText.innerHTML = stepInstructions[0];
  curRoomUI.health = resetHealth();

  curRoomUI.closeCompletionModal();
  curRoomUI.pseudoModalClose();
  resetScene();
  curlvlNodesNum = levels[curlvl - 1];
  generateArray();
  curGameSession.resetGameSession(
    curRoomUI.gameName,
    curRoomUI.currentLevel,
    curRoomUI.currentMode
  );
};

curRoomUI.callbacks.startTutorial = function () {
  curRoomUI.currentTutorialStep = 0;
  updateTutorialStep();
  curRoomUI.uiText.innerHTML = stepInstructions[0];
  curRoomUI.health = resetHealth();
  curRoomUI.closeCompletionModal();
  curRoomUI.pseudoModalClose();
  resetScene();
  curlvlNodesNum = 5;
  generateArray([1, 5, 3, 4, 11]);
};

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize, false);
