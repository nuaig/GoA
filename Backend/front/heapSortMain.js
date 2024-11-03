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

const uiInstructions = document.getElementById("UI-Text");
const scoreText = document.querySelector(".score-label-2");

const modal = document.querySelector(".modal");
const instructionModal = document.querySelector(".instruction");
const overlay = document.querySelector(".overlay");
const pseudoBoxButton = document.querySelector(".Pesudocode-Box-Action");
const finalScoreText = document.querySelector(".label__final_score span");

const buttonStart = document.querySelector(".btn__instruction__start");
const buttonNext = document.querySelector(".btn__next");
const buttonAgain = document.querySelector(".btn__again");

buttonStart.addEventListener("click", () => {
  overlay.classList.add("hidden");
  instructionModal.classList.add("hidden");
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
});

pseudoBoxButton.addEventListener("click", () => {
  toggleInstructions();
});

const openModal = function () {
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
};

const closeModal = function () {
  modal.classList.add("hidden");
  overlay.classList.add("hidden");
};

function openCompleteModal(currentScore, health, finalScoreHolder) {
  currentScore = Math.floor(currentScore * ((health + 1) * 0.1 + 1));

  finalScoreHolder.innerHTML = `${currentScore}`;
  setStars(health);
  openModal();
  return currentScore;
}

// const picture = new THREE.Object3D();
// loadStaticObject("./src/painting.glb", picture, scene);
// picture.rotation.y = Math.PI / 2;
// picture.position.set(0, 2, -0.5);
// picture.scale.set(1, 3, 4);

var cameraOrbit = new OrbitControls(camera, renderer.domElement);
cameraOrbit.target.set(0, 2, 0); // Set the OrbitControls target
cameraOrbit.update(); // Update the OrbitControls to apply the new target
cameraOrbit.enabled = false;

var controls = new DragControls(
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

// Step 1 : Building Binary Heap Tree
let currentIndexForBuildingBinaryHeap = 0;

// Step 2 : Heapifying starting from non-leaf Index
let currentNonLeafIndexToHeapify;
let affectedSubTree = false;

let score = 0;
let hasSortingStarted = false;
let correctlyPlacedTreeNodes = 0;
let stepText;

let indexTexts = [];
let valueTexts = [];
let treeNodeTexts = [];
let DebossedAreaTexts = [];

let health = 4;

const levels = [9, 2, 5];
let currentLevel = 0;
let curlvlNodesNum = levels[currentLevel];

const levelDescriptions = [
  "Build the original binary heap from the array",
  "MaxHeapify - Building the first maxHeap",
  "Sorting - Swap and reheapify",
  "Awesome! You just completed the heap sort game!",
];

const stepInstructions = [
  "Drag the numbers into the green boxes to create binary heap tree!",
  "For this step, find the lowest non-leaf node that is smaller than its children and swap it with the largest child to maintain heap property.",
  "For this step, repeatedly remove the largest node (the root of the heap) and place it at the end of the array, then reheapify.",
];

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

  // createBinaryHeapTree(); wrote createDebossedAreas() instead
  createDebossedAreas(
    curlvlNodesNum,
    correctPositions,
    scene,
    DebossedAreaTexts
  );
  checkLevelCompletionAndUpdate();
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

  treeNodeTexts.push(treeNodeTextMesh);

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
      uiInstructions
    );
    setTimeout(() => {
      if (currentStep == 1) {
        makeTextMeshesVisible();
        displayMessage(stepInstructions[currentStep], uiInstructions);
      } else if (currentStep == 2) {
        displayMessage(stepInstructions[currentStep], uiInstructions);
      }
    }, 1000);

    console.log(currentStep);
  } else {
    displayMessage(
      "Congratulations! You've completed the heap sort game!",
      uiInstructions
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
  if (isCorrect) displayMessage(message, uiInstructions);
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
  let draggableTextMesh = event.object;
  draggableTextMesh.userData.initialPosition =
    draggableTextMesh.position.clone();
  effectForHoverSelect();
});

controls.addEventListener("dragend", function (event) {
  removingEffectForHoverSelect();
  // cameraOrbit.enabled = true;
  let draggableTextMesh = event.object; // Direct reference to the dragged text mesh
  let draggableIndex = draggableTextMesh.userData.index;
  let initialPositionDragged = draggableTextMesh.userData.initialPosition;

  let closestDebossedIndex = findClosestDebossedIndex(
    draggableTextMesh.position,
    draggableIndex,
    correctPositions,
    currentStep
  );

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
    displayMessage(
      "Please make sure to drag the element close to the index box",
      uiInstructions
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
    highlightMeshTemporarily(draggableTextMesh, "#00ff00", 3000);
  } else {
    draggableTextMesh.position.copy(initialPositionDragged);
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
        uiInstructions
      );
    } else if (placeAlreadyTaken) {
      displayMessage(
        `Wrong Move! The place is already occupied by another node. Please select next available spot!`,
        uiInstructions
      );
    } else {
      displayMessage(hintForWrongChoice, uiInstructions);
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
        uiInstructions
      );
    } else if (indexSwappingWithParent === currentSwapIndices[0]) {
      displayMessage(
        "Wrong Move! You cannot swap the child node with its parent",
        uiInstructions
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
          uiInstructions
        );
      } else if (parentIndexAmongTwo > currentNonLeafIndexToHeapify) {
        displayMessage(
          `Wrong Move! The sub-tree starting with this node already maintains heap property`,
          uiInstructions
        );
      }
    } else if (indexSwappingWithParent === currentNonLeafIndexToHeapify) {
      displayMessage(
        "Wrong Move! You cannot swap the child node with its parent",
        uiInstructions
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
      uiInstructions
    );
  } else if (indexSwappingWithParent > lastUnsortedIndex - 1) {
    displayMessage(
      "Wrong Move! You don't need to swap the nodes that are already sorted",
      uiInstructions
    );
  } else {
    displayMessage(
      "Wrong Move! This is already max heap. Remove the largest node and swap it with the node at the end of unsorted array.",
      uiInstructions
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
      uiInstructions
    );
  } else if (indexSwappingWithParent > lastUnsortedIndex - 1) {
    displayMessage(
      "Wrong Move! You don't need to swap the nodes that are already sorted",
      uiInstructions
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
        uiInstructions
      );
    } else if (indexSwappingWithParent === currentSwapIndices[0]) {
      displayMessage(
        "Wrong Move! You cannot swap the child node with its parent",
        uiInstructions
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
      uiInstructions
    );
    return;
  }
  if (
    arrayElements[parentIndexAmongTwo].value >
    arrayElements[indexSwappingWithParent].value
  ) {
    displayMessage(
      "Wrong Move! There's no need to swap if the parent node is larger than the child",
      uiInstructions
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
        uiInstructions
      );
    } else {
      displayMessage(
        "Wrong Move! Please make sure to swap the parent node with the larger child",
        uiInstructions
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
  treeNodeMesh2.position.copy(initialPosition);

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
  uiInstructions.innerHTML = stepInstructions[0];
  console.log("clicked");
  closeModal();
  resetScene();
  generateArray();
});

buttonNext.addEventListener("click", () => {
  uiInstructions.innerHTML = stepInstructions[0];
  console.log("clicked");
  closeModal();
  resetScene();
  currentLevel++;
  curlvlNodesNum = levels[currentLevel];
  generateArray();
});

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
