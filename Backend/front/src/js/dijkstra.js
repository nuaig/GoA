// ===== Import Section =====
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import {
  createRandomConnectedGraph,
  createSpecificGraphDijkstraTutorial,
} from "./../../utils/graphRelated/graph.js";
import { createThreePointLightingRoom } from "./../../utils/threePointLighting.js";
import { DijkstraAlgorithm } from "./../../utils/graphRelated/dijkstra.js";
import { GameSession } from "./../../utils/gameRelated/gameSession.js";
import { loadModel } from "./../../utils/threeModels.js";
import { GameStatusService } from "./../../utils/gameStatus/gameStatusService.js";
import {
  decrementHealth,
  resetHealth,
  resetStars,
  updateHintIcons,
} from "./../../utils/UI/ui.js";
import { shakeScreen } from "./../../utils/UI/animations.js";
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
} from "./../../utils/graphRelated/drawLine.js";
import GameRoomUI from "./../../utils/UI/gameRoomUI.js";
import { GameHelper } from "./../../utils/gameHelper.js";

// ===== Variable Decleration Section =====
const DEBUG_MODE = false;
let hintBooleans = {
  edgePressedWhenNodeExpected: false,
  nodePressedWhenEdgeExpected: false,
  wrongNodeSelected: false,
  wrongEdgeSelected: false,
  needToPressStarterNode: false,
  wrongWeightEntered: false,
  alreadyVisited: false,
};

const reArrangeButton = document.querySelector(".Rearrange-Action");
let curGameSession;
let currentLevel = 1;
let curNodes;
let curEdges;
let graph;
let clickBlockedUntil = 0;
let correctActionScoreAddition;
let currentlyHighlightedNodeIndex;
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
let curAlgorithmForGraph = new DijkstraAlgorithm(graph);
let onMouseMove;
let onClick;
let sceneLoadCount = 0;
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
let dungeonRoomMixer;
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
    explanation: "Node 0 is the source node. we start here.",
    expectedChests: [0],
    expectedEdges: null,
    errorMessage: "Incorrect! Please press on node 0.",
  },
  {
    instruction:
      "Step 1: Click on edge (0, 2). Type 1 in the input dialog, and press OK.",
    explanation:
      "Current distance from source to node 2 is ∞. Weight of edge (0, 2) = 1 < ∞, so new distance is 1.",
    expectedChests: null,
    expectedEdges: [[0, 2]],
    updatedDistance: { 2: 1 },
    errorMessage: "Click the edge (0, 2) to record the distance to node 2.",
  },
  {
    instruction:
      "Step 2: Click on edge (0, 1). Type 2 in the input dialog, and press OK.",
    explanation:
      "Current distance from source to node 1 is ∞. Weight of edge (0, 1) = 2 < ∞, so new distance is 2.",
    expectedChests: null,
    expectedEdges: [[0, 1]],
    updatedDistance: { 1: 2 },
    errorMessage: "Click the edge (0, 1) to update the distance to node 1.",
  },
  {
    instruction:
      "Step 3: Click on the unvisited node that has the shortest distance from source: node 2.",
    explanation:
      "Out of all unvisited nodes, node 2 has the shortest distance from source. So we visit it next.",
    expectedChests: [2],
    expectedEdges: null,
    errorMessage:
      "Incorrect! Click on node 2 — it's the nearest unvisited node.",
  },
  {
    instruction:
      "Step 4: Click on edge (2, 1). Type 2 in the input dialog, and press OK.",
    explanation:
      "We check path to node 1 via node 2. Distance to 2 = 1, edge weight = 3, so total = 1 + 3 = 4. 4 > current distance 2, so we keep 2.",
    expectedChests: null,
    expectedEdges: [[2, 1]],
    updatedDistance: { 1: 2 },
    errorMessage: "Click (2, 1) to compare if it's a better path to node 1.",
  },
  {
    instruction:
      "Step 5: Click on edge (2, 4). Type 7 in the input dialog, and press OK.",
    explanation:
      "We check path to node 4 via node 2. Distance to 2 = 1, edge weight = 6, so total = 1 + 6 = 7. Current distance is ∞, so we update to 7.",
    expectedChests: null,
    expectedEdges: [[2, 4]],
    updatedDistance: { 4: 7 },
    errorMessage: "Click (2, 4) to record the current distance to node 4.",
  },
  {
    instruction:
      "Step 6: Click on edge (2, 3). Type 3 in the input dialog, and press OK.",
    explanation:
      "We check path to node 3 via node 2. Distance to 2 = 1, edge weight = 2, so total = 1 + 2 = 3. Current distance is ∞, so we update to 3.",
    expectedChests: null,
    expectedEdges: [[2, 3]],
    updatedDistance: { 3: 3 },
    errorMessage: "Click (2, 3) to update the distance to node 3.",
  },
  {
    instruction:
      "Step 7: Click on the unvisited node that has the shortest distance from source: node 1.",
    explanation:
      "Out of all unvisited nodes, node 1 has the shortest distance from source. So we visit it next.",
    expectedChests: [1],
    expectedEdges: null,
    errorMessage: "Incorrect! Click on node 1 — it’s the next closest node.",
  },
  {
    instruction:
      "Step 8: Click on edge (1, 3). Type 3 in the input dialog, and press OK.",
    explanation:
      "We check path to node 3 via node 1. Distance to 1 = 2, edge weight = 3, so total = 2 + 3 = 5. 5 > current distance 3, so we keep 3.",
    expectedChests: null,
    expectedEdges: [[1, 3]],
    updatedDistance: { 3: 3 },
    errorMessage: "Click (1, 3) to evaluate its path to node 3.",
  },
  {
    instruction:
      "Step 9: Click on the unvisited node that has the shortest distance from source: node 3.",
    explanation:
      "Out of all unvisited nodes, node 3 has the shortest distance from source. So we visit it next.",
    expectedChests: [3],
    expectedEdges: null,
    errorMessage: "Incorrect! Click on node 3 to visit it next.",
  },
  {
    instruction:
      "Step 10: Click on edge (3, 4). Type 4 in the input dialog, and press OK.",
    explanation:
      "We check path to node 4 via node 3. Distance to 3 = 3, edge weight = 1, so total = 3 + 1 = 4. 4 < current distance 7, so we update to 4.",
    expectedChests: null,
    expectedEdges: [[3, 4]],
    updatedDistance: { 4: 4 },
    errorMessage: "Click (3, 4) to update the distance to node 4.",
  },
  {
    instruction:
      "Step 11: Click on the unvisited node that has the shortest distance from source: node 4.",
    explanation:
      "Out of all unvisited nodes, node 4 has the shortest distance from source. So we visit it next.",
    expectedChests: [4],
    expectedEdges: null,
    errorMessage: "Click on node 4 to complete Dijkstra’s algorithm.",
  },
];

// ===== Function Decleration Section =====
/*
 * This function prints only when in debug mode
 */
function debugPrint(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}
/*
 * Updates hint messages in the UI based on current boolean flags.
 * 1. If in tutorial mode, it checks the current step and displays either the visited message or a tutorial-specific error message.
 * 2. If not in tutorial mode, it checks various boolean flags (e.g., wrong node, wrong edge) and compiles appropriate messages.
 * 3. It then updates the DOM with the generated hints, showing or hiding the hint box accordingly.
 */
function updateHintsFromBooleans() {
  const hintElement = document.querySelector(".Hint-Text");
  debugPrint("Updating hints. Tutorial mode:", curRoomUI.isTutorial);

  // Handle tutorial mode
  if (curRoomUI.isTutorial) {
    const currentStep = tutorialSteps[curRoomUI.currentTutorialStep];
    debugPrint(
      "Current tutorial step:",
      curRoomUI.currentTutorialStep,
      currentStep
    );

    const showVisited = hintBooleans.alreadyVisited;
    const message = showVisited
      ? "This was already visited. Please choose the correct one!"
      : currentStep?.errorMessage?.trim();

    debugPrint("Tutorial mode message:", message);

    if (message) {
      hintElement.classList.remove("hidden");
      hintElement.innerHTML = `<li>${message}</li>`;
      debugPrint("Hint shown with message.");
    } else {
      hintElement.classList.add("hidden");
      hintElement.innerHTML = "";
      debugPrint("Hint hidden (no message).");
    }

    return;
  }

  // Handle non-tutorial mode
  const messages = [];

  if (hintBooleans.alreadyVisited) {
    messages.push("This was already visited. Please choose the correct one!");
    debugPrint("Hint: alreadyVisited");
  }
  if (hintBooleans.edgePressedWhenNodeExpected) {
    messages.push("Please select a node, not an edge.");
    debugPrint("Hint: edgePressedWhenNodeExpected");
  }
  if (hintBooleans.nodePressedWhenEdgeExpected) {
    messages.push("You need to select an edge, not a node.");
    debugPrint("Hint: nodePressedWhenEdgeExpected");
  }
  if (hintBooleans.wrongNodeSelected) {
    messages.push(
      "Choose the unvisited node that has the shortest distance from source."
    );
    debugPrint("Hint: wrongNodeSelected");
  }
  if (hintBooleans.wrongEdgeSelected) {
    messages.push("Select an unvisited edge connected to the current node!");
    debugPrint("Hint: wrongEdgeSelected");
  }
  if (hintBooleans.needToPressStarterNode) {
    messages.push("Please press on node 0 to begin.");
    debugPrint("Hint: needToPressStarterNode");
  }
  if (hintBooleans.wrongWeightEntered) {
    messages.push("The weight you entered is incorrect.");
    debugPrint("Hint: wrongWeightEntered");
  }

  if (messages.length > 0) {
    hintElement.classList.remove("hidden");
    hintElement.innerHTML = messages.map((msg) => `<li>${msg}</li>`).join("");
    debugPrint("Hints displayed:", messages);
  } else {
    hintElement.classList.add("hidden");
    hintElement.innerHTML = "";
    debugPrint("No hints to display. Hint element hidden.");
  }
}

/*
 * Updates tutorial UI with the current step.
 * 1. Gets the current step from `tutorialSteps` or `curAlgorithmForGraph.steps` depending on `isTutorial`.
 * 2. Updates DOM with step's instruction and explanation.
 */
function updateTutorialStep(isTutorial = true) {
  const step = isTutorial
    ? tutorialSteps[curRoomUI.currentTutorialStep]
    : curAlgorithmForGraph.steps[curRoomUI.currentTutorialStep];

  debugPrint(
    "[updateTutorialStep] Current Step Index:",
    curRoomUI.currentTutorialStep
  );
  debugPrint("[updateTutorialStep] Step Content:", step);

  // Update instruction text
  document.querySelector(".tuto-instruction-text").innerHTML = step.instruction;
  debugPrint("[updateTutorialStep] Instruction updated:", step.instruction);

  // Update explanation text
  document.querySelector(".tuto-explanation-text").innerHTML = step.explanation;
  debugPrint("[updateTutorialStep] Explanation updated:", step.explanation);
}

/*
 * Moves to the next tutorial step.
 * 1. Increments current step index.
 * 2. If all steps are done: shows completion modal, resets tutorial state.
 * 3. Otherwise: updates UI with the next step.
 */
function nextTutorialStep() {
  console.log("BEFORE:", curRoomUI.currentTutorialStep);
  const nextStepIndex = ++curRoomUI.currentTutorialStep;
  console.log("AFTER:", nextStepIndex);

  const stepLength = curRoomUI.isTutorial
    ? tutorialSteps.length
    : curAlgorithmForGraph.steps.length;

  debugPrint("[nextTutorialStep] Next Step Index:", nextStepIndex);
  debugPrint("[nextTutorialStep] Total Steps:", stepLength);

  const isComplete = nextStepIndex >= stepLength;
  if (isComplete) {
    debugPrint(
      "[nextTutorialStep] Tutorial complete. Showing modal and resetting state."
    );

    if (curRoomUI.isTutorial) {
      debugPrint("[nextTutorialStep] Triggering tutorial completion modal.");
      curRoomUI.updateTutorialModalToBeTutorialCompleteModal?.();
    } else {
      debugPrint(
        "[nextTutorialStep] Handling level completion via GameHelper."
      );
      GameHelper.handleLevelCompletion(
        curRoomUI,
        curGameSession,
        levelMaxScores[curRoomUI.currentLevel]
      );
    }
  } else {
    debugPrint("[nextTutorialStep] Proceeding to next tutorial step.");
    updateTutorialStep(curRoomUI.isTutorial);
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
    debugPrint(`[createModels] Creating model for node ${i}`);
    let position;

    if (i < fixed.length) {
      // Use fixed coordinates for predefined nodes (currently unused)
      position = new THREE.Vector3(fixed[i][0], fixed[i][1], fixed[i][2]);
      debugPrint(
        `[createModels] Using fixed position for node ${i}:`,
        position
      );
    } else {
      // Generate a valid random position that satisfies spatial constraints
      let validPosition = false;
      position = new THREE.Vector3();

      while (!validPosition) {
        const randomX = (Math.random() - 0.5) * gridSize;
        const randomZ = (Math.random() - 0.5) * gridSize;
        position.set(randomX, 0, randomZ);
        validPosition = true;

        // Check distance constraint with all existing chests
        for (let x = 0; x < chestList.length; x++) {
          const dist = chestList[x].position.distanceTo(position);
          if (dist < minDistance) {
            validPosition = false;
            debugPrint(
              `[createModels] Node ${i} too close to node ${x} (dist=${dist}). Retrying...`
            );
            break;
          }

          // Check triangle inequality with pairs of existing chests
          for (let y = x + 1; y < chestList.length; y++) {
            const satisfies = isTriangleInequalitySatisfied(
              chestList[x].position,
              chestList[y].position,
              position,
              margin
            );
            if (!satisfies) {
              validPosition = false;
              debugPrint(
                `[createModels] Triangle inequality failed for nodes ${x}, ${y}, and ${i}. Retrying...`
              );
              break;
            }
          }

          if (!validPosition) break;
        }
      }

      debugPrint(`[createModels] Random position for node ${i}:`, position);
    }

    // Load and place closed chest model
    const closedModel = await loadModel(closedChestURL.href, position, scene);
    closedModel.model.scale.set(2.5, 2.5, 2.5);
    chestList.push(closedModel.model);

    debugPrint(`[createModels] Closed chest added at node ${i}.`);

    // Load and place open chest model (initially hidden)
    const openModel = await loadModel(openChestURL.href, position, scene);
    openModel.model.scale.set(1.5, 1.5, 1.5);
    openModel.model.visible = false;
    openChestList.push(openModel.model);
    closedModel.model.userData.nodeIndex = i;
    openModel.model.userData.nodeIndex = i;
    debugPrint(`[createModels] Open chest (hidden) added at node ${i}.`);

    // Create a floating label above the chest
    const labelPosition = position.clone();
    labelPosition.y += 2.5;
    const chestLabel = createNodeLabel(`${i}`, labelPosition, scene);
    chestLabelList.push(chestLabel);
    debugPrint(`[createModels] Label created for node ${i}.`);
  }

  debugPrint("All models loaded. Final chestList:", chestList);

  // Draw lines between all chests to form the graph
  drawLines();
  debugPrint("[createModels] Lines drawn between chests.");
}

/*
 * Shows the tables in the beginning of the scene loading.
 * 1. Retrieves the "tables-container" element.
 * 2. Makes it visible by setting its display style to "block".
 */
function showTables() {
  const container = document.getElementById("tables-container");
  if (container) {
    container.style.display = "block";
    debugPrint("[showTables] Tables container is now visible.");
  } else {
    debugPrint("[showTables] Tables container not found.");
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
  sceneLoadCount++;
  if (sceneLoadCount > 1) {
    showTables();
  }
  debugPrint("[drawLines] Drawing lines between chests.");
  debugPrint("[drawLines] Graph edges:", graph.edges);

  const lines = [];
  graph.edges.forEach(([start, end, weight]) => {
    debugPrint(
      `[drawLines] Creating edge from node ${start} to ${end} with weight ${weight}`
    );
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

  onClick = function (event) {
    event.preventDefault();
    if (curRoomUI.isModalOpen || Date.now() < clickBlockedUntil) {
      debugPrint("[onClick] Ignored: modal is open or click is blocked.");
      return;
    }

    Object.keys(hintBooleans).forEach((key) => (hintBooleans[key] = false));

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const chestIntersects = raycaster.intersectObjects([...chestList]);
    const edgeIntersects = raycaster.intersectObjects([...edgeList, ...labels]);
    const intersectedEdge = edgeIntersects[0]?.object;

    const currentStep = curRoomUI.isTutorial
      ? tutorialSteps[curRoomUI.currentTutorialStep]
      : curAlgorithmForGraph.steps[curRoomUI.currentTutorialStep];

    // ========== NODE CLICK ==========
    if (chestIntersects.length > 0) {
      clickBlockedUntil = Date.now() + 400;

      // Traverse to find the clicked chest with nodeIndex
      let clickedChest = chestIntersects[0].object;
      while (clickedChest && clickedChest.userData.nodeIndex === undefined) {
        clickedChest = clickedChest.parent;
      }

      const index = clickedChest?.userData?.nodeIndex;
      if (typeof index !== "number") {
        console.warn(
          "[onClick] Could not resolve node index from clicked chest."
        );
        return;
      }

      debugPrint(`[onClick] Chest ${index} clicked.`);

      if (openChestList[index]?.userData?.clicked) {
        debugPrint(`[onClick] Node ${index} already visited.`);
        hintBooleans.alreadyVisited = true;
        updateHintsFromBooleans();
        GameHelper.handleWrongSelection(
          curRoomUI,
          "",
          curRoomUI.isTutorial,
          curGameSession
        );
        shakeScreen();
        return;
      }

      if (currentStep.expectedEdges) {
        debugPrint("[onClick] Expected an edge, not a node.");
        hintBooleans.nodePressedWhenEdgeExpected = true;
        updateHintsFromBooleans();
        GameHelper.handleWrongSelection(
          curRoomUI,
          "",
          curRoomUI.isTutorial,
          curGameSession
        );
        return;
      }

      if (Array.isArray(currentStep.expectedChests)) {
        const isAmbiguityStep = currentStep.expectedChests.length > 1;

        if (currentStep.expectedChests.includes(index)) {
          if (isAmbiguityStep && openChestList[index]?.userData?.clicked) {
            debugPrint("[onClick] Ambiguity step: node already visited.");
            return;
          }

          debugPrint(`[onClick] Correct node ${index} clicked.`);
          chestList[index].visible = false;
          openChestList[index].visible = true;
          openChestList[index].userData.clicked = true;

          // ====== CONDITIONAL HIGHLIGHTING ======
          const cell = document.getElementById(`distance-${index}`);
          if (cell) {
            if (
              currentlyHighlightedNodeIndex !== null &&
              currentlyHighlightedNodeIndex !== index
            ) {
              const prevCell = document.getElementById(
                `distance-${currentlyHighlightedNodeIndex}`
              );
              if (prevCell) {
                prevCell.classList.remove("current-node-cell");
                prevCell.classList.add("visited-node-cell");
              }
            }

            cell.classList.add("current-node-cell");
            cell.classList.remove("visited-node-cell");
            currentlyHighlightedNodeIndex = index;
          } else {
            console.warn(`[Highlight] Could not find cell for node ${index}`);
          }
          // ====== END HIGHLIGHTING ======

          Object.keys(hintBooleans).forEach(
            (key) => (hintBooleans[key] = false)
          );
          document.querySelector(".Hint-Text").classList.add("hidden");

          curRoomUI.uiText.innerText = "Relax the edges of this node! If there are no unvisited edges, visit another node";
          curAlgorithmForGraph.resumeFromNode(index);

          setTimeout(() => nextTutorialStep(), 500);
        } else {
          debugPrint("[onClick] Wrong node clicked.");
          if (currentStep.expectedChests.includes(0)) {
            hintBooleans.needToPressStarterNode = true;
          } else {
            hintBooleans.wrongNodeSelected = true;
          }
          updateHintsFromBooleans();
          GameHelper.handleWrongSelection(
            curRoomUI,
            "",
            curRoomUI.isTutorial,
            curGameSession
          );
          shakeScreen();
        }
        return;
      }
    }

    // ========== EDGE CLICK WHEN NODE EXPECTED ==========
    if (
      Array.isArray(currentStep.expectedChests) &&
      intersectedEdge?.userData?.edge
    ) {
      clickBlockedUntil = Date.now() + 400;
      if (currentStep.expectedChests.includes(0)) {
        hintBooleans.needToPressStarterNode = true;
      } else {
        hintBooleans.edgePressedWhenNodeExpected = true;
      }
      updateHintsFromBooleans();
      GameHelper.handleWrongSelection(
        curRoomUI,
        "",
        curRoomUI.isTutorial,
        curGameSession
      );
      return;
    }

    // ========== TUTORIAL EDGE CLICK ==========
    if (
      curRoomUI.isTutorial &&
      currentStep.expectedEdges &&
      intersectedEdge?.userData?.edge
    ) {
      clickBlockedUntil = Date.now() + 400;
      const { start, end } = intersectedEdge.userData.edge;
      const expectedEdges = currentStep.expectedEdges;

      const isExpected = expectedEdges.some(
        ([e0, e1]) =>
          (start === e0 && end === e1) || (start === e1 && end === e0)
      );

      if (!isExpected) {
        hintBooleans.wrongEdgeSelected = true;
        updateHintsFromBooleans();
        curRoomUI.uiText.innerText = "";
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

      if (alreadySelected) {
        hintBooleans.alreadyVisited = true;
        updateHintsFromBooleans();
        GameHelper.handleWrongSelection(
          curRoomUI,
          "",
          curRoomUI.isTutorial,
          curGameSession
        );
        shakeScreen();
        return;
      }

      selectedEdgesThisStep.push([start, end]);

      const allSelected = expectedEdges.every(([e0, e1]) =>
        selectedEdgesThisStep.some(
          ([s0, s1]) => (s0 === e0 && s1 === e1) || (s0 === e1 && s1 === e0)
        )
      );

      if (allSelected) {
        selectedEdgesThisStep = [];
        Object.keys(hintBooleans).forEach((key) => (hintBooleans[key] = false));
        document.querySelector(".Hint-Text").classList.add("hidden");
        curRoomUI.uiText.innerText = "Visit a new node!";
        showInputDialog();
      }
      return;
    }

    // ========== REGULAR EDGE CLICK ==========
    if (
      !curRoomUI.isTutorial &&
      currentStep.expectedEdges &&
      intersectedEdge?.userData?.edge
    ) {
      clickBlockedUntil = Date.now() + 400;
      const { start, end } = intersectedEdge.userData.edge;
      const expectedEdges = currentStep.expectedEdges;

      const found = expectedEdges.find(
        ({ edge: [e0, e1] }) =>
          (start === e0 && end === e1) || (start === e1 && end === e0)
      );

      if (found) {
        const alreadyChosen = selectedEdgesThisStep.some(
          ([x, y]) => (x === start && y === end) || (x === end && y === start)
        );

        if (alreadyChosen) {
          hintBooleans.alreadyVisited = true;
          updateHintsFromBooleans();
          GameHelper.handleWrongSelection(
            curRoomUI,
            "",
            curRoomUI.isTutorial,
            curGameSession
          );
          shakeScreen();
          return;
        }

        selectedEdgesThisStep.push([start, end]);

        const [src, dst] = found.edge;
        curRoomUI.selectedEdgeForInput = {
          start: src,
          end: dst,
          weight: found.weight,
        };

        curRoomUI.inputCompleted = false;
        showInputDialog();

        const allChosen =
          selectedEdgesThisStep.length === currentStep.expectedEdges.length;

        if (allChosen) {
          Object.keys(hintBooleans).forEach(
            (key) => (hintBooleans[key] = false)
          );
          document.querySelector(".Hint-Text").classList.add("hidden");
          curRoomUI.uiText.innerText = "Visit a new node!";
          curRoomUI.readyForNextStep = true;
        }
      } else {
        hintBooleans.wrongEdgeSelected = true;
        updateHintsFromBooleans();
        GameHelper.handleWrongSelection(
          curRoomUI,
          "",
          curRoomUI.isTutorial,
          curGameSession
        );
      }
    }
  };

  curRoomUI.callbacks.onMouseMove = onMouseMove;
  curRoomUI.callbacks.onClick = onClick;

  debugPrint("[drawLines] Mouse callbacks set:", curRoomUI.callbacks);

  curRoomUI.enableMouseEventListeners_K_P();
}

/*
 * Updates the camera and renderer dimensions when the window is resized.
 * Ensures the 3D scene maintains correct aspect ratio and fills the screen.
 */
function onWindowResize() {
  debugPrint(
    "[onWindowResize] Window resized:",
    window.innerWidth,
    window.innerHeight
  );

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  debugPrint("[onWindowResize] Camera aspect ratio updated:", camera.aspect);

  renderer.setSize(window.innerWidth, window.innerHeight);
  debugPrint("[onWindowResize] Renderer size set.");
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

  mixers.forEach((mixer, index) => {
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
  if (!tableBody) {
    console.warn("[updateEdgeTable] Table body not found.");
    return;
  }

  debugPrint("[updateEdgeTable] Populating table with edges:", edges);

  tableBody.innerHTML = ""; // Clear existing rows
  edges.forEach(([from, to, weight], index) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${from}</td><td>${to}</td><td>${weight}</td>`;
    tableBody.appendChild(row);
    debugPrint(
      `[updateEdgeTable] Added row ${index}: [${from}, ${to}, ${weight}]`
    );
  });

  debugPrint("[updateEdgeTable] Edge table update complete.");
}

/*
 * Rotates all labels and rings to always face the camera.
 * Keeps chest, edge, and ring labels readable during movement.
 */
function updateLabelRotation() {
  chestLabelList.forEach((label, i) => {
    label.lookAt(camera.position);
  });

  edgeLabelList.forEach((label, i) => {
    label.lookAt(camera.position);
  });

  ringList.forEach((label, i) => {
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
  debugPrint(
    "[createDungeonRoom] Loading dungeon model at position:",
    position
  );

  try {
    const { model, mixer, action } = await loadModel(
      dungeonRoomURL.href,
      position,
      scene,
      mixers
    );

    debugPrint("[createDungeonRoom] Dungeon model loaded.");

    if (mixer && action) {
      dungeonRoomMixer = mixer;
      dungeonRoomAction = action;

      debugPrint(
        "[createDungeonRoom] Mixer and action initialized:",
        dungeonRoomMixer,
        dungeonRoomAction
      );

      dungeonRoomAction.timeScale = 0.25;
      dungeonRoomAction.setLoop(THREE.LoopOnce);
      dungeonRoomAction.clampWhenFinished = true;
      dungeonRoomAction.paused = false;
    } else {
      debugPrint("[createDungeonRoom] Mixer or action is undefined.");
    }

    model.scale.set(1.5, 1.5, 1.5);
    debugPrint("[createDungeonRoom] Model scaled to (1.5, 1.5, 1.5).");
  } catch (error) {
    console.error("[createDungeonRoom] Error loading dungeon room:", error);
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
  debugPrint("[resetScene] Starting scene reset.");

  // Remove and dispose chest models
  chestList.forEach((chest, i) => {
    scene.remove(chest);
    if (chest.geometry) chest.geometry.dispose();
    if (chest.material) chest.material.dispose();
    debugPrint(`[resetScene] Removed closed chest ${i}`);
  });

  openChestList.forEach((chest, i) => {
    scene.remove(chest);
    if (chest.geometry) chest.geometry.dispose();
    if (chest.material) chest.material.dispose();
    debugPrint(`[resetScene] Removed open chest ${i}`);
  });

  // Remove and dispose node labels
  chestLabelList.forEach((label, i) => {
    scene.remove(label);
    if (label.geometry) label.geometry.dispose();
    if (label.material) label.material.dispose();
    debugPrint(`[resetScene] Removed chest label ${i}`);
  });

  // Remove and dispose edge lines
  edgeList.forEach((edge, i) => {
    scene.remove(edge);
    if (edge.geometry) edge.geometry.dispose();
    if (edge.material) edge.material.dispose();
    debugPrint(`[resetScene] Removed edge line ${i}`);
  });

  // Remove and dispose edge labels
  edgeLabelList.forEach((label, i) => {
    scene.remove(label);
    if (label.geometry) label.geometry.dispose();
    if (label.material) label.material.dispose();
    debugPrint(`[resetScene] Removed edge label ${i}`);
  });

  // Remove and dispose selection rings
  ringList.forEach((ring, i) => {
    scene.remove(ring);
    if (ring.geometry) ring.geometry.dispose();
    if (ring.material) ring.material.dispose();
    debugPrint(`[resetScene] Removed selection ring ${i}`);
  });

  // Clear arrays
  chestList.length = 0;
  openChestList.length = 0;
  chestLabelList.length = 0;
  edgeList.length = 0;
  edgeLabelList.length = 0;
  ringList.length = 0;
  debugPrint("[resetScene] Cleared all model and label lists.");

  // Disable interaction handlers
  curRoomUI.disableMouseEventListeners_K_P();
  curRoomUI.onMouseMove = null;
  curRoomUI.onClick = null;
  debugPrint("[resetScene] Disabled mouse event listeners.");

  // Remove sphere indicator and free its resources
  if (sphereInter) {
    scene.remove(sphereInter);
    sphereInter.geometry.dispose();
    sphereInter.material.dispose();
    debugPrint("[resetScene] Removed sphere indicator.");
  }

  // Reset UI and color tracking
  hoverRing.visible = false;
  usedColors.clear();
  debugPrint("[resetScene] Reset color usage and hover ring visibility.");

  // Reset score and visual star indicators
  curRoomUI.updateScore(0);
  resetStars();
  debugPrint("[resetScene] Score reset and stars cleared.");

  selectedEdgesThisStep = [];
  curRoomUI.selectedEdgeForInput = null;

  curNodes.forEach((node) => {
    const cell = document.getElementById(`distance-${node}`);
    if (cell) {
      cell.classList.remove("visited-node-cell");
      debugPrint(`[resetScene] Cleared visited class for node ${node}`);
    }
  });

  debugPrint("[resetScene] Scene reset complete.");
}

/*
 * Creates and adds hover visual elements to the scene.
 * Includes a red sphere for edge intersections and a black ring for label highlights.
 */
function createHoverElements() {
  // Create red sphere for edge hover intersections
  const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  sphereInter = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereInter.visible = false;
  scene.add(sphereInter);
  debugPrint(
    "[createHoverElements] Red hover sphere created and added to scene."
  );

  // Create black ring for label highlights
  hoverRing = createRing(0.8, 0.9, labelDepth, 0x000000);
  hoverRing.visible = false;
  scene.add(hoverRing);
  debugPrint(
    "[createHoverElements] Black hover ring created and added to scene."
  );
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

  debugPrint(`[setUpGameModel] Setting up level ${currentLevel}`);

  const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
  curNodes = Array.from({ length: numNodes }, (_, i) => i);
  curEdges = numEdges;

  debugPrint(
    `[setUpGameModel] Number of nodes: ${numNodes}, edges: ${numEdges}`
  );
  debugPrint(`[setUpGameModel] Nodes array:`, curNodes);

  correctActionScoreAddition = Math.floor(
    levelMaxScores[currentLevel] / (numNodes - 1)
  );
  debugPrint(
    `[setUpGameModel] Score per correct action: ${correctActionScoreAddition}`
  );

  graph = createRandomConnectedGraph(curNodes, curEdges);
  debugPrint("[setUpGameModel] Random connected graph generated:", graph);

  updateEdgeTable(graph.edges);
  debugPrint("[setUpGameModel] Edge table updated.");

  initializeDistanceTable(graph.nodes);
  debugPrint("[setUpGameModel] Distance table initialized.");

  // Assign algorithm for early levels
  if (curRoomUI.currentLevel <= 3) {
    curAlgorithmForGraph = new DijkstraAlgorithm(graph);
    curRoomUI.currentAlgorithm = "Dijkstra";
    debugPrint("[setUpGameModel] Dijkstra algorithm assigned for this level.");
  }

  createModels();
  debugPrint("[setUpGameModel] Models created.");

  createHoverElements();
  debugPrint("[setUpGameModel] Hover elements created.");
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
    console.warn(
      "[initializeDistanceTable] Table body element not found: #distance-table-body"
    );
    return;
  }

  debugPrint("[initializeDistanceTable] Initializing table with nodes:", nodes);

  tableBody.innerHTML = ""; // Clear any old rows

  nodes.forEach((node, index) => {
    const row = document.createElement("tr");

    const nodeCell = document.createElement("td");
    nodeCell.textContent = index;

    const distCell = document.createElement("td");
    distCell.textContent = index === 0 ? "0" : "∞";
    distCell.id = `distance-${index}`;

    row.appendChild(nodeCell);
    row.appendChild(distCell);
    tableBody.appendChild(row);

    debugPrint(
      `[initializeDistanceTable] Row added for node ${index} with initial distance: ${distCell.textContent}`
    );
  });

  debugPrint(
    "[initializeDistanceTable] Distance table initialization complete."
  );
}

/*
 * Sets up the specific graph and UI for the Dijkstra tutorial mode.
 *
 * 1. Loads a predefined tutorial graph.
 * 2. Initializes algorithm, tables, and visuals for the tutorial.
 */
function setUpTutorialModel() {
  debugPrint("[setUpTutorialModel] Setting up Dijkstra tutorial model...");

  graph = createSpecificGraphDijkstraTutorial();
  debugPrint("[setUpTutorialModel] Tutorial graph created:", graph);

  curNodes = graph.nodes;
  curAlgorithmForGraph = new DijkstraAlgorithm(graph);
  curRoomUI.currentAlgorithm = "Dijkstra";
  debugPrint("[setUpTutorialModel] Dijkstra algorithm initialized and set.");

  updateEdgeTable(graph.edges);
  debugPrint("[setUpTutorialModel] Edge table updated.");

  initializeDistanceTable(graph.nodes);
  debugPrint("[setUpTutorialModel] Distance table initialized.");

  createModels();
  debugPrint("[setUpTutorialModel] Models created.");

  createHoverElements();
  debugPrint("[setUpTutorialModel] Hover elements created.");
}

/*
 * Displays the input dialog and backdrop.
 * Sets modal state to prevent interactions with the underlying scene.
 */
function showInputDialog() {
  document.getElementById("input-dialog").style.display = "block";
  document.getElementById("input-backdrop").style.display = "block";
  const dialog = document.getElementById("input-dialog");
  dialog.style.bottom = curRoomUI.isTutorial ? "280px" : "380px";
  debugPrint("[showInputDialog] Input dialog and backdrop displayed.");

  // Prevent interactions underneath
  curRoomUI.isModalOpen = true;
  debugPrint("[showInputDialog] Modal state set to true.");

  const input = document.getElementById("dialog-input");
  input.focus();
  debugPrint("[showInputDialog] Input field focused.");
}

/*
 * Validates user input from the tutorial dialog.
 *
 * 1. If a distance update is expected, checks correctness and updates UI/state.
 * 2. Marks the related edge as selected and visually updates it if valid.
 * 3. Closes the dialog and advances the tutorial if appropriate.
 */
function closeInputDialog() {
  debugPrint("[closeInputDialog] Closing input dialog...");
  Object.keys(hintBooleans).forEach((key) => (hintBooleans[key] = false));

  const inputValue = document.getElementById("dialog-input").value.trim();
  let isCorrect = false;

  if (curRoomUI.isTutorial) {
    const currentStep = tutorialSteps[curRoomUI.currentTutorialStep];
    const expected = currentStep.updatedDistance;
    const selectedEdge = currentStep.expectedEdges?.[0];

    debugPrint("[closeInputDialog] Tutorial mode. Current step:", currentStep);

    if (expected) {
      const [node, correctValue] = Object.entries(expected)[0];

      if (inputValue === correctValue.toString()) {
        debugPrint(`[closeInputDialog] Correct input received: ${inputValue}`);
        isCorrect = true;

        const cell = document.getElementById(`distance-${node}`);
        if (cell) {
          cell.textContent = correctValue;
          debugPrint(
            `[closeInputDialog] Updated distance cell for node ${node}`
          );
        }

        if (selectedEdge) {
          const selectedLine = edgeList.find((line) => {
            const edge = line.userData?.edge;
            return (
              edge &&
              ((edge.start === selectedEdge[0] &&
                edge.end === selectedEdge[1]) ||
                (edge.start === selectedEdge[1] &&
                  edge.end === selectedEdge[0]))
            );
          });

          if (selectedLine) {
            selectedLine.userData.selected = true;
            selectedLine.material.color.set(0x800080);
            if (selectedLine.userData.label) {
              selectedLine.userData.label.material.color.set(0x000000);
            }
            debugPrint("[closeInputDialog] Selected edge marked as visited.");
          }
        }
      } else {
        console.warn(
          `[closeInputDialog] Incorrect input: ${inputValue}, expected: ${correctValue}`
        );
      }
    }

    if (isCorrect) {
      Object.keys(hintBooleans).forEach((key) => (hintBooleans[key] = false));
      document.querySelector(".Hint-Text").classList.add("hidden");

      nextTutorialStep();
      document.getElementById("input-dialog").style.display = "none";
      document.getElementById("input-backdrop").style.display = "none";
      document.getElementById("dialog-input").value = "";
      curRoomUI.isModalOpen = false;
      debugPrint(
        "[closeInputDialog] Correct input — proceeding to next tutorial step."
      );
    } else {
      hintBooleans.wrongWeightEntered = true;
      updateHintsFromBooleans();

      if (currentStep.advanceOnError === true) {
        debugPrint(
          "[closeInputDialog] Incorrect input, but advancing due to advanceOnError=true."
        );
        setTimeout(() => nextTutorialStep(), 1000);
      } else {
        debugPrint("[closeInputDialog] Incorrect input — prompting retry.");
        curRoomUI.uiText.innerText = "Incorrect input. Try again.";
        shakeScreen?.();
        return;
      }
    }
  } else {
    const selected = curRoomUI.selectedEdgeForInput;
    if (!selected) {
      console.warn("[closeInputDialog] No selected edge found.");
      return;
    }

    const inputWeight = parseInt(inputValue, 10);
    if (inputWeight === selected.weight) {
      debugPrint("[closeInputDialog] Correct weight entered:", inputWeight);

      if (curRoomUI.uiText.innerText !== "Visit a new node!") {
        curRoomUI.uiText.innerText = "Correct!";
      }

      const targetNode = selected.end;
      const cell = document.getElementById(`distance-${targetNode}`);
      if (cell) {
        cell.textContent = inputWeight;
        debugPrint(
          `[closeInputDialog] Updated distance cell for node ${targetNode}`
        );
      }

      const selectedLine = edgeList.find((line) => {
        const edge = line.userData?.edge;
        return (
          edge &&
          ((edge.start === selected.start && edge.end === selected.end) ||
            (edge.start === selected.end && edge.end === selected.start))
        );
      });

      if (selectedLine) {
        selectedLine.userData.selected = true;
        selectedLine.material.color.set(0x800080);
        if (selectedLine.userData.label) {
          selectedLine.userData.label.material.color.set(0x000000);
        }
        debugPrint(
          "[closeInputDialog] Selected edge visually marked as completed."
        );
      }

      Object.keys(hintBooleans).forEach((key) => (hintBooleans[key] = false));
      document.querySelector(".Hint-Text").classList.add("hidden");

      curRoomUI.selectedEdgeForInput = null;
      curRoomUI.inputCompleted = true;
      document.getElementById("input-dialog").style.display = "none";
      document.getElementById("input-backdrop").style.display = "none";
      document.getElementById("dialog-input").value = "";
      curRoomUI.isModalOpen = false;

      if (curRoomUI.readyForNextStep) {
        debugPrint(
          "[closeInputDialog] Advancing to next step after correct input."
        );
        nextTutorialStep();
        curRoomUI.readyForNextStep = false;
        selectedEdgesThisStep = [];
      }
    } else {
      console.warn("[closeInputDialog] Incorrect weight entered:", inputWeight);
      hintBooleans.wrongWeightEntered = true;
      updateHintsFromBooleans();

      GameHelper.handleWrongSelection(
        curRoomUI,
        "",
        curRoomUI.isTutorial,
        curGameSession
      );

      selectedEdgesThisStep = selectedEdgesThisStep.filter(
        ([s0, s1]) =>
          !(
            (s0 === selected.start && s1 === selected.end) ||
            (s0 === selected.end && s1 === selected.start)
          )
      );

      document.getElementById("input-dialog").style.display = "none";
      document.getElementById("input-backdrop").style.display = "none";
      document.getElementById("dialog-input").value = "";
      curRoomUI.isModalOpen = false;

      curRoomUI.uiText.innerText = "Incorrect input. Try again.";
      shakeScreen?.();
      return;
    }
  }

  clickBlockedUntil = Date.now() + 400;
  debugPrint("[closeInputDialog] Input locked for 400ms to prevent spamming.");
}

/// ===== Document Object Model & User Session Initialization Section =====
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("dialog-input");
  const okBtn = document.getElementById("dialog-ok-btn");

  // Clicking OK button
  okBtn.onclick = closeInputDialog;

  // Pressing Enter in the input field
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Optional: prevent default form behavior
      okBtn.click(); // Simulate click on OK button
    }
  });
});

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch("/api/users/getUser", {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const userData = await response.json();
      debugPrint("User is logged in:", userData);

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
  debugPrint("Rearrange Button Clicked");
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

  debugPrint(edgeList[0].userData.startCube);

  // Update the positions of the lines and their labels
  edgeList.forEach((line, index) => {
    debugPrint(graph.edges[index]);
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

document.getElementById("dialog-input").addEventListener("keydown", (e) => {
  e.stopPropagation(); // stop bubbling to global listeners
});

// ===== Scene Initialization Section =====
createThreePointLightingRoom(scene);
window.addEventListener("resize", onWindowResize, false);
window.closeInputDialog = closeInputDialog;
animate();
createDungeonRoom();

// ===== UI Callbacks Section =====
curRoomUI.callbacks.resetLevel = function (curlvl) {
  curRoomUI.uiText.innerHTML = `Start by selecting the source node (Node 0), then relax all edges going out of this node!`;
  curRoomUI.health = resetHealth();
  document.querySelector(".Hint-Text").classList.add("hidden");
  curRoomUI.closeCompletionModal();
  curRoomUI.pseudoModalClose();
  curRoomUI.currentTutorialStep = 0;
  resetScene();
  setUpGameModel(curlvl);
  updateNodeLabel(levelTitle, `Level ${curlvl}`, 0.9, 0.3, 0x212529);
  currentlyHighlightedNodeIndex = null;
  curGameSession.resetGameSession(
    curRoomUI.gameName,
    curRoomUI.currentLevel,
    curRoomUI.currentMode
  );
};

curRoomUI.callbacks.startTutorial = function () {
  currentlyHighlightedNodeIndex = null;
  curRoomUI.currentTutorialStep = 0;
  updateTutorialStep();
  curRoomUI.uiText.innerHTML = `Please follow the steps shown in the tutorial window.`;
  resetScene();
  updateNodeLabel(levelTitle, `Tutorial`, 0.9, 0.3, 0x212529);
  setUpTutorialModel();
};
