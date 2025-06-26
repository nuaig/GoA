import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import {
  Graph,
  createRandomConnectedGraph,
  createSpecificGraphPrimTutorial,
} from "../../utils/graphRelated/graph.js";
import { createThreePointLightingRoom } from "../../utils/threePointLighting.js";

import { PrimAlgorithm } from "../../utils/graphRelated/prims.js";
import { GameSession } from "../../utils/gameRelated/gameSession.js";
import { loadModel } from "../../utils/threeModels.js";
import { GameStatusService } from "../../utils/gameStatus/gameStatusService.js";
import gsap from "gsap";
import {
  decrementHealth,
  resetHealth,
  resetStars,
  updateHintIcons,
} from "../../utils/UI/ui.js";
import {
  effectForCorrectSelect,
  shakeForWrongSelect,
  shakeScreen,
} from "../../utils/UI/animations.js";
import {
  drawLine,
  updateLinePosition,
  isTriangleInequalitySatisfied,
  setFont,
  createNodeLabel,
  updateNodeLabel,
  updateNodeLabelColor,
  getRandomColor,
  createRing,
  highlightChest,
} from "../../utils/graphRelated/drawLine.js";
import GameRoomUI from "../../utils/UI/gameRoomUI.js";

const reArrangeButton = document.querySelector(".Rearrange-Action");
let curGameSession;

let currentLevel = 1; // TO DO

let curNodes;
let curEdges;
let graph;

// Define max score per level
const levelMaxScores = {
  1: 40,
  2: 50,
  3: 60,
};
let correctActionScoreAddition;

const levelConfig = {
  1: { nodes: 5, edges: 7 },
  2: { nodes: 6, edges: 8 },
  3: { nodes: 7, edges: 9 },
};

// const levelConfig = {
//   1: { nodes: 3, edges: 2 },
//   2: { nodes: 3, edges: 2 },
//   3: { nodes: 3, edges: 2 },
// };

const usedColors = new Set();
const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
curNodes = Array.from({ length: numNodes }, (_, i) => i);
curEdges = numEdges;

graph = createRandomConnectedGraph(curNodes, curEdges);

let componentColors = {};

let curAlgorithmForGraph = new PrimAlgorithm(graph);

let startingNodeLabelForPrim;
let startingNodeRingForPrim;

let onMouseMove; // TO DO put it in the object
let onClick; // TO DO put it in the object
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

const closedChestURL = new URL(
  "../../public/models/Prop_Chest_Closed.gltf",
  import.meta.url
);
const openChestURL = new URL(
  "../../public/models/Prop_Chest_Gold.gltf",
  import.meta.url
);
const dungeonRoomURL = new URL(
  "../../public/models/DungeonRoom_Kruskal_and_Prim.glb",
  import.meta.url
);

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

const startPosition = { x: 0, y: 5, z: 35 };
const midPosition = { x: 0, y: 5, z: 26 };
const endPosition = { x: 0, y: 26, z: 26 };
// camera.position.set(0, 26, 26); // Set the camera position
camera.position.set(startPosition.x, startPosition.y, startPosition.z);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 4);

const curRoomUI = new GameRoomUI("Prim", 1, camera);

correctActionScoreAddition = Math.floor(
  levelMaxScores[curRoomUI.currentLevel] / (numNodes - 1)
);

const tutorialSteps = [
  {
    instruction:
      "Select any edge to begin the tutorial after reading the explanation below.",
    explanation:
      "The treasure chests represent nodes, and the lines between them represent edges. Your goal is to open all the chests by forming a Minimum Spanning Tree (MST). An MST is a subset of edges that connects all nodes without forming cycles while keeping the total weight at a minimum.",
    expectedEdge: null, // No specific edge expected at this step
    errorMessage: "Click on any edge to start the tutorial.",
  },
  {
    instruction:
      "Select edge 0-2 with weight 1 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "You can start with any node as starting node but for this tutorial, let's start from node 0. Mark this node 0 as visited. You have to choose the edge with the minimum weight that connects any visited node (0) to any unvisited node (1, 2, 3, 4). There are only two edges that connects visisted node 0 to other unvisited nodes. Edge 0-1 has minimum weight among them.",
    expectedEdge: [0, 2, 1],
    errorMessage: "Wrong selection!",
  },
  {
    instruction:
      "Make a mistake by selecting edge 1-3 with weight 2 by clicking on it. Read the explanation carefully to understand why this is wrong.",
    explanation:
      "Even though this edge 1-3 with weight 2 is the next minimum edge in the whole graph. However, this edge is not connecting to any visited node. Therefore, it is a wrong choice.",
    expectedEdge: [1, 3, 2],
    errorMessage: "Wrong selection!",
  },
  {
    instruction:
      "Select edge 0-1 with weight 3 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "Look at all the edges that connects visited nodes (0, 2) to unvisited nodes (1, 3, 4). You will find that edge 0-1 with weight 3 is the edge with minimum weight among them. Therefore, it is added to the MST.",
    expectedEdge: [0, 1, 3],
    errorMessage:
      "Let's try to click edge 1-2 with weight 3 to see why that is not a good choice.",
  },
  {
    instruction:
      "Select edge 1-3 with weight 2 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "Look at all the edges that connects visited nodes (0, 1, 2) to unvisited nodes (3, 4). You will find that edge 1-3 with weight 2 is the edge with minimum weight among them. Therefore, it is added to the MST.",
    expectedEdge: [1, 3, 2],
    errorMessage:
      "Let's try to click edge 1-2 with weight 3 to see why that is not a good choice.",
  },
  {
    instruction:
      "Make a mistake by selecting edge 1-2 with weight 4 by clicking on it. Read the explanation carefully to understand why this is wrong.",
    explanation:
      "Even though this edge 1-2 with weight 4 is the next available edge with minimum weight, there are two reasons why this is incorrect. First reason is that it will cause a cycle and the other is that it is connected to two visited nodes (1, 2).",
    expectedEdge: [1, 2, 4],
    errorMessage:
      "Wrong selection! Pick the edge between nodes 1 and 3 with weight 4.",
  },
  {
    instruction:
      "Select edge 1-4 with weight 6 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "Look at all the edges that connects visited nodes (0, 1, 2, 3) to unvisited nodes (4). You will find that edge 1-4 with weight 6 is the edge with minimum weight among them. Therefore, it is added to the MST and you will achieve the minimum spanning tree since all nodes are already connected.",
    expectedEdge: [1, 4, 6],
    errorMessage:
      "Wrong selection! Pick the edge between nodes 1 and 3 with weight 4.",
  },
  {
    instruction: "Voila! You've successfully built the MST.",
    explanation:
      "You have connected all nodes without forming cycles while maintaining the minimum total weight. Congratulations on completing the tutorial!",
    expectedEdge: null, // No specific edge expected for completion
    errorMessage: "You've completed the tutorial! Click anywhere to exit.",
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
      // Await the initialization of GameStatusService
      await curRoomUI.gameStatusService.init();
      const userId = curRoomUI.gameStatusService.getUserId();
      curGameSession = new GameSession(
        userId,
        "Prim",
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

// disableEventListeners(); // TO DO not sure if we will need this

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
  if (curRoomUI.currentAlgorithm == "Prim") {
    const updatedStartingNodeLabelPosition = chestList[0].position.clone();
    updatedStartingNodeLabelPosition.y += 4;
    startingNodeLabelForPrim.position.copy(updatedStartingNodeLabelPosition);
    const updatedStartingNodeRingPosition = chestList[0].position.clone();
    updatedStartingNodeRingPosition.y += 0.1;
    startingNodeRingForPrim.position.copy(updatedStartingNodeRingPosition);
  }
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

// TO DO not sure if we will need
// window.toggleInstructions = function () {
//   toggleInstructions(currentAlgorithm);
// };

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

  if (curRoomUI.currentAlgorithm === "Prim") {
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
      "Prim's Algorithm",
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

  curRoomUI.currentScore += correctActionScoreAddition;
  curRoomUI.updateScore(curRoomUI.currentScore);
  console.log(curRoomUI.currentScore);
  console.log(curRoomUI.health);
  // curRoomUI.scoreText.innerHTML = `${currentScore}`;
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
    if (currentAlgorithm === "Kruskal") {
      updateNodeColorsForSameTree(edge);
    }
    handleSelectionEffect(intersectedObject);

    console.log("Selected edges:", curAlgorithmForGraph.selectedEdges);
    console.log("Current weight of the spanning tree:", currentWeight);

    if (isComplete) {
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
      curRoomUI.uiText.innerHTML = `Congratulations! You've completed the game!<br>The total weight of the minimum spanning tree is ${currentWeight}.`;
      curRoomUI.fillInfoSuccessCompletionModal();

      console.log(curRoomUI.totalStars);

      curGameSession.setFinalScore(curRoomUI.currentScore);
      curGameSession.setSuccessStatus(true);
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

      console.log(curRoomUI.currentLevel);
      console.log(curRoomUI.currentMode);

      curRoomUI.updateLevelStatus(curRoomUI.currentLevel, curRoomUI.totalStars);
      const status_update_string =
        curRoomUI.currentLevel != 3 ? "completed" : "completed_first_time";
      curRoomUI.gameStatusService.updateGameStatus(
        "Prim",
        curRoomUI.currentLevel,
        curRoomUI.currentMode,
        curRoomUI.currentScore,
        curRoomUI.totalStars + 1,
        status_update_string
      );
      curRoomUI.gameStatusService.unlockGameLevel(
        "Prim",
        curRoomUI.currentLevel + 1,
        curRoomUI.currentMode
      );
      curRoomUI.openCompletionModal();
      // openModal(currentLevel); // TO DO check this
      curRoomUI.disableMouseEventListeners_K_P();
      // window.removeEventListener("mousemove", onMouseMove, false);
      // window.removeEventListener("click", onClick, false);
    } else {
      curRoomUI.uiText.innerText = `Correct! Current weight is ${currentWeight}.`;
    }
  } else {
    shakeForWrongSelect();
    curGameSession.incrementMistakes();
    console.log("Incorrect edge selection:", edge);
    intersectedObject.material.color.set(0xff0000); // Set line to red
    if (intersectedObject.userData.label) {
      intersectedObject.userData.label.material.color.set(0xff0000); // Set label to red
    }
    curRoomUI.health = decrementHealth(curRoomUI.health);
    shakeScreen();
    document.querySelector(".Hint-Text").classList.remove("hidden");
    const hintItems = document.querySelectorAll(".Hint-Text li");
    updateHintIcons(hintItems[0], selectEdgeResult[0]);
    updateHintIcons(hintItems[1], selectEdgeResult[1]);
    if (currentAlgorithm === "Prim") {
      const primHintItem = document.querySelector(".Prim-Hint");
      if (primHintItem) {
        primHintItem.classList.remove("hidden");
        updateHintIcons(primHintItem, selectEdgeResult[2]);
      }
    }

    if (curRoomUI.isTutorial) {
      curRoomUI.uiText.innerText =
        "Learn from the hints below why this choice is incorrect. Continue following the instruction.";
    } else {
      curRoomUI.uiText.innerText =
        "Incorrect Selection. Make sure to meet the following conditions:";
    }
    setTimeout(() => {
      intersectedObject.material.color.set(0x74c0fc);
      if (intersectedObject.userData.label) {
        intersectedObject.userData.label.material.color.set(0x000000);
      }
    }, 3000);
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
      // openModal(currentLevel); //
      curRoomUI.disableMouseEventListeners_K_P();
    }
  }
}

let raycaster;
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

  curRoomUI.disableMouseEventListeners_K_P();
  curRoomUI.callbacks.onMouseMove = null;
  curRoomUI.callbacks.onClick = null;

  raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.5;
  const mouse = new THREE.Vector2();
  let selectedLine = null;

  const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  sphereInter = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereInter.visible = false;
  scene.add(sphereInter);

  // Assign the function to the global variable
  const onMouseMove = function (event) {
    event.preventDefault();
    if (curRoomUI.isModalOpen) return;
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
      curRoomUI.hoverEffects.forEach((hoverEffect) => {
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
      curRoomUI.hoverEffects.forEach((hoverEffect) => {
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
  const onClick = function (event) {
    event.preventDefault();
    if (curRoomUI.isModalOpen) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([...lines, ...labels]);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      if (intersectedObject.userData.selected) {
        return;
      }

      if (curRoomUI.isTutorial) {
        const currentStep = tutorialSteps[curRoomUI.currentTutorialStep];
        console.log(currentStep);

        if (currentStep.expectedEdge === null) {
          // Allow any edge selection
          nextTutorialStep();
          return;
        } else {
          const expectedEdge = currentStep.expectedEdge;
          const selectedEdge = intersectedObject.userData.edge;
          console.log(expectedEdge);
          console.log(selectedEdge);
          if (
            selectedEdge.start === expectedEdge[0] &&
            selectedEdge.end === expectedEdge[1] &&
            selectedEdge.weight === expectedEdge[2]
          ) {
            nextTutorialStep();
          } else {
            curRoomUI.uiText.innerText = currentStep.errorMessage;
          }
        }
      }

      if (intersectedObject.userData) {
        handleEdgeSelection(
          intersectedObject,
          curRoomUI.currentAlgorithm,
          onClick,
          onMouseMove
        );
      }
    }
  };
  curRoomUI.callbacks.onMouseMove = onMouseMove;
  curRoomUI.callbacks.onClick = onClick;
  console.log("printing callbacks", curRoomUI.callbacks);
  // Add event listeners
  curRoomUI.enableMouseEventListeners_K_P();
  // window.addEventListener("mousemove", onMouseMove, false);
  // window.addEventListener("click", onClick, false);
}

createThreePointLightingRoom(scene);

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

// ✅ Now assign these to GameRoomUI dynamically
// curRoomUI.callbacks.onMouseMove = onMouseMove;
// curRoomUI.callbacks.onClick = onClick;

// ✅ Ensure event listeners use the GameRoomUI callbacks
// window.addEventListener("mousemove", curRoomUI.callbacks.onMouseMove, false);
// window.addEventListener("click", curRoomUI.callbacks.onClick, false);
// Function to enable event listeners
// function enableEventListeners() {
//   window.addEventListener("mousemove", onMouseMove, false);
//   window.addEventListener("click", onClick, false);
// }

// // Function to disable event listeners
// function disableEventListeners() {
//   window.removeEventListener("mousemove", onMouseMove, false);
//   window.removeEventListener("click", onClick, false);
// }

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
  curRoomUI.disableMouseEventListeners_K_P();

  curRoomUI.onMouseMove = null;
  curRoomUI.onClick = null;

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
  curRoomUI.updateScore(0);
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
  correctActionScoreAddition = Math.floor(
    levelMaxScores[currentLevel] / (numNodes - 1)
  );
  graph = createRandomConnectedGraph(curNodes, curEdges);
  if (curRoomUI.currentLevel <= 3) {
    curAlgorithmForGraph = new PrimAlgorithm(graph);
    curRoomUI.currentAlgorithm = "Prim";
  }

  // updateComponentColors(curAlgorithmForGraph.uf, curNodes, componentColors);
  createModels();
  createHoverElements();
}

function setUpTutorialModel() {
  graph = createSpecificGraphPrimTutorial();
  curNodes = [0, 1, 2, 3, 4];
  curAlgorithmForGraph = new PrimAlgorithm(graph);
  curRoomUI.currentAlgorithm = "Prim";
  createModels();
  createHoverElements();
}

curRoomUI.callbacks.resetLevel = function (curlvl) {
  curRoomUI.uiText.innerHTML = `Please click on the Edge to Create Minimum Spanning Tree`;
  curRoomUI.health = resetHealth();
  document.querySelector(".Hint-Text").classList.add("hidden");
  curRoomUI.closeCompletionModal();
  curRoomUI.pseudoModalClose();
  resetScene();
  setUpGameModel(curlvl);
  updateNodeLabel(levelTitle, `Level ${curlvl}`, 0.9, 0.3, 0x212529);
  curGameSession.resetGameSession(
    curRoomUI.gameName,
    curRoomUI.currentLevel,
    curRoomUI.currentMode
  );
};

curRoomUI.callbacks.startTutorial = function () {
  curRoomUI.currentTutorialStep = 0;
  updateTutorialStep();
  curRoomUI.uiText.innerHTML = `Please click on the Edge to Create Minimum Spanning Tree`;
  resetScene();
  updateNodeLabel(levelTitle, `Tutorial`, 0.9, 0.3, 0x212529);
  setUpTutorialModel();
};
