/**
 * A* Algorithm game room: 3D scene, tutorial, and regular play.
 * Handles graph setup, chest/edge interaction, input dialog for f(n), and UI tables (g/h/f).
 */
// ===== Import Section =====
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import {
  createRandomConnectedGraph,
  createSpecificGraphAstarTutorial,
} from "../../utils/graphRelated/graph.js";
import { createThreePointLightingRoom } from "../../utils/threePointLighting.js";
import { DijkstraAlgorithm } from "./../../utils/graphRelated/dijkstra.js";
import { AstarAlgorithm } from "./../../utils/graphRelated/Astar.js";
import { GameSession } from "../../utils/gameRelated/gameSession.js";
import { loadModel } from "../../utils/threeModels.js";
import { GameStatusService } from "../../utils/gameStatus/gameStatusService.js";
import { resetHealth, resetStars } from "../../utils/UI/ui.js";
import { shakeScreen } from "../../utils/UI/animations.js";
import {
  drawLine,
  updateLinePosition,
  isTriangleInequalitySatisfied,
  setFont,
  createNodeLabel,
  createLabelSolidCircle,
  updateNodeLabel,
  createRing,
} from "../../utils/graphRelated/drawLine.js";
import GameRoomUI from "../../utils/UI/gameRoomUI.js";
import { GameHelper } from "../../utils/gameHelper.js";

// ===== Variable Declaration Section =====
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

const slidesButton = document.querySelector("#button-algo-slides");
const reArrangeButton = document.querySelector(".Rearrange-Action");
let curGameSession;
let currentLevel = 1;
let curNodes;
let curEdges;
let graph;
let clickBlockedUntil = 0;
let currentlyHighlightedNodeIndex;
const priorityQueueState = new Map();
const settledGState = [];
let pendingCandidateDecision = null;
let transientQueueEntries = [];
let currentSettledNode = null;
let lastDialogSubmitAt = 0;
let suppressInputDialogUntil = 0;
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
let curAlgorithmForGraph;
let onMouseMove;
let onClick;
let sceneLoadCount = 0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0x000);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const closedChestURL = new URL(
  "../../public/models/Prop_Chest_Closed.gltf",
  import.meta.url,
);
const openChestURL = new URL(
  "../../public/models/Prop_Chest_Gold.gltf",
  import.meta.url,
);
const dungeonRoomURL = new URL(
  "../../public/models/DungeonRoom_Kruskal_and_Prim.glb",
  import.meta.url,
);
let chestList = [];
let openChestList = [];
let selectedEdgesThisStep = [];
let chestLabelList = [];
let chestLabelBackgroundList = [];
let edgeList = [];
let edgeLabelList = [];
let edgeLabelBackgroundList = [];
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
const curRoomUI = new GameRoomUI("Astar", 1, camera);
let correctActionScoreAddition = Math.floor(
  levelMaxScores[curRoomUI.currentLevel] /
    (levelConfig[curRoomUI.currentLevel].nodes - 1),
);
const fontLoader = new FontLoader();
let font;
let levelTitle;
const labelDepth = 0.1;
const labelChestColor = 0x242a3b;
const labelChesteSize = 1;
let hoverRing = createRing(0.8, 0.9, labelDepth, 0x000000);
scene.add(hoverRing);
let raycaster;
const clock = new THREE.Clock();

// Steps for the A* tutorial
const tutorialSteps = [
  {
    instruction: "Step 0: Click on node S to begin.",
    explanation: "Start node S. g(S)=0. With h(n)=0, A* behaves like Dijkstra.",
    expectedChests: [0],
    expectedEdges: null,
    errorMessage: "Click node S.",
  },
  {
    instruction: "Step 1: Click edge (S,2). Enter 1.",
    explanation: "g(2)=1. Node 2 enters the open set.",
    expectedChests: null,
    expectedEdges: [[0, 2]],
    updatedDistance: { 2: 1 },
    errorMessage: "Click edge (S,2).",
  },
  {
    instruction: "Step 2: Click edge (S,1). Enter 2.",
    explanation: "g(1)=2. Node 1 enters the open set.",
    expectedChests: null,
    expectedEdges: [[0, 1]],
    updatedDistance: { 1: 2 },
    errorMessage: "Click edge (S,1).",
  },
  {
    instruction: "Step 3: Click node 2 (smallest f).",
    explanation: "Node 2 has the smallest f (same as g since h=0).",
    expectedChests: [2],
    expectedEdges: null,
    errorMessage: "Click node 2.",
  },
  {
    instruction: "Step 4: Click edge (2,3). Enter 3.",
    explanation: "g(3)=g(2)+2=3. Add node 3.",
    expectedChests: null,
    expectedEdges: [[2, 3]],
    updatedDistance: { 3: 3 },
    errorMessage: "Click edge (2,3).",
  },
  {
    instruction: "Step 5: Click edge (2,G). Enter 4.",
    explanation: "g(G)=g(2)+3=4. Add goal node G.",
    expectedChests: null,
    expectedEdges: [[2, 4]],
    updatedDistance: { 4: 4 },
    errorMessage: "Click edge (2,G).",
  },
  {
    instruction: "Step 6: Click edge (2,1). Enter 4.",
    explanation: "Candidate g(1)=g(2)+3=4 from edge (2,1) but g(1)=2 from edge (S,1).",
    expectedChests: null,
    expectedEdges: [[2, 1]],
    updatedDistance: { 1: 4 },
    errorMessage: "Click edge (2,1).",
  },
  {
    instruction: "Step 7: Click node 1.",
    explanation: "After Step 6, node 1 still has the smallest value in the queue (g=2), so we visit node 1 next.",
    expectedChests: [1],
    expectedEdges: null,
    errorMessage: "Click node 1.",
  },
  {
    instruction: "Step 8: Click edge (1,3). Enter 6.",
    explanation: "From node 1, going to node 3 gives candidate g(3)=6, while we already have g(3)=3 from node 2.",
    expectedChests: null,
    expectedEdges: [[1, 3]],
    updatedDistance: { 3: 6 },
    errorMessage: "Click edge (1,3).",
  },
  {
    instruction: "Step 10: Click node 3.",
    explanation: "After comparing candidates, node 3 is still the smallest remaining value in the queue (g=3), so we visit node 3.",
    expectedChests: [3],
    expectedEdges: null,
    errorMessage: "Click node 3.",
  },
  {
    instruction: "Step 11: Click edge (3,G). Enter 4.",
    explanation: "From node 3 to node G, candidate g(G)=4. Compare it with current g(G)=4 and keep 4.",
    expectedChests: null,
    expectedEdges: [[3, 4]],
    updatedDistance: { 4: 4 },
    errorMessage: "Click edge (3,G).",
  },
  {
    instruction: "Step 12: Click node G (goal).",
    explanation: "Now node G is next with g(G)=4, and it is the goal. Stop.",
    expectedChests: [4],
    expectedEdges: null,
    errorMessage: "Click node G.",
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
      currentStep,
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
    messages.push("Choose the unvisited node with the smallest f(n) value.");
    debugPrint("Hint: wrongNodeSelected");
  }
  if (hintBooleans.wrongEdgeSelected) {
    messages.push("Select an unvisited edge connected to the current node!");
    debugPrint("Hint: wrongEdgeSelected");
  }
  if (hintBooleans.needToPressStarterNode) {
    messages.push("Please press on node S to begin.");
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
    curRoomUI.currentTutorialStep,
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
  const nextStepIndex = ++curRoomUI.currentTutorialStep;

  const stepLength = curRoomUI.isTutorial
    ? tutorialSteps.length
    : curAlgorithmForGraph.steps.length;

  debugPrint("[nextTutorialStep] Next Step Index:", nextStepIndex);
  debugPrint("[nextTutorialStep] Total Steps:", stepLength);

  const isComplete = nextStepIndex >= stepLength;
  if (isComplete) {
    debugPrint(
      "[nextTutorialStep] Tutorial complete. Showing modal and resetting state.",
    );

    if (curRoomUI.isTutorial) {
      debugPrint("[nextTutorialStep] Triggering tutorial completion modal.");
      curRoomUI.updateTutorialModalToBeTutorialCompleteModal?.();
    } else {
      debugPrint(
        "[nextTutorialStep] Handling level completion via GameHelper.",
      );
      completeLevelWithHeuristicComparison();
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
        position,
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
              `[createModels] Node ${i} too close to node ${x} (dist=${dist}). Retrying...`,
            );
            break;
          }

          // Check triangle inequality with pairs of existing chests
          for (let y = x + 1; y < chestList.length; y++) {
            const satisfies = isTriangleInequalitySatisfied(
              chestList[x].position,
              chestList[y].position,
              position,
              margin,
            );
            if (!satisfies) {
              validPosition = false;
              debugPrint(
                `[createModels] Triangle inequality failed for nodes ${x}, ${y}, and ${i}. Retrying...`,
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

    graph.nodePositions ??= {};
    graph.nodePositions[i] = {
      x: position.x,
      y: position.y,
      z: position.z,
    };

    // Create a floating label above the chest
    const labelPosition = position.clone();
    labelPosition.y += 2.5;
    let labelText;

    if (i === graph.startNode) {
      labelText = "S";
    } else if (i === graph.goalNode) {
      labelText = "G";
    } else {
      labelText = `${i}`;
    }

    const chestLabel = createNodeLabel(labelText, labelPosition, scene);
    chestLabelList.push(chestLabel);
    const chestLabelBackground = createLabelSolidCircle(
      labelPosition,
      labelChesteSize,
      labelChestColor,
      scene,
    );
    chestLabelBackgroundList.push(chestLabelBackground);
    debugPrint(`[createModels] Label created for node ${i}.`);
  }

  debugPrint("All models loaded. Final chestList:", chestList);

  // Draw lines between all chests to form the graph
  drawLines();
  debugPrint("[createModels] Lines drawn between chests.");
}

/*
 * Shows the priority queue panel in the beginning of scene loading.
 * 1. Retrieves the queue container element.
 * 2. Makes it visible by setting its display style to "block".
 */
function showPriorityQueue() {
  const wrapper = document.getElementById("astar-tables-wrapper");
  if (!wrapper) {
    debugPrint("[showPriorityQueue] Queue container not found.");
    return;
  }

  // UI-only difficulty ramp: hide all tables in regular level 3.
  const shouldHideAllTables = !curRoomUI.isTutorial && curRoomUI.currentLevel === 3;
  if (shouldHideAllTables) {
    wrapper.style.display = "none";
    return;
  }

  wrapper.style.display = "flex";
  debugPrint("[showPriorityQueue] Queue container is now visible.");
}

function showSettledGTable() {
  const wrapper = document.getElementById("astar-tables-wrapper");
  const settledContainer = document.getElementById("settled-g-container");
  if (!wrapper || !settledContainer) return;

  // UI-only difficulty ramp: hide all tables in regular level 3.
  const shouldHideAllTables = !curRoomUI.isTutorial && curRoomUI.currentLevel === 3;
  if (shouldHideAllTables) {
    wrapper.style.display = "none";
    return;
  }

  wrapper.style.display = "flex";

  // UI-only difficulty ramp: hide visited g(n) table in regular level 2.
  const shouldHideSettledTable = !curRoomUI.isTutorial && curRoomUI.currentLevel === 2;
  settledContainer.style.display = shouldHideSettledTable ? "none" : "block";
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
    showPriorityQueue();
    showSettledGTable();
  }
  debugPrint("[drawLines] Drawing lines between chests.");
  debugPrint("[drawLines] Graph edges:", graph.edges);

  const lines = [];
  graph.edges.forEach(([start, end, weight]) => {
    debugPrint(
      `[drawLines] Creating edge from node ${start} to ${end} with weight ${weight}`,
    );
    const edge = { start, end, weight };

    const line = drawLine(
      chestList[start],
      chestList[end],
      weight,
      edge,
      scene,
    );

    lines.push(line);
    edgeList.push(line);
    edgeLabelList.push(line.userData.label);
    edgeLabelBackgroundList.push(line.userData.labelBackground);
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
        hoverEffect.classList.add("highlight"),
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
        hoverEffect.classList.remove("highlight"),
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
          "[onClick] Could not resolve node index from clicked chest.",
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
          curGameSession,
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
          curGameSession,
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

          markPriorityQueueVisited(index);
          currentlyHighlightedNodeIndex = index;

          Object.keys(hintBooleans).forEach(
            (key) => (hintBooleans[key] = false),
          );
          document.querySelector(".Hint-Text").classList.add("hidden");

          // Award score for correct node (chest) click in regular mode
          if (!curRoomUI.isTutorial) {
            curRoomUI.currentScore = Math.min(
              curRoomUI.currentScore + correctActionScoreAddition,
              levelMaxScores[curRoomUI.currentLevel],
            );
            curRoomUI.updateScore(curRoomUI.currentScore);
          }

          curRoomUI.uiText.innerText =
            "Evaluate neighbors of this node and update f(n) values.";
          if (index === graph.goalNode) {
            // advance step so nextTutorialStep() sees completion
            curRoomUI.currentTutorialStep++;

            if (curRoomUI.isTutorial) {
              curRoomUI.updateTutorialModalToBeTutorialCompleteModal?.();
            } else {
              completeLevelWithHeuristicComparison();
            }
            return;
          }
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
            curGameSession,
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
        curGameSession,
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
          (start === e0 && end === e1) || (start === e1 && end === e0),
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
          (start === e0 && end === e1) || (start === e1 && end === e0),
      );

      if (alreadySelected) {
        hintBooleans.alreadyVisited = true;
        updateHintsFromBooleans();
        GameHelper.handleWrongSelection(
          curRoomUI,
          "",
          curRoomUI.isTutorial,
          curGameSession,
        );
        shakeScreen();
        return;
      }

      selectedEdgesThisStep.push([start, end]);

      const allSelected = expectedEdges.every(([e0, e1]) =>
        selectedEdgesThisStep.some(
          ([s0, s1]) => (s0 === e0 && s1 === e1) || (s0 === e1 && s1 === e0),
        ),
      );

      if (allSelected) {
        selectedEdgesThisStep = [];
        Object.keys(hintBooleans).forEach((key) => (hintBooleans[key] = false));
        document.querySelector(".Hint-Text").classList.add("hidden");
        curRoomUI.uiText.innerText =
          "Select the next node with the smallest f(n).";
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
          (start === e0 && end === e1) || (start === e1 && end === e0),
      );

      if (found) {
        const alreadyChosen = selectedEdgesThisStep.some(
          ([x, y]) => (x === start && y === end) || (x === end && y === start),
        );

        if (alreadyChosen) {
          hintBooleans.alreadyVisited = true;
          updateHintsFromBooleans();
          GameHelper.handleWrongSelection(
            curRoomUI,
            "",
            curRoomUI.isTutorial,
            curGameSession,
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
          newG: found.newG,
          newF: found.newF,
          oldG: found.oldG,
          oldF: found.oldF,
        };

        curRoomUI.inputCompleted = false;
        showInputDialog();

        const allChosen =
          selectedEdgesThisStep.length === currentStep.expectedEdges.length;

        if (allChosen) {
          Object.keys(hintBooleans).forEach(
            (key) => (hintBooleans[key] = false),
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
          curGameSession,
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
    window.innerHeight,
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
function getNodeDisplayLabel(node) {
  if (node === graph.startNode) return "S";
  if (node === graph.goalNode) return "G";
  return `${node}`;
}


function formatQueueValue(value) {
  return Number.isFinite(value) ? Number(value).toFixed(2) : "∞";
}

function getCandidateValuesForNode(node, selectedEdge = null) {
  const values = [];

  // Current visible queue candidates for this node
  Array.from(priorityQueueState.values())
    .filter((entry) => entry.discovered && !entry.visited && entry.node === node)
    .forEach((entry) => {
      if (Number.isFinite(Number(entry.f))) values.push(Number(entry.f));
    });

  // Transient pushed candidates for this node
  transientQueueEntries
    .filter((entry) => entry.node === node)
    .forEach((entry) => {
      if (Number.isFinite(Number(entry.f))) values.push(Number(entry.f));
    });

  // Candidates from the currently selected edge
  if (selectedEdge) {
    const maybeValues = [selectedEdge.oldF, selectedEdge.newF];
    maybeValues.forEach((value) => {
      if (Number.isFinite(Number(value))) {
        values.push(Number(value));
      }
    });
  }
  const unique = [...new Set(values.map((v) => Number(v.toFixed(2))))].sort(
    (a, b) => a - b,
  );
  return unique;
}

function clearTransientQueueForNode(node) {
  transientQueueEntries = transientQueueEntries.filter((e) => e.node !== node);
}

function closeCandidateDecisionModal() {
  const modal = document.getElementById("candidate-decision-modal");
  const message = document.getElementById("candidate-decision-message");
  const buttons = document.getElementById("candidate-decision-buttons");
  if (modal) modal.style.display = "none";
  if (message) message.textContent = "";
  if (buttons) buttons.innerHTML = "";
}

function ensureCandidateHistoryRows(selected, candidateValues) {
  const hVal = computeHeuristicUI(selected.end);

  candidateValues.forEach((candidateF) => {
    const fValue = Number(candidateF);
    const gValue = Number.isFinite(hVal) ? fValue - hVal : selected.newG;

    const existsInPersistentQueue = Array.from(priorityQueueState.values())
      .filter((entry) => entry.discovered && !entry.visited)
      .some(
        (entry) =>
          entry.node === selected.end &&
          Math.abs(Number(entry.f) - fValue) < 0.001,
      );

    const existsInTransientQueue = transientQueueEntries.some(
      (entry) =>
        entry.node === selected.end && Math.abs(Number(entry.f) - fValue) < 0.001,
    );

    if (!existsInPersistentQueue && !existsInTransientQueue) {
      transientQueueEntries.push({
        node: selected.end,
        g: Number(gValue),
        h: hVal,
        f: fValue,
        discovered: true,
        visited: false,
        transient: true,
      });
    }
  });
}

function finalizeRegularCorrectInput(selected) {
  // Award score only after correct decision in regular mode (cap at level max)
  curRoomUI.currentScore = Math.min(
    curRoomUI.currentScore + correctActionScoreAddition,
    levelMaxScores[curRoomUI.currentLevel],
  );
  curRoomUI.updateScore(curRoomUI.currentScore);

  if (curRoomUI.uiText.innerText !== "Visit a new node!") {
    curRoomUI.uiText.innerText = "Correct!";
  }

  const targetNode = selected.end;
  const bestF = Math.min(Number(selected.oldF), Number(selected.newF));
  const shouldUseNewPath =
    Math.abs(bestF - Number(selected.newF)) < 0.001 &&
    selected.newG < selected.oldG;

  if (shouldUseNewPath) {
    // Preserve the replaced queue candidate as history so users can see evolution over time.
    const oldF = Number(selected.oldF);
    const newF = Number(selected.newF);
    const hVal = computeHeuristicUI(targetNode);
    const oldG =
      Number.isFinite(Number(selected.oldG))
        ? Number(selected.oldG)
        : Number.isFinite(oldF) && Number.isFinite(hVal)
          ? oldF - hVal
          : Number(selected.newG);
    const shouldKeepOldAsHistory =
      Number.isFinite(oldF) && Number.isFinite(newF) && Math.abs(oldF - newF) > 0.001;

    if (shouldKeepOldAsHistory) {
      const alreadyInTransient = transientQueueEntries.some(
        (entry) =>
          entry.node === targetNode && Math.abs(Number(entry.f) - oldF) < 0.001,
      );
      if (!alreadyInTransient) {
        transientQueueEntries.push({
          node: targetNode,
          g: Number(oldG),
          h: hVal,
          f: oldF,
          discovered: true,
          visited: false,
          transient: true,
        });
      }
    }

    updatePriorityQueueNode(targetNode, selected.newG);
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
    debugPrint("[finalizeRegularCorrectInput] Edge visually marked completed.");
  }

  Object.keys(hintBooleans).forEach((key) => (hintBooleans[key] = false));
  document.querySelector(".Hint-Text").classList.add("hidden");

  curRoomUI.selectedEdgeForInput = null;
  curRoomUI.inputCompleted = true;
  document.getElementById("input-dialog").style.display = "none";
  document.getElementById("input-backdrop").style.display = "none";
  document.getElementById("dialog-input").value = "";
  pendingCandidateDecision = null;
  closeCandidateDecisionModal();
  renderPriorityQueue();
  curRoomUI.isModalOpen = false;
  clickBlockedUntil = Date.now() + 500;
  suppressInputDialogUntil = Date.now() + 900;

  if (curRoomUI.readyForNextStep) {
    nextTutorialStep();
    curRoomUI.readyForNextStep = false;
    selectedEdgesThisStep = [];
  }
}

function showCandidateDecisionModal(selected, candidateValues) {
  const modal = document.getElementById("candidate-decision-modal");
  const message = document.getElementById("candidate-decision-message");
  const buttons = document.getElementById("candidate-decision-buttons");
  if (!modal || !message || !buttons) return;

  const best = Math.min(...candidateValues);
  message.textContent = `There are ${candidateValues.length} candidates for ${getNodeDisplayLabel(selected.end)} (${candidateValues.map((v) => v.toFixed(2)).join(", ")}). Which one should update g(n)?`;
  buttons.innerHTML = "";

  candidateValues.forEach((value) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = value.toFixed(2);
    btn.style.backgroundColor = "#1971c2";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.padding = "7px 12px";
    btn.style.borderRadius = "4px";
    btn.style.cursor = "pointer";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (Math.abs(value - best) < 0.001) {
        finalizeRegularCorrectInput(selected);
      } else {
        hintBooleans.wrongWeightEntered = true;
        updateHintsFromBooleans();
        curRoomUI.uiText.innerText =
          "Not the best choice. Pick the smallest f(n) candidate.";
        shakeScreen?.();
      }
    });
    buttons.appendChild(btn);
  });

  modal.style.display = "block";
  document.getElementById("input-backdrop").style.display = "block";
  curRoomUI.isModalOpen = true;
  clickBlockedUntil = Date.now() + 300;
  suppressInputDialogUntil = Date.now() + 900;
}

function completeTutorialEdgeStep(nodeId, finalG, selectedEdge, isCorrectSetter) {
  updatePriorityQueueNode(nodeId, Number(finalG));

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
      selectedLine.material.color.set(0x800080);
      if (selectedLine.userData.label) {
        selectedLine.userData.label.material.color.set(0x000000);
      }
    }
  }

  isCorrectSetter(true);
  Object.keys(hintBooleans).forEach((key) => (hintBooleans[key] = false));
  document.querySelector(".Hint-Text").classList.add("hidden");

  nextTutorialStep();
  document.getElementById("input-dialog").style.display = "none";
  document.getElementById("input-backdrop").style.display = "none";
  document.getElementById("dialog-input").value = "";
  closeCandidateDecisionModal();
  curRoomUI.isModalOpen = false;
}

function showTutorialDecisionModal(nodeId, currentG, candidateG, selectedEdge, isCorrectSetter) {
  const modal = document.getElementById("candidate-decision-modal");
  const message = document.getElementById("candidate-decision-message");
  const buttons = document.getElementById("candidate-decision-buttons");
  if (!modal || !message || !buttons) return;

  const candidates = [...new Set([Number(currentG), Number(candidateG)].filter(Number.isFinite))].sort((a, b) => a - b);
  const best = Math.min(...candidates);
  const pathOne = candidates[0]?.toFixed(2) ?? "0.00";
  const pathTwo = candidates[1]?.toFixed(2) ?? pathOne;
  message.textContent = `We have 2 candidates from 2 different paths for node ${getNodeDisplayLabel(nodeId)}. Path 1 has weight ${pathOne} and Path 2 has weight ${pathTwo}. Choose the smallest value: ${best.toFixed(2)}.`;
  buttons.innerHTML = "";

  candidates.forEach((value) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = value.toFixed(2);
    btn.style.backgroundColor = "#1971c2";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.padding = "7px 12px";
    btn.style.borderRadius = "4px";
    btn.style.cursor = "pointer";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (Math.abs(value - best) < 0.001) {
        completeTutorialEdgeStep(nodeId, best, selectedEdge, isCorrectSetter);
      } else {
        hintBooleans.wrongWeightEntered = true;
        updateHintsFromBooleans();
        curRoomUI.uiText.innerText =
          "Keep the smaller value in the queue for A*.";
        shakeScreen?.();
      }
    });
    buttons.appendChild(btn);
  });

  modal.style.display = "block";
  document.getElementById("input-backdrop").style.display = "block";
  curRoomUI.isModalOpen = true;
  clickBlockedUntil = Date.now() + 300;
  suppressInputDialogUntil = Date.now() + 900;
}

function initializePriorityQueue(nodes) {
  priorityQueueState.clear();
  settledGState.length = 0;
  transientQueueEntries = [];
  currentSettledNode = null;
  nodes.forEach((node) => {
    const isStart = node === graph.startNode;
    const g = isStart ? 0 : Infinity;
    const h = computeHeuristicUI(node);
    const f = Number.isFinite(g) ? g + h : Infinity;
    priorityQueueState.set(node, {
      node,
      g,
      h,
      f,
      discovered: isStart,
      visited: false,
    });
  });
  renderPriorityQueue();
  renderSettledGTable();
}

function updatePriorityQueueNode(node, gValue) {
  const existing = priorityQueueState.get(node) ?? {
    node,
    discovered: false,
    visited: false,
  };
  const h = computeHeuristicUI(node);
  const g = Number(gValue);
  const f = g + h;
  priorityQueueState.set(node, {
    ...existing,
    g,
    h,
    f,
    discovered: true,
    visited: false,
  });
  renderPriorityQueue();
}

function markPriorityQueueVisited(node) {
  const existing = priorityQueueState.get(node);
  if (!existing) return;
  const poppedF = Number(existing.f);
  priorityQueueState.set(node, {
    ...existing,
    visited: true,
  });

  // If a transient history row duplicates the popped top (same node + same f),
  // remove one copy so the visual "pop" is reflected immediately.
  const duplicateIdx = transientQueueEntries.findIndex(
    (entry) =>
      entry.node === node &&
      Number.isFinite(poppedF) &&
      Math.abs(Number(entry.f) - poppedF) < 0.001,
  );
  if (duplicateIdx !== -1) {
    transientQueueEntries.splice(duplicateIdx, 1);
  }

  if (
    Number.isFinite(existing.g) &&
    !settledGState.some((entry) => entry.node === node)
  ) {
    settledGState.push({ node, g: Number(existing.g) });
  }
  currentSettledNode = node;
  renderPriorityQueue();
  renderSettledGTable();
}

function renderPriorityQueue() {
  const tableBody = document.getElementById("priority-queue-body");
  if (!tableBody) return;

  const mergedEntries = Array.from(priorityQueueState.values())
    .filter((entry) => entry.discovered && !entry.visited)
    .concat(transientQueueEntries)
    .filter((entry) => Number.isFinite(entry.f) || entry.f === Infinity);

  // Prevent visually duplicated rows (same node + same f value)
  const seen = new Set();
  const entries = mergedEntries
    .filter((entry) => {
      const key = `${entry.node}|${Number.isFinite(entry.f) ? Number(entry.f).toFixed(2) : "INF"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (!Number.isFinite(a.f) && !Number.isFinite(b.f)) return a.node - b.node;
      if (!Number.isFinite(a.f)) return 1;
      if (!Number.isFinite(b.f)) return -1;
      if (a.f === b.f) return a.node - b.node;
      return a.f - b.f;
    });

  tableBody.innerHTML = "";
  if (entries.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="4">Queue is empty.</td>`;
    tableBody.appendChild(emptyRow);
    return;
  }

  entries.forEach((entry, index) => {
    const row = document.createElement("tr");
    if (index === 0) {
      row.classList.add("priority-queue-min-row");
    }
    row.innerHTML = `
      <td>${getNodeDisplayLabel(entry.node)}</td>
      <td>${formatQueueValue(entry.g)}</td>
      <td>${formatQueueValue(entry.h)}</td>
      <td>${formatQueueValue(entry.f)}</td>
    `;
    tableBody.appendChild(row);
  });
}

function renderSettledGTable() {
  const tableBody = document.getElementById("settled-g-body");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  if (settledGState.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="2">No visited nodes yet.</td>`;
    tableBody.appendChild(emptyRow);
    return;
  }

  settledGState.forEach((entry) => {
    const row = document.createElement("tr");
    if (entry.node === currentSettledNode) {
      row.classList.add("settled-current-node-row");
    }
    row.innerHTML = `
      <td>${getNodeDisplayLabel(entry.node)}</td>
      <td>${formatQueueValue(entry.g)}</td>
    `;
    tableBody.appendChild(row);
  });
}


/*
 * Rotates all labels and rings to always face the camera.
 * Keeps chest, edge, and ring labels readable during movement.
 */
function updateLabelRotation() {
  chestLabelList.forEach((label, i) => {
    label.lookAt(camera.position);
  });
  chestLabelBackgroundList.forEach((bg) => {
    bg.lookAt(camera.position);
  });

  edgeLabelList.forEach((label, i) => {
    label.lookAt(camera.position);
  });
  edgeLabelBackgroundList.forEach((bg) => {
    bg.lookAt(camera.position);
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
    position,
  );

  try {
    const { model, mixer, action } = await loadModel(
      dungeonRoomURL.href,
      position,
      scene,
      mixers,
    );

    debugPrint("[createDungeonRoom] Dungeon model loaded.");

    if (mixer && action) {
      dungeonRoomMixer = mixer;
      dungeonRoomAction = action;

      debugPrint(
        "[createDungeonRoom] Mixer and action initialized:",
        dungeonRoomMixer,
        dungeonRoomAction,
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
  chestLabelBackgroundList.forEach((label) => {
    scene.remove(label);
    if (label.geometry) label.geometry.dispose();
    if (label.material) label.material.dispose();
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
  edgeLabelBackgroundList.forEach((label) => {
    scene.remove(label);
    if (label.geometry) label.geometry.dispose();
    if (label.material) label.material.dispose();
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
  chestLabelBackgroundList.length = 0;
  edgeList.length = 0;
  edgeLabelList.length = 0;
  edgeLabelBackgroundList.length = 0;
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
  priorityQueueState.clear();
  settledGState.length = 0;
  transientQueueEntries = [];
  currentSettledNode = null;
  renderPriorityQueue();
  renderSettledGTable();

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
    "[createHoverElements] Red hover sphere created and added to scene.",
  );

  // Create black ring for label highlights
  hoverRing = createRing(0.8, 0.9, labelDepth, 0x000000);
  hoverRing.visible = false;
  scene.add(hoverRing);
  debugPrint(
    "[createHoverElements] Black hover ring created and added to scene.",
  );
}

/**
 * Refreshes the A* table: recomputes h(n) for all nodes and updates f(n) = g(n) + h(n) in the DOM.
 */
function refreshPriorityQueueHeuristics() {
  if (!graph) return;
  for (const [node, value] of priorityQueueState.entries()) {
    const h = computeHeuristicUI(node);
    const f = Number.isFinite(value.g) ? value.g + h : Infinity;
    priorityQueueState.set(node, { ...value, h, f });
  }
  renderPriorityQueue();
}

function getHeuristicWeightFromInput() {
  const input = document.getElementById("heuristicWeightInput");
  const parsed = Number(input?.value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0, parsed);
}

function updateInputDialogHeuristicInfo() {
  const infoEl = document.getElementById("dialog-heuristic-info");
  const instructionEl = document.getElementById("dialog-instruction-text");
  if (!infoEl || !instructionEl || !graph) return;

  let targetNode = null;

  const selected = curRoomUI.selectedEdgeForInput;
  if (selected && Number.isFinite(Number(selected.end))) {
    targetNode = Number(selected.end);
  } else if (curRoomUI.isTutorial) {
    const currentStep = tutorialSteps[curRoomUI.currentTutorialStep];
    const expectedEdge = currentStep?.expectedEdges?.[0];
    if (Array.isArray(expectedEdge) && expectedEdge.length >= 2) {
      targetNode = Number(expectedEdge[1]);
    }
  }

  if (!Number.isFinite(Number(targetNode))) {
    infoEl.textContent = "h(n) will appear once you select an edge.";
    return;
  }

  const hVal = Number(computeHeuristicUI(targetNode));
  const weight = Number(getHeuristicWeightFromInput());

  instructionEl.textContent =
    "Enter f(n) = g(n) + h(n) for the selected edge's destination node.";

  infoEl.textContent = `Node ${getNodeDisplayLabel(targetNode)}: h(n) = ${hVal.toFixed(2)} (weight ${weight.toFixed(2)} × Euclidean distance).`;
}

function buildAdjacencyListFromGraph(localGraph) {
  const adjacency = {};
  (localGraph.nodes || []).forEach((node) => {
    adjacency[node] = [];
  });
  (localGraph.edges || []).forEach(([from, to, weight]) => {
    if (!adjacency[from]) adjacency[from] = [];
    if (!adjacency[to]) adjacency[to] = [];
    adjacency[from].push({ node: to, weight: Number(weight) });
    adjacency[to].push({ node: from, weight: Number(weight) });
  });
  return adjacency;
}

function computeWeightedHeuristic(localGraph, node, goalNode, weightMultiplier) {
  if (!Number.isFinite(weightMultiplier) || weightMultiplier <= 0) return 0;
  const p = localGraph.nodePositions?.[Number(node)];
  const g = localGraph.nodePositions?.[Number(goalNode)];
  if (!p || !g) return 0;
  const dx = p.x - g.x;
  const dz = p.z - g.z;
  const euclid = Math.sqrt(dx * dx + dz * dz);
  return weightMultiplier * euclid;
}

function runWeightedAstarSummary(localGraph, weightMultiplier) {
  const startNode = Number(localGraph.startNode);
  const goalNode = Number(localGraph.goalNode);
  const adjacency = buildAdjacencyListFromGraph(localGraph);
  const nodes = Object.keys(adjacency).map(Number);

  const gScore = {};
  const previous = {};
  const closed = new Set();
  const open = [];
  let nodesVisited = 0;

  nodes.forEach((node) => {
    gScore[node] = Infinity;
    previous[node] = null;
  });

  const startH = computeWeightedHeuristic(
    localGraph,
    startNode,
    goalNode,
    weightMultiplier,
  );
  gScore[startNode] = 0;
  open.push({ node: startNode, f: startH });

  while (open.length > 0) {
    open.sort((a, b) => (a.f === b.f ? a.node - b.node : a.f - b.f));
    const current = open.shift();
    if (!current) break;
    if (closed.has(current.node)) continue;

    closed.add(current.node);
    nodesVisited++;

    if (current.node === goalNode) break;

    const neighbors = adjacency[current.node] || [];
    neighbors.forEach(({ node: neighbor, weight }) => {
      if (closed.has(neighbor)) return;
      const tentativeG = gScore[current.node] + weight;
      if (tentativeG < gScore[neighbor]) {
        gScore[neighbor] = tentativeG;
        previous[neighbor] = current.node;
        const h = computeWeightedHeuristic(
          localGraph,
          neighbor,
          goalNode,
          weightMultiplier,
        );
        open.push({ node: neighbor, f: tentativeG + h });
      }
    });
  }

  const path = [];
  if (Number.isFinite(gScore[goalNode])) {
    let cur = goalNode;
    while (cur !== null && cur !== undefined) {
      path.push(cur);
      if (cur === startNode) break;
      cur = previous[cur];
    }
    path.reverse();
  }

  return {
    weight: Number(weightMultiplier.toFixed(2)),
    nodesVisited,
    pathCost: Number.isFinite(gScore[goalNode])
      ? Number(gScore[goalNode].toFixed(2))
      : Infinity,
    path,
  };
}

function buildHeuristicComparisonHTML() {
  if (!graph) return "";

  const baselineWeights = [0, 1, 1.5];
  const userWeight = Number(getHeuristicWeightFromInput().toFixed(2));
  const weights = [...baselineWeights];
  if (!weights.some((w) => Math.abs(w - userWeight) < 0.001)) {
    weights.push(userWeight);
  }

  const runs = weights
    .map((weight) => runWeightedAstarSummary(graph, weight))
    .sort((a, b) => a.weight - b.weight);
  const zeroRun = runs.find((run) => Math.abs(run.weight) < 0.001);
  const optimalCost = zeroRun?.pathCost;

  const rows = runs
    .map((run) => {
      const isOptimal =
        Number.isFinite(optimalCost) &&
        Number.isFinite(run.pathCost) &&
        Math.abs(run.pathCost - optimalCost) < 0.001;
      const isUserOnly =
        Math.abs(run.weight - userWeight) < 0.001 &&
        !baselineWeights.some((w) => Math.abs(w - run.weight) < 0.001);
      const weightLabel = isUserOnly
        ? `${run.weight.toFixed(2)}x (your weight)`
        : `${run.weight.toFixed(2)}x`;
      const pathCost = Number.isFinite(run.pathCost)
        ? run.pathCost.toFixed(2)
        : "∞";
      return `
        <tr>
          <td style="padding: 6px; border: 1px solid #495057;">${weightLabel}</td>
          <td style="padding: 6px; border: 1px solid #495057;">${run.nodesVisited}</td>
          <td style="padding: 6px; border: 1px solid #495057;">${pathCost}</td>
          <td style="padding: 6px; border: 1px solid #495057;">${isOptimal ? "Yes" : "No"}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="margin-top: 10px; text-align: left;">
      <p style="margin: 0 0 8px 0; color: #d0ebff; font-size: 14px;">
        Heuristic comparison on this graph:
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #e3f4ff;">
        <thead>
          <tr style="background: #212529;">
            <th style="padding: 6px; border: 1px solid #495057;">Weight</th>
            <th style="padding: 6px; border: 1px solid #495057;">Visited Nodes</th>
            <th style="padding: 6px; border: 1px solid #495057;">Path Cost</th>
            <th style="padding: 6px; border: 1px solid #495057;">Optimal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin: 10px 0 0 0; color: #74c0fc; font-size: 13px; line-height: 1.4;">
        Note: Sometimes all weights look the same on a specific graph. Across graphs, weights closer to Euclidean often visit fewer nodes.
        Also, 1.5x can be inadmissible and may not always return the most optimal path.
      </p>
    </div>
  `;
}

function completeLevelWithHeuristicComparison() {
  const heuristicComparisonHTML = buildHeuristicComparisonHTML();
  GameHelper.handleLevelCompletion(
    curRoomUI,
    curGameSession,
    levelMaxScores[curRoomUI.currentLevel],
  );
  if (heuristicComparisonHTML && curRoomUI?.labelCompletionText) {
    curRoomUI.labelCompletionText.innerHTML += heuristicComparisonHTML;
  }
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
      `Invalid level: ${currentLevel}. Level does not exist in levelConfig.`,
    );
    return;
  }

  debugPrint(`[setUpGameModel] Setting up level ${currentLevel}`);

  const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
  curNodes = Array.from({ length: numNodes }, (_, i) => i);
  curEdges = numEdges;

  correctActionScoreAddition = Math.floor(
    levelMaxScores[currentLevel] / (numNodes - 1),
  );

  let goalNode = null;
  let attempts = 0;

  while (goalNode === null && attempts < 30) {
    graph = createRandomConnectedGraph(curNodes, curEdges);
    graph.nodePositions = {};
    graph.startNode = 0;

    const tempDijkstra = new DijkstraAlgorithm(graph, graph.startNode);
    const { distances, previous } = tempDijkstra;

    let bestNode = null;
    let bestDistance = -Infinity;

    for (const nodeStr in distances) {
      const node = Number(nodeStr);

      if (node === graph.startNode) continue;
      if (distances[nodeStr] === Infinity) continue;

      // Count hops (number of edges in shortest path)
      let hops = 0;
      let current = node;

      while (current !== null && current !== graph.startNode) {
        current = previous[current];
        hops++;
        if (hops > 1000) break;
      }

      // Require at least 2 hops (no direct S → G)
      if (hops < 2) continue;

      if (distances[nodeStr] > bestDistance) {
        bestDistance = distances[nodeStr];
        bestNode = node;
      }
    }

    if (bestNode !== null) {
      goalNode = bestNode;
    }

    attempts++;
  }

  // Fallback (should almost never happen)
  if (goalNode === null) {
    goalNode = curNodes[curNodes.length - 1];
  }

  graph.goalNode = goalNode;

  debugPrint(
    `[setUpGameModel] Start: ${graph.startNode}, Goal: ${graph.goalNode}`,
  );

  createModels().then(() => {
    // Set weighted Euclidean heuristic from UI before building A*.
    graph.heuristicWeight = getHeuristicWeightFromInput();
    graph.heuristicType = graph.heuristicWeight === 0 ? "zero" : "euclid";

    // Build algorithm and queue after node positions are available
    curAlgorithmForGraph = new AstarAlgorithm(graph, graph.startNode);
    initializePriorityQueue(graph.nodes);
    showPriorityQueue();
    showSettledGTable();

    curRoomUI.currentAlgorithm = "Astar";
  });

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
/**
 * Computes heuristic h(n) for a node for UI display (uses graph positions and heuristicType).
 * @param {number} node - Node id
 * @returns {number}
 */
function computeHeuristicUI(node) {
  const weight = Number.isFinite(Number(graph?.heuristicWeight))
    ? Number(graph.heuristicWeight)
    : graph?.heuristicType === "w_euclid"
      ? 1.5
      : graph?.heuristicType === "euclid"
        ? 1
        : 0;
  if (weight <= 0) return 0;

  const p = graph.nodePositions?.[node];
  const g = graph.nodePositions?.[graph.goalNode];
  if (!p || !g) return 0;

  const dx = p.x - g.x;
  const dz = p.z - g.z;
  const euclid = Math.sqrt(dx * dx + dz * dz);

  return weight * euclid;
}

/*
 * Sets up the specific graph and UI for the Astar tutorial mode.
 *
 * 1. Loads a predefined tutorial graph.
 * 2. Initializes algorithm, tables, and visuals for the tutorial.
 */
function setUpTutorialModel() {
  debugPrint("[setUpTutorialModel] Setting up Astar tutorial model...");

  graph = createSpecificGraphAstarTutorial();
  debugPrint("[setUpTutorialModel] Tutorial graph created:", graph);

  curNodes = graph.nodes;
  graph.heuristicWeight = 0;
  graph.heuristicType = "zero";
  curAlgorithmForGraph = new AstarAlgorithm(graph, graph.startNode);
  curRoomUI.currentAlgorithm = "Astar";
  debugPrint("[setUpTutorialModel] Astar algorithm initialized and set.");

  createModels().then(() => {
    initializePriorityQueue(graph.nodes);
    showPriorityQueue();
    showSettledGTable();
  });
  debugPrint("[setUpTutorialModel] Priority queue initialized.");

  debugPrint("[setUpTutorialModel] Models created.");

  createHoverElements();
  debugPrint("[setUpTutorialModel] Hover elements created.");
}

/*
 * Displays the input dialog and backdrop.
 * Sets modal state to prevent interactions with the underlying scene.
 */
function showInputDialog() {
  if (Date.now() < suppressInputDialogUntil) {
    debugPrint("[showInputDialog] Suppressed to prevent dialog re-open race.");
    return;
  }

  document.getElementById("input-dialog").style.display = "block";
  document.getElementById("input-backdrop").style.display = "block";
  const dialog = document.getElementById("input-dialog");
  dialog.style.bottom = curRoomUI.isTutorial ? "280px" : "380px";
  debugPrint("[showInputDialog] Input dialog and backdrop displayed.");

  // Prevent interactions underneath
  curRoomUI.isModalOpen = true;
  debugPrint("[showInputDialog] Modal state set to true.");

  pendingCandidateDecision = null;
  updateInputDialogHeuristicInfo();

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
  const now = Date.now();
  if (now - lastDialogSubmitAt < 200) {
    return;
  }
  lastDialogSubmitAt = now;

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

      const nodeId = Number(node);
      const candidateG = Number(correctValue);
      const expectedF = candidateG + computeHeuristicUI(nodeId);
      const inputF = Number(inputValue);
      const currentKnownG = Number(priorityQueueState.get(nodeId)?.g);

      if (
        Number.isFinite(inputF) &&
        (Math.abs(inputF - Number(expectedF.toFixed(2))) < 0.001 ||
          Math.abs(inputF - Number(currentKnownG.toFixed?.(2) ?? currentKnownG)) < 0.001)
      ) {
        debugPrint(`[closeInputDialog] Correct input received: ${inputValue}`);
        isCorrect = true;

        const hasComparison =
          Number.isFinite(currentKnownG) &&
          Number.isFinite(candidateG) &&
          Math.abs(currentKnownG - candidateG) > 0.001;

        if (hasComparison) {
          // Keep previous visible value as a queue candidate in tutorial view.
          const hVal = computeHeuristicUI(nodeId);
          const existingTransient = transientQueueEntries.some(
            (entry) =>
              entry.node === nodeId &&
              Math.abs(Number(entry.f) - Number(candidateG + hVal)) < 0.001,
          );
          if (!existingTransient) {
            transientQueueEntries.push({
              node: nodeId,
              g: candidateG,
              h: hVal,
              f: candidateG + hVal,
              discovered: true,
              visited: false,
              transient: true,
            });
            renderPriorityQueue();
          }

          document.getElementById("input-dialog").style.display = "none";
          document.getElementById("dialog-input").value = "";
          showTutorialDecisionModal(
            nodeId,
            currentKnownG,
            candidateG,
            selectedEdge,
            (value) => {
              isCorrect = value;
            },
          );
          return;
        }

        completeTutorialEdgeStep(nodeId, candidateG, selectedEdge, (value) => {
          isCorrect = value;
        });
        return;
      } else {
        console.warn(
          `[closeInputDialog] Incorrect input: ${inputValue}, expected: ${correctValue}`,
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
        "[closeInputDialog] Correct input — proceeding to next tutorial step.",
      );
    } else {
      hintBooleans.wrongWeightEntered = true;
      updateHintsFromBooleans();

      if (currentStep.advanceOnError === true) {
        debugPrint(
          "[closeInputDialog] Incorrect input, but advancing due to advanceOnError=true.",
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

    const inputF = Number(inputValue);
    const candidateValues = getCandidateValuesForNode(selected.end, selected);
    if (candidateValues.length > 1) {
      if (!Number.isFinite(inputF)) {
        console.warn("[closeInputDialog] Incorrect non-numeric input:", inputValue);
        hintBooleans.wrongWeightEntered = true;
        updateHintsFromBooleans();
        GameHelper.handleWrongSelection(
          curRoomUI,
          "",
          curRoomUI.isTutorial,
          curGameSession,
        );
        curRoomUI.uiText.innerText = "Incorrect input. Try again.";
        shakeScreen?.();
        return;
      }

      const mergedCandidates = [
        ...new Set([...candidateValues, Number(inputF.toFixed(2))]),
      ].sort((a, b) => a - b);

      debugPrint("[closeInputDialog] Multi-candidate value entered:", inputF);
      ensureCandidateHistoryRows(selected, mergedCandidates);
      renderPriorityQueue();

      // close first dialog, open second decision modal
      document.getElementById("input-dialog").style.display = "none";
      document.getElementById("dialog-input").value = "";
      pendingCandidateDecision = null;
      showCandidateDecisionModal(selected, mergedCandidates);
      return;
    }

    if (
      Number.isFinite(inputF) &&
      candidateValues.some((v) => Math.abs(inputF - v) < 0.001)
    ) {
      debugPrint("[closeInputDialog] Candidate value entered:", inputF);
      finalizeRegularCorrectInput(selected);
    } else {
      console.warn("[closeInputDialog] Incorrect weight entered:", inputF);
      hintBooleans.wrongWeightEntered = true;
      updateHintsFromBooleans();

      GameHelper.handleWrongSelection(
        curRoomUI,
        "",
        curRoomUI.isTutorial,
        curGameSession,
      );

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

document.addEventListener("DOMContentLoaded", () => {
  const heuristicInput = document.getElementById("heuristicWeightInput");
  if (!heuristicInput) return;
  let lastAppliedWeight = null;

  const onHeuristicWeightChange = () => {
    if (!graph || curRoomUI.isTutorial) return;
    const weight = getHeuristicWeightFromInput();
    if (
      lastAppliedWeight !== null &&
      Math.abs(Number(lastAppliedWeight) - Number(weight)) < 0.0001
    ) {
      return;
    }

    lastAppliedWeight = weight;
    heuristicInput.value = String(weight);
    graph.heuristicWeight = weight;
    graph.heuristicType = weight === 0 ? "zero" : "euclid";

    // FULL RESET
    resetScene();
    curRoomUI.currentTutorialStep = 0;
    currentlyHighlightedNodeIndex = null;

    // Rebuild game model with new heuristic
    setUpGameModel(curRoomUI.currentLevel);
  };

  heuristicInput.addEventListener("change", onHeuristicWeightChange);
  heuristicInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onHeuristicWeightChange();
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
        "Astar",
        "regular",
        curRoomUI.currentLevel,
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

if (slidesButton) {
  slidesButton.addEventListener("click", () => {
    debugPrint("Algorithm Slides Button Clicked");
    curRoomUI.openModal(curRoomUI.algoInstructionModal);
  });
}

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
              margin,
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
    chestLabelBackgroundList[i].position.copy(
      position.clone().setY(position.y + 2.4),
    );
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
    createNodeLabel(
      "A* Algorithm",
      new THREE.Vector3(13, 7, -30),
      scene,
      1,
      0.3,
      0x212529,
    );
    levelTitle = createNodeLabel(
      "Level 1",
      new THREE.Vector3(11, 4, -30),
      scene,
      0.9,
      0.3,
      0x212529,
    );
  },
);

document.getElementById("dialog-input").addEventListener("keydown", (e) => {
  e.stopPropagation(); // stop bubbling to global listeners
});

document.querySelectorAll(".instruction__img_Astar").forEach((img) => {
  img.addEventListener("mousemove", (e) => {
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    img.style.setProperty("--x", `${x}%`);
    img.style.setProperty("--y", `${y}%`);
  });
});

// ===== Scene Initialization Section =====
createThreePointLightingRoom(scene);
window.addEventListener("resize", onWindowResize, false);
window.closeInputDialog = closeInputDialog;
animate();
createDungeonRoom();
setUpGameModel(currentLevel);

// ===== UI Callbacks Section =====
curRoomUI.callbacks.resetLevel = function (curlvl) {
  // Restore heuristic weight input (default Euclidean = 1).
  const heuristicInput = document.getElementById("heuristicWeightInput");
  if (heuristicInput) {
    heuristicInput.disabled = false;
    heuristicInput.value = "1";
  }
  curRoomUI.uiText.innerHTML = `Start by selecting the source node (Node S), then find the shortest path to the goal node using f(n) = g(n) + h(n)!`;
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
    curRoomUI.currentMode,
  );
};

curRoomUI.callbacks.startTutorial = function () {
  // ===== Lock heuristic weight to 0 for tutorial (zero heuristic) =====
  const heuristicInput = document.getElementById("heuristicWeightInput");
  if (heuristicInput) {
    heuristicInput.value = "0";
    heuristicInput.disabled = true;
  }
  currentlyHighlightedNodeIndex = null;
  curRoomUI.currentTutorialStep = 0;
  updateTutorialStep();
  curRoomUI.uiText.innerHTML = `Please follow the steps shown in the tutorial window.`;
  resetScene();
  updateNodeLabel(levelTitle, `Tutorial`, 0.9, 0.3, 0x212529);
  setUpTutorialModel();
};
