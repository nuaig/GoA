// ===== Import Section =====
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import {
  createRandomConnectedGraph,
  createSpecificGraphDijkstraTutorial,
} from "./graph.js";
import { createThreePointLightingRoom } from "./utils/threePointLighting.js";
import { DijkstraAlgorithm } from "./utils/graphRelated/dijkstra.js";
import { GameSession } from "./utils/gameRelated/gameSession.js";
import { loadModel } from "./utils/threeModels.js";
import { GameStatusService } from "./utils/gameStatus/gameStatusService.js";
import {
  decrementHealth,
  resetHealth,
  resetStars,
  updateHintIcons,
} from "./utils/UI/ui.js";
import { shakeScreen } from "./utils/UI/animations.js";
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
} from "./utils/graphRelated/drawLine.js";
import GameRoomUI from "./utils/UI/gameRoomUI.js";

// ===== Variable Decleration Section =====
const reArrangeButton = document.querySelector(".Rearrange-Action");
let curGameSession;
let currentLevel = 1;
let curNodes;
let curEdges;
let graph;
let correctActionScoreAddition;
// Define max score per level
const levelMaxScores = {
  1: 40,
  2: 50,
  3: 60,
};
const levelConfig = {
  1: { nodes: 5, edges: 8 },
  2: { nodes: 6, edges: 9 },
  3: { nodes: 7, edges: 10 },
};
const usedColors = new Set();
const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
curNodes = Array.from({ length: numNodes }, (_, i) => i);
curEdges = numEdges;
graph = createRandomConnectedGraph(curNodes, curEdges);
updateEdgeTable(graph.edges);
let componentColors = {};
let curAlgorithmForGraph = new DijkstraAlgorithm(graph);
let onMouseMove;
let onClick;
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
let selectedEdgesThisStep = [];
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
let dungeonRoomAction;
const startPosition = { x: 0, y: 5, z: 35 };
camera.position.set(startPosition.x, startPosition.y, startPosition.z);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 4);
const curRoomUI = new GameRoomUI("Dijkstra", 1, camera);
correctActionScoreAddition = Math.floor(
  levelMaxScores[curRoomUI.currentLevel] / (numNodes - 1)
);
const fontLoader = new FontLoader();
let font;
let levelTitle;
const labelDepth = 0.1;
let hoverRing = createRing(0.8, 0.9, labelDepth, 0x000000);
scene.add(hoverRing);
let raycaster;
const clock = new THREE.Clock();

// Steps for the Dijkstra tutorial
const tutorialSteps = [
  {
    instruction: "Step 0: Click on node 0 to begin.",
    explanation:
      "Dijkstra's algorithm starts at a source node. Here, node 0 is the source — the starting point for finding the shortest paths to all other nodes.",
    expectedChest: 0,
    expectedEdges: null,
    errorMessage: "Incorrect! Please press on node 0.",
  },
  {
    instruction: "Step 1: Click on the edge between node 0 and node 2.",
    explanation:
      "We now explore neighbors of node 0. The edge (0, 2) has weight 1, meaning it costs 1 unit to reach node 2 from node 0. This is currently the shortest path to node 2.",
    expectedChest: null,
    expectedEdges: [[0, 2]],
    updatedDistance: { 2: 1 },
    errorMessage: "Click the edge (0, 2) to record the distance to node 2.",
  },
  {
    instruction: "Step 2: Now click the edge between node 0 and node 1.",
    explanation:
      "We’re still exploring node 0’s neighbors. The edge (0, 1) has a weight of 2, which means it costs 2 units to reach node 1 from node 0. We now know shortest paths to nodes 1 and 2.",
    expectedChest: null,
    expectedEdges: [[0, 1]],
    updatedDistance: { 1: 2 },
    errorMessage: "Click the edge (0, 1) to update the distance to node 1.",
  },
  {
    instruction: "Step 3: Visit the next closest unvisited node: node 2.",
    explanation:
      "Out of all unvisited nodes, node 2 has the smallest known distance (1). So we visit it next. Dijkstra always chooses the unvisited node with the lowest cost so far.",
    expectedChest: 2,
    expectedEdges: null,
    errorMessage:
      "Incorrect! Click on node 2 — it's the nearest unvisited node.",
  },
  {
    instruction: "Step 4: Click the edge between node 2 and node 1.",
    explanation:
      "We check if there's a shorter path to node 1 via node 2. This edge (2, 1) has a weight of 1. But the current known distance to node 1 is 2, and 1 (to node 2) + 1 = 2, so it doesn't improve the path.",
    expectedChest: null,
    expectedEdges: [[2, 1]],
    updatedDistance: { 1: 2 },
    errorMessage: "Click (2, 1) to compare if it's a better path to node 1.",
  },
  {
    instruction: "Step 5: Click the edge between node 2 and node 4.",
    explanation:
      "We check the cost to reach node 4 through node 2. The edge (2, 4) has a weight of 6. Since reaching node 2 costs 1, total cost to node 4 is 1 + 6 = 7. This becomes the current shortest known distance to node 4.",
    expectedChest: null,
    expectedEdges: [[2, 4]],
    updatedDistance: { 4: 7 },
    errorMessage: "Click (2, 4) to record the current distance to node 4.",
  },
  {
    instruction: "Step 6: Click the edge between node 2 and node 3.",
    explanation:
      "Now we check the cost to reach node 3 from node 2. The edge (2, 3) has a weight of 2. Since node 2’s distance is 1, total cost to node 3 becomes 3. That’s our best path so far.",
    expectedChest: null,
    expectedEdges: [[2, 3]],
    updatedDistance: { 3: 3 },
    errorMessage: "Click (2, 3) to update the distance to node 3.",
  },
  {
    instruction: "Step 7: Visit node 1 — it's the next closest.",
    explanation:
      "Among the remaining unvisited nodes, node 1 has the shortest distance (2). So we visit it next to check if it leads to better paths to other nodes.",
    expectedChest: 1,
    expectedEdges: null,
    errorMessage: "Incorrect! Click on node 1 — it’s the next closest node.",
  },
  {
    instruction: "Step 8: Click the edge between node 1 and node 3.",
    explanation:
      "From node 1, we check if going to node 3 through (1, 3) improves the path. This edge has weight 3, and node 1’s cost is 2, so total = 5. But we already know a cheaper path to node 3 (which is 3), so we keep that.",
    expectedChest: null,
    expectedEdges: [[1, 3]],
    updatedDistance: { 3: 3 },
    errorMessage: "Click (1, 3) to evaluate its path to node 3.",
  },
  {
    instruction: "Step 9: Visit node 3 next.",
    explanation:
      "Among unvisited nodes, node 3 has the lowest cost (3). We now explore paths through it.",
    expectedChest: 3,
    expectedEdges: null,
    errorMessage: "Incorrect! Click on node 3 to visit it next.",
  },
  {
    instruction: "Step 10: Click the edge between node 3 and node 4.",
    explanation:
      "We evaluate the path to node 4 through node 3. Node 3’s cost is 3 and the edge (3, 4) has weight 1, so total = 4. This is shorter than the previous known distance to node 4 (which was 7), so we update it.",
    expectedChest: null,
    expectedEdges: [[3, 4]],
    updatedDistance: { 4: 4 },
    errorMessage: "Click (3, 4) to update the distance to node 4.",
  },
  {
    instruction: "Step 11: Finally, visit node 4.",
    explanation:
      "Node 4 is the last unvisited node. Its shortest path has been found (distance 4), so we visit it to finish the algorithm.",
    expectedChest: 4,
    expectedEdges: null,
    errorMessage: "Click on node 4 to complete Dijkstra’s algorithm.",
  },
];

// ===== Function Decleration Section =====
/*
 * Updates tutorial UI with the current step.
 * 1. Gets the current step from `tutorialSteps` using `curRoomUI.currentTutorialStep`.
 * 2. Updates DOM with step's instruction and explanation.
 */
function updateTutorialStep() {
  const step = tutorialSteps[curRoomUI.currentTutorialStep];

  console.log(
    "[updateTutorialStep] Current Step Index:",
    curRoomUI.currentTutorialStep
  );
  console.log("[updateTutorialStep] Step Content:", step);

  document.querySelector(".tuto-instruction-text").innerHTML = step.instruction;
  document.querySelector(".tuto-explanation-text").innerHTML = step.explanation;
}

/*
 * Moves to the next tutorial step.
 * 1. Increments current step index.
 * 2. If all steps are done: shows completion modal, resets tutorial state.
 * 3. Otherwise: updates UI with the next step.
 */
function nextTutorialStep() {
  const nextStepIndex = ++curRoomUI.currentTutorialStep;

  console.log("[nextTutorialStep] Next Step Index:", nextStepIndex);
  console.log("[nextTutorialStep] Total Steps:", tutorialSteps.length);

  const isComplete = nextStepIndex >= tutorialSteps.length;
  if (isComplete) {
    console.log(
      "[nextTutorialStep] Tutorial complete. Showing modal and resetting state."
    );
    curRoomUI.updateTutorialModalToBeTutorialCompleteModal?.();
    curRoomUI.openModal(
      "Congratulations!",
      "You've completed Dijkstra's algorithm tutorial!"
    );
    curRoomUI.currentLevel = null;
    curRoomUI.isTutorial = false;
  } else {
    console.log("[nextTutorialStep] Proceeding to next tutorial step.");
    updateTutorialStep();
  }
}

/*
 * Generates and places 3D chest models on the scene.
 * 1. Positions each node—fixed or randomly spaced using triangle checks.
 * 2. Loads & scales open/closed chest models.
 * 3. Adds labels above each chest.
 * 4. Appends all to global lists and draws connecting lines.
 */
async function createModels() {
  const margin = 0.1;
  const fixed = [];

  for (let i = 0; i < curNodes.length; i++) {
    console.log(`[createModels] Creating model for node ${i}`);
    let position;

    if (i < fixed.length) {
      // Use fixed coordinates for predefined nodes (not currently used since fixed is empty)
      position = new THREE.Vector3(fixed[i][0], fixed[i][1], fixed[i][2]);
      console.log(
        `[createModels] Using fixed position for node ${i}:`,
        position
      );
    } else {
      // Generate a valid random position that satisfies spatial constraints
      let validPosition = false;
      position = new THREE.Vector3();

      while (!validPosition) {
        // Generate random XZ position within the grid
        const randomX = (Math.random() - 0.5) * gridSize;
        const randomZ = (Math.random() - 0.5) * gridSize;
        position.set(randomX, 0, randomZ);
        validPosition = true;

        // Check distance constraint with all existing chests
        for (let x = 0; x < chestList.length; x++) {
          if (chestList[x].position.distanceTo(position) < minDistance) {
            validPosition = false;
            break;
          }

          // Check triangle inequality with each pair of existing chests
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

      console.log(`[createModels] Random position for node ${i}:`, position);
    }

    // Load and place closed chest model
    const closedModel = await loadModel(closedChestURL.href, position, scene);
    closedModel.model.scale.set(2.5, 2.5, 2.5);
    chestList.push(closedModel.model);

    // Load and place open chest model (initially hidden)
    const openModel = await loadModel(openChestURL.href, position, scene);
    openModel.model.scale.set(1.5, 1.5, 1.5);
    openModel.model.visible = false;
    openChestList.push(openModel.model);

    // Create a floating label above the chest
    const labelPosition = position.clone();
    labelPosition.y += 2.5;
    const chestLabel = createNodeLabel(`${i}`, labelPosition, scene);
    chestLabelList.push(chestLabel);
  }

  console.log("All models loaded. Final chestList:", chestList);

  // Draw lines between all chests to form the graph
  drawLines();
}

/*
 * Updates label colors for all nodes in the same tree/component as the given edge.
 *
 * 1. Gets nodes with the same parent as edge.start and edge.end.
 * 2. Applies the appropriate existing or new color to all related nodes.
 * 3. Manages the `usedColors` set to avoid color reuse.
 *
 * @param {Object} edge - The selected edge with `start` and `end` node indices.
 */
function updateNodeColorsForSameTree(edge) {
  function getNodesWithSameParentsAndColor(edge, color) {
    const nodesWithSameParentStart =
      curAlgorithmForGraph.getAllNodesWithSameParent(edge.start);
    const nodesWithSameParentEnd =
      curAlgorithmForGraph.getAllNodesWithSameParent(edge.end);

    const allNodes = nodesWithSameParentStart.concat(nodesWithSameParentEnd);

    console.log(
      "[updateNodeColors] Coloring nodes:",
      allNodes,
      "with color:",
      color
    );

    allNodes.forEach((node) => {
      updateNodeLabelColor(chestLabelList[node], color);
      componentColors[node] = color;
    });
  }

  const nodeStartColor = componentColors[edge.start];
  const nodeEndColor = componentColors[edge.end];

  console.log(
    "[updateNodeColors] Start Color:",
    nodeStartColor,
    "End Color:",
    nodeEndColor
  );

  if (nodeStartColor && nodeEndColor) {
    // Case: merging two components — use one color, free the other
    getNodesWithSameParentsAndColor(edge, nodeStartColor);
    usedColors.delete(nodeEndColor);
    console.log(
      "[updateNodeColors] Merged two components; freed color:",
      nodeEndColor
    );
  } else if (!nodeStartColor && nodeEndColor) {
    // Case: start uncolored, end has color — apply end color to both
    getNodesWithSameParentsAndColor(edge, nodeEndColor);
  } else if (nodeStartColor && !nodeEndColor) {
    // Case: end uncolored, start has color — apply start color to both
    getNodesWithSameParentsAndColor(edge, nodeStartColor);
  } else {
    // Case: both nodes uncolored — assign a new unique color
    let newColor;
    do {
      newColor = getRandomColor();
    } while (usedColors.has(newColor));

    usedColors.add(newColor);
    console.log("[updateNodeColors] Assigned new color:", newColor);

    getNodesWithSameParentsAndColor(edge, newColor);
  }
}

/*
 * Handles visual and logical updates when an edge is selected.
 *
 * 1. Highlights the selected edge and marks it as selected.
 * 2. Swaps chest models (closed → open) for both connected nodes.
 * 3. Adds a permanent ring under the label.
 * 4. Updates score and triggers UI refresh.
 *
 * @param {THREE.Line} intersectedObject - The edge object selected by the user, containing userData like startCube, endCube, and label.
 */
function handleSelectionEffect(intersectedObject) {
  // Visually highlight the selected edge
  intersectedObject.material.color.set(0x00ff00); // Set line to green
  intersectedObject.userData.selected = true; // Mark as selected

  console.log("[handleSelectionEffect] Edge selected:", intersectedObject);

  const { startCube, endCube } = intersectedObject.userData;

  // Locate corresponding closed and open chest models for both nodes
  const closedStart = chestList[chestList.indexOf(startCube)];
  const openStart = openChestList[chestList.indexOf(startCube)];
  const closedEnd = chestList[chestList.indexOf(endCube)];
  const openEnd = openChestList[chestList.indexOf(endCube)];

  // Swap visibility: show open chests, hide closed ones
  closedStart.visible = false;
  openStart.visible = true;
  closedEnd.visible = false;
  openEnd.visible = true;

  console.log("[handleSelectionEffect] Swapped chest models for nodes");

  // Create a black ring under the selected label as a permanent marker
  const permanentRing = createRing(0.8, 0.9, labelDepth, 0x000000);
  permanentRing.position.copy(intersectedObject.userData.label.position);
  permanentRing.position.y -= labelDepth / 2;
  scene.add(permanentRing);
  permanentRing.visible = true;
  ringList.push(permanentRing);
  intersectedObject.userData.ring = permanentRing;

  // Update score and trigger UI update
  curRoomUI.currentScore += correctActionScoreAddition;
  curRoomUI.updateScore(curRoomUI.currentScore);

  console.log("[handleSelectionEffect] Score updated:", curRoomUI.currentScore);
  console.log("[handleSelectionEffect] Current health:", curRoomUI.health);
}

/*
 * Handles user edge selection and triggers all effects.
 *
 * 1. Validates the selected edge via the algorithm.
 * 2. If valid: shows visual effects, updates labels and chests, checks for completion.
 * 3. If complete: calculates score, saves session, and shows end modal.
 * 4. If incorrect: provides visual feedback, shows hints, and checks for game over.
 *
 * @param {THREE.Line} intersectedObject - The selected edge containing node and label data in `userData`.
 * @param {string} currentAlgorithm - The name of the algorithm in use ("Dijkstra").
 */
function handleEdgeSelection(intersectedObject, currentAlgorithm) {
  const edge = intersectedObject.userData.edge;
  const selectEdgeResult = curAlgorithmForGraph.selectEdge([
    edge.start,
    edge.end,
    edge.weight,
  ]);
  const isComplete = curAlgorithmForGraph.isComplete();
  const currentWeight = curAlgorithmForGraph.currentWeight;

  if (selectEdgeResult.every((res) => res === 1)) {
    // Successful edge selection
    document.querySelector(".Hint-Text").classList.add("hidden");
    curRoomUI.uiText.innerText = "✅ Correct!";

    // Update component colors if using Dijkstra
    if (currentAlgorithm === "Dijkstra") {
      updateNodeColorsForSameTree(edge);
    }

    // Visual + logical effect
    handleSelectionEffect(intersectedObject);

    console.log("Selected edges:", curAlgorithmForGraph.selectedEdges);
    console.log("Current weight of the spanning tree:", currentWeight);

    if (isComplete) {
      // Game is complete — handle success flow
      if (curRoomUI.isTutorial) {
        curRoomUI.updateTutorialModalToBeTutorialCompleteModal();
        curRoomUI.currentLevel = null;
        curRoomUI.isTutorial = false;
        return;
      }

      console.log(currentLevel, "current Level");

      // Calculate final score based on health and max score
      curRoomUI.currentScore = Math.floor(
        levelMaxScores[curRoomUI.currentLevel] *
          ((curRoomUI.health + 1) * 0.1 + 1)
      );
      console.log(curRoomUI.currentScore);

      curRoomUI.uiText.innerHTML = `Congratulations! You've completed the game!<br>The total weight of the minimum spanning tree is ${currentWeight}.`;

      // Modal, score storage, status updates
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

      curRoomUI.updateLevelStatus(curRoomUI.currentLevel, curRoomUI.totalStars);
      const status_update_string =
        curRoomUI.currentLevel != 3 ? "completed" : "completed_first_time";

      curRoomUI.gameStatusService.updateGameStatus(
        "Dijkstra",
        curRoomUI.currentLevel,
        curRoomUI.currentMode,
        curRoomUI.currentScore,
        curRoomUI.totalStars + 1,
        status_update_string
      );

      curRoomUI.gameStatusService.unlockGameLevel(
        "Dijkstra",
        curRoomUI.currentLevel + 1,
        curRoomUI.currentMode
      );

      curRoomUI.openCompletionModal();
      curRoomUI.disableMouseEventListeners_K_P();
    } else {
      // Not complete yet — show updated weight
      curRoomUI.uiText.innerText = `Correct! Current weight is ${currentWeight}.`;
    }
  } else {
    // Incorrect edge selection
    shakeScreen();
    curGameSession.incrementMistakes();
    console.log("Incorrect edge selection:", edge);

    // Visual feedback for incorrect selection
    intersectedObject.material.color.set(0xff0000);
    if (intersectedObject.userData.label) {
      intersectedObject.userData.label.material.color.set(0xff0000);
    }

    curRoomUI.health = decrementHealth(curRoomUI.health);
    shakeScreen();

    // Show hint panel
    document.querySelector(".Hint-Text").classList.remove("hidden");
    const hintItems = document.querySelectorAll(".Hint-Text li");
    updateHintIcons(hintItems[0], selectEdgeResult[0]);
    updateHintIcons(hintItems[1], selectEdgeResult[1]);

    // Display instructional text based on mode
    if (curRoomUI.isTutorial) {
      curRoomUI.uiText.innerText =
        "Learn from the hints below why this choice is incorrect. Continue following the instruction.";
    } else {
      curRoomUI.uiText.innerText =
        "Incorrect Selection. Make sure to meet the following conditions:";
    }

    // Restore edge color after 3 seconds
    setTimeout(() => {
      intersectedObject.material.color.set(0x74c0fc);
      if (intersectedObject.userData.label) {
        intersectedObject.userData.label.material.color.set(0x000000);
      }
    }, 3000);

    // Handle game failure if health drops below zero
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
      curRoomUI.disableMouseEventListeners_K_P();
    }
  }
}

/*
 * Draws lines between chests (edges of the graph) and sets up interaction logic.
 *
 * 1. Draws all edges from the graph visually and links labels.
 * 2. Sets up hover and click interaction using raycasting.
 * 3. Handles tutorial and game logic when a chest or edge is clicked.
 */
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

  // Reset old listeners before assigning new ones
  curRoomUI.disableMouseEventListeners_K_P();
  curRoomUI.callbacks.onMouseMove = null;
  curRoomUI.callbacks.onClick = null;

  // Setup raycaster for hover and click
  raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.5;
  const mouse = new THREE.Vector2();
  let selectedLine = null;

  // Sphere used to highlight hovered intersection
  const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  sphereInter = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereInter.visible = false;
  scene.add(sphereInter);

  // Mouse move handler: hover feedback for edges and chests
  onMouseMove = function (event) {
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
    const chestIntersects = raycaster.intersectObjects([...chestList]);

    // Highlight chest if hovered
    if (chestIntersects.length > 0) {
      let hoveredChest = chestIntersects[0].object;
      while (hoveredChest && !chestList.includes(hoveredChest)) {
        hoveredChest = hoveredChest.parent;
      }
      const index = chestList.indexOf(hoveredChest);
      if (index !== -1) {
        chestList[index].visible = false;
        openChestList[index].visible = true;
      }
    } else {
      // Reset all unopened chests
      chestList.forEach((chest, i) => {
        if (!openChestList[i].userData?.clicked) {
          chest.visible = true;
          openChestList[i].visible = false;
        }
      });
    }

    if (intersects.length > 0) {
      curRoomUI.hoverEffects.forEach((hoverEffect) =>
        hoverEffect.classList.add("highlight")
      );
      const intersectedObject = intersects[0].object;

      if (intersectedObject.userData.selected) {
        sphereInter.visible = false;
        hoverRing.visible = false;
        return;
      }

      sphereInter.position.copy(intersects[0].point);
      sphereInter.visible = true;

      // Highlight edge if different from previously selected
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
      curRoomUI.hoverEffects.forEach((hoverEffect) =>
        hoverEffect.classList.remove("highlight")
      );
      sphereInter.visible = false;
      hoverRing.visible = false;

      if (selectedLine && !selectedLine.userData.selected) {
        selectedLine.material.color.set(0x74c0fc);
        hoverRing.visible = false;
      }
      selectedLine = null;
    }
  };

  // Click handler: chest or edge interaction depending on tutorial/game state
  onClick = function (event) {
    event.preventDefault();
    if (curRoomUI.isModalOpen) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const chestIntersects = raycaster.intersectObjects([...chestList]);
    const edgeIntersects = raycaster.intersectObjects([...lines, ...labels]);
    const intersectedEdge = edgeIntersects[0]?.object;
    const currentStep = tutorialSteps[curRoomUI.currentTutorialStep];

    // Chest click logic
    if (chestIntersects.length > 0) {
      let clickedChest = chestIntersects[0].object;
      while (clickedChest && !chestList.includes(clickedChest)) {
        clickedChest = clickedChest.parent;
      }

      const index = chestList.indexOf(clickedChest);
      if (index !== -1) {
        if (curRoomUI.isTutorial) {
          // Tutorial chest logic
          if (currentStep.expectedEdges) {
            document.querySelector(".Hint-Text").classList.add("hidden");
            curRoomUI.uiText.innerText = currentStep.errorMessage;
            curRoomUI.wrongSelectionFeedback?.();
            shakeScreen();
            return;
          }

          if (currentStep.expectedChest !== null) {
            if (index === currentStep.expectedChest) {
              chestList[index].visible = false;
              openChestList[index].visible = true;
              openChestList[index].userData.clicked = true;

              document.querySelector(".Hint-Text").classList.add("hidden");
              curRoomUI.uiText.innerText = "✅ Correct!";
              setTimeout(() => nextTutorialStep(), 500);
            } else {
              document.querySelector(".Hint-Text").classList.add("hidden");
              curRoomUI.uiText.innerText = currentStep.errorMessage;
              curRoomUI.wrongSelectionFeedback?.();
              shakeScreen();
            }
            return;
          }
          return;
        }

        // Game chest logic
        chestList[index].visible = false;
        openChestList[index].visible = true;
        openChestList[index].userData.clicked = true;
        return;
      }
    }

    // Tutorial: clicked edge when chest was expected
    if (
      curRoomUI.isTutorial &&
      currentStep.expectedChest !== null &&
      intersectedEdge?.userData?.edge
    ) {
      document.querySelector(".Hint-Text").classList.add("hidden");
      curRoomUI.uiText.innerText = currentStep.errorMessage;
      curRoomUI.wrongSelectionFeedback?.();
      shakeScreen();
      return;
    }

    // Tutorial: clicked edge — validate expected edges
    if (
      curRoomUI.isTutorial &&
      currentStep.expectedEdges &&
      intersectedEdge?.userData?.edge
    ) {
      const expectedEdges = currentStep.expectedEdges;
      const { start, end } = intersectedEdge.userData.edge;

      const isExpected = expectedEdges.some(
        ([e0, e1]) =>
          (start === e0 && end === e1) || (start === e1 && end === e0)
      );

      if (!isExpected) {
        document.querySelector(".Hint-Text").classList.add("hidden");
        curRoomUI.uiText.innerText = currentStep.errorMessage;
        curRoomUI.wrongSelectionFeedback?.();
        shakeScreen();

        if (currentStep.advanceOnError) {
          setTimeout(() => {
            selectedEdgesThisStep = [];
            nextTutorialStep();
          }, 1000);
        }

        return;
      }

      const alreadySelected = selectedEdgesThisStep.some(
        ([e0, e1]) =>
          (start === e0 && end === e1) || (start === e1 && end === e0)
      );

      if (!alreadySelected) {
        selectedEdgesThisStep.push([start, end]);
      }

      const allSelected = expectedEdges.every(([e0, e1]) =>
        selectedEdgesThisStep.some(
          ([s0, s1]) => (s0 === e0 && s1 === e1) || (s0 === e1 && s1 === e0)
        )
      );

      if (allSelected) {
        selectedEdgesThisStep = [];
        document.querySelector(".Hint-Text").classList.add("hidden");
        curRoomUI.uiText.innerText = "✅ Correct!";
        showInputDialog();
      }

      return;
    }

    // Non-tutorial: edge selection
    if (intersectedEdge?.userData?.edge) {
      handleEdgeSelection(
        intersectedEdge,
        curRoomUI.currentAlgorithm,
        onClick,
        onMouseMove
      );
    }
  };

  curRoomUI.callbacks.onMouseMove = onMouseMove;
  curRoomUI.callbacks.onClick = onClick;

  console.log("printing callbacks", curRoomUI.callbacks);

  curRoomUI.enableMouseEventListeners_K_P();
}

/*
 * Updates the camera and renderer dimensions when the window is resized.
 * Ensures the 3D scene maintains correct aspect ratio and fills the screen.
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/*
 * The main animation loop.
 * 1. Updates all animation mixers using delta time.
 * 2. Updates camera controls and label orientation.
 * 3. Renders the scene.
 */
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

/*
 * Populates the edge table in the UI with the provided edge list.
 *
 * @param {Array<[number, number, number]>} edges - List of edges as [from, to, weight] tuples.
 */
function updateEdgeTable(edges) {
  const tableBody = document.querySelector("#edgeTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  edges.forEach(([from, to, weight]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${from}</td><td>${to}</td><td>${weight}</td>`;
    tableBody.appendChild(row);
  });
}

/*
 * Rotates all labels and rings to always face the camera.
 * Keeps chest, edge, and ring labels readable during movement.
 */
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
}

/*
 * Loads and places the dungeon room model into the scene.
 *
 * 1. Loads the model asynchronously using the provided URL and position.
 * 2. Initializes animation mixer and action if available.
 * 3. Scales the model and attaches it to the scene.
 * 4. Handles loading failures gracefully.
 */
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
      // Save mixer and action for animation control
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

    // Scale the model to fit the scene
    model.scale.set(1.5, 1.5, 1.5);
  } catch (error) {
    console.error("Error loading dungeon room:", error);
  }
}

/*
 * Resets the entire 3D scene and UI state.
 *
 * 1. Removes all chests, edges, labels, and rings from the scene and disposes of their resources.
 * 2. Clears all global arrays and resets state variables.
 * 3. Removes raycaster-related listeners and interaction objects.
 * 4. Resets score, star UI, and visual highlights.
 */
function resetScene() {
  // Remove and dispose chest models
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

  // Remove and dispose node labels
  chestLabelList.forEach((label) => {
    scene.remove(label);
    if (label.geometry) label.geometry.dispose();
    if (label.material) label.material.dispose();
  });

  // Remove and dispose edge lines
  edgeList.forEach((edge) => {
    scene.remove(edge);
    if (edge.geometry) edge.geometry.dispose();
    if (edge.material) edge.material.dispose();
  });

  // Remove and dispose edge labels
  edgeLabelList.forEach((label) => {
    scene.remove(label);
    if (label.geometry) label.geometry.dispose();
    if (label.material) label.material.dispose();
  });

  // Remove and dispose selection rings
  ringList.forEach((ring) => {
    scene.remove(ring);
    if (ring.geometry) ring.geometry.dispose();
    if (ring.material) ring.material.dispose();
  });

  // Clear arrays
  chestList.length = 0;
  openChestList.length = 0;
  chestLabelList.length = 0;
  edgeList.length = 0;
  edgeLabelList.length = 0;
  ringList.length = 0;

  // Disable interaction handlers
  curRoomUI.disableMouseEventListeners_K_P();
  curRoomUI.onMouseMove = null;
  curRoomUI.onClick = null;

  // Remove sphere indicator and free its resources
  if (sphereInter) {
    scene.remove(sphereInter);
    sphereInter.geometry.dispose();
    sphereInter.material.dispose();
  }

  // Reset UI and color tracking
  hoverRing.visible = false;
  usedColors.clear();
  componentColors = {};

  // Reset score and visual star indicators
  curRoomUI.updateScore(0);
  resetStars();
}

/*
 * Creates and adds hover visual elements to the scene.
 * Includes a red sphere for edge intersections and a black ring for label highlights.
 */
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

/*
 * Sets up the game state and visuals based on the selected level.
 *
 * 1. Validates the level against `levelConfig`.
 * 2. Initializes graph nodes, edges, and scoring logic.
 * 3. Generates a connected graph and updates UI tables.
 * 4. Instantiates the correct algorithm and prepares 3D models.
 *
 * @param {number} currentLevel - The currently selected level number.
 */
function setUpGameModel(currentLevel) {
  if (!levelConfig[currentLevel]) {
    console.error(
      `Invalid level: ${currentLevel}. Level does not exist in levelConfig.`
    );
    return; // Exit the function if the level is invalid
  }

  const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
  curNodes = Array.from({ length: numNodes }, (_, i) => i);
  curEdges = numEdges;

  // Score per correct action is based on max score divided by number of needed actions
  correctActionScoreAddition = Math.floor(
    levelMaxScores[currentLevel] / (numNodes - 1)
  );

  graph = createRandomConnectedGraph(curNodes, curEdges);
  updateEdgeTable(graph.edges);
  initializeDistanceTable(graph.nodes);

  console.log("Graph ==", graph);

  // Assign algorithm for early levels
  if (curRoomUI.currentLevel <= 3) {
    curAlgorithmForGraph = new DijkstraAlgorithm(graph);
    curRoomUI.currentAlgorithm = "Dijkstra";
  }

  createModels();
  createHoverElements();
}

/*
 * Initializes the distance table UI for the algorithm.
 *
 * 1. Clears any existing table rows.
 * 2. Creates a new row for each node with default distance "∞".
 * 3. Assigns an ID to each distance cell for future updates.
 *
 * @param {Array<number>} nodes - List of node indices to populate in the table.
 */
function initializeDistanceTable(nodes) {
  const tableBody = document.getElementById("distance-table-body");
  if (!tableBody) {
    console.warn("Table body element not found: #distance-table-body");
    return;
  }

  tableBody.innerHTML = ""; // Clear any old rows

  nodes.forEach((node, index) => {
    const row = document.createElement("tr");

    const nodeCell = document.createElement("td");
    nodeCell.textContent = index;

    const distCell = document.createElement("td");
    distCell.textContent = "∞";
    distCell.id = `distance-${index}`; // We'll use this ID to update it later

    row.appendChild(nodeCell);
    row.appendChild(distCell);
    tableBody.appendChild(row);
  });
}

/*
 * Sets up the specific graph and UI for the Dijkstra tutorial mode.
 *
 * 1. Loads a predefined tutorial graph.
 * 2. Initializes algorithm, tables, and visuals for the tutorial.
 */
function setUpTutorialModel() {
  graph = createSpecificGraphDijkstraTutorial();
  curNodes = graph.nodes;
  curAlgorithmForGraph = new DijkstraAlgorithm(graph);
  curRoomUI.currentAlgorithm = "Dijkstra";

  updateEdgeTable(graph.edges);
  initializeDistanceTable(graph.nodes);

  createModels();
  createHoverElements();
}

/*
 * Displays the input dialog and backdrop.
 * Sets modal state to prevent interactions with the underlying scene.
 */
function showInputDialog() {
  document.getElementById("input-dialog").style.display = "block";
  document.getElementById("input-backdrop").style.display = "block";

  // Prevent interactions underneath
  curRoomUI.isModalOpen = true;
}

/*
 * Validates user input from the tutorial dialog.
 *
 * 1. If a distance update is expected, checks correctness and updates UI/state.
 * 2. Marks the related edge as selected and visually updates it if valid.
 * 3. Closes the dialog and advances the tutorial if appropriate.
 */
function closeInputDialog() {
  const inputValue = document.getElementById("dialog-input").value.trim();
  const currentStep = tutorialSteps[curRoomUI.currentTutorialStep];
  const expected = currentStep.updatedDistance;
  const selectedEdge = currentStep.expectedEdges?.[0]; // [start, end]

  let isCorrect = false;

  // If distance input is expected, validate it
  if (expected) {
    const [node, correctValue] = Object.entries(expected)[0];

    if (inputValue === correctValue.toString()) {
      isCorrect = true;

      // Update distance table
      const cell = document.getElementById(`distance-${node}`);
      if (cell) cell.textContent = correctValue;

      // Mark edge as selected (no visual highlight)
      if (selectedEdge) {
        const selectedLine = edgeList.find((line) => {
          const edge = line.userData?.edge;
          return (
            edge &&
            ((edge.start === selectedEdge[0] && edge.end === selectedEdge[1]) ||
              (edge.start === selectedEdge[1] && edge.end === selectedEdge[0]))
          );
        });

        if (selectedLine) {
          selectedLine.userData.selected = true;
          selectedLine.material.color.set(0x800080); // mark with distinct color
          if (selectedLine.userData.label) {
            selectedLine.userData.label.material.color.set(0x000000);
          }
        }
      }
    }
  }

  document.getElementById("input-dialog").style.display = "none";
  document.getElementById("input-backdrop").style.display = "none";
  document.getElementById("dialog-input").value = "";
  curRoomUI.isModalOpen = false;

  if (isCorrect) {
    nextTutorialStep();
  } else {
    // Handle intentionally incorrect input (used for learning steps)
    if (currentStep.advanceOnError) {
      setTimeout(() => {
        nextTutorialStep();
      }, 1000);
    } else {
      curRoomUI.uiText.innerText = "Incorrect input. Try again.";
      shakeScreen?.();
    }
  }
}

/// ===== Document Object Model & User Session Initialization Section =====
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("dialog-ok-btn").onclick = closeInputDialog;
});

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
        "Dijkstra",
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

fontLoader.load(
  "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  (loadedFont) => {
    font = loadedFont;
    setFont(font);
    createModels();
    createNodeLabel(
      "Dijkstra's Algorithm",
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

// ===== Scene Initialization Section =====
createThreePointLightingRoom(scene);
window.addEventListener("resize", onWindowResize, false);
window.closeInputDialog = closeInputDialog;
animate();
createDungeonRoom();

// ===== UI Callbacks Section =====
curRoomUI.callbacks.resetLevel = function (curlvl) {
  curRoomUI.uiText.innerHTML = `Please click on the edge to find the shortest path.`;
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
  curRoomUI.uiText.innerHTML = `Please click on the edge to begin finding the shortest path.`;
  resetScene();
  updateNodeLabel(levelTitle, `Tutorial`, 0.9, 0.3, 0x212529);
  setUpTutorialModel();
};
