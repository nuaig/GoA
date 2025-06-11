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
import gsap from "gsap";
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
// ===== Import Section =====

// ===== Variable Decleration Section =====
const reArrangeButton = document.querySelector(".Rearrange-Action");
let curGameSession;
let currentLevel = 1; // TO DO
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
let dungeonRoomMixer;
let dungeonRoomAction;
const startPosition = { x: 0, y: 5, z: 35 };
const midPosition = { x: 0, y: 5, z: 26 };
const endPosition = { x: 0, y: 26, z: 26 };
camera.position.set(startPosition.x, startPosition.y, startPosition.z);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 4);
const curRoomUI = new GameRoomUI("Dijkstra", 1, camera);
correctActionScoreAddition = Math.floor(
  levelMaxScores[curRoomUI.currentLevel] / (numNodes - 1)
);
const fontLoader = new FontLoader();
let font;
let chapterTitle;
let levelTitle;
const labelDepth = 0.1;
let hoverRing = createRing(0.8, 0.9, labelDepth, 0x000000);
scene.add(hoverRing);
let raycaster;
const clock = new THREE.Clock();

// Hard coded steps for the Dijkstra tutorial
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

// ===== Variable Decleration Section =====

// ===== Function Decleration Section =====
function updateTutorialStep() {
  document.querySelector(".tuto-instruction-text").innerHTML =
    tutorialSteps[curRoomUI.currentTutorialStep].instruction;
  document.querySelector(".tuto-explanation-text").innerHTML =
    tutorialSteps[curRoomUI.currentTutorialStep].explanation;
}

// Call this function whenever the user makes a correct selection
function nextTutorialStep() {
  curRoomUI.currentTutorialStep++;

  const isDone = curRoomUI.currentTutorialStep >= tutorialSteps.length;

  if (isDone) {
    curRoomUI.updateTutorialModalToBeTutorialCompleteModal?.();
    curRoomUI.openModal(
      "🎉 Congratulations!",
      "You've completed Dijkstra's algorithm tutorial!"
    );
    curRoomUI.currentLevel = null;
    curRoomUI.isTutorial = false;
  } else {
    updateTutorialStep();
  }
}

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
    closedModel.model.scale.set(2.5, 2.5, 2.5);
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

  console.log("All models loaded. Final chestList:", chestList);
  drawLines();
}

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
    curRoomUI.uiText.innerText = "✅ Correct!";

    if (currentAlgorithm === "Dijkstra") {
      // updateNodeColorsForSameTree({ ...edge, rootStart, rootEnd }, sameTree);
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
      console.log(currentLevel, "current Level");

      curRoomUI.currentScore = Math.floor(
        levelMaxScores[curRoomUI.currentLevel] *
          ((curRoomUI.health + 1) * 0.1 + 1)
      );
      console.log(curRoomUI.currentScore);
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

      curRoomUI.updateLevelStatus(curRoomUI.currentLevel, curRoomUI.totalStars);
      const status_update_string =
        curRoomUI.currentLevel != 3 ? "completed" : "completed_first_time";
      // TO DO needs to check if it is already completed or not!
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
      // openModal(currentLevel); // TO DO check this
      curRoomUI.disableMouseEventListeners_K_P();
      // window.removeEventListener("mousemove", onMouseMove, false);
      // window.removeEventListener("click", onClick, false);
    } else {
      curRoomUI.uiText.innerText = `Correct! Current weight is ${currentWeight}.`;
    }
  } else {
    shakeScreen();
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
      // openModal(currentLevel); // TO DO check this
      curRoomUI.disableMouseEventListeners_K_P();
    }
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

  // Assign the function to the global variable
  onClick = function (event) {
    event.preventDefault();
    if (curRoomUI.isModalOpen) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([...lines, ...labels]);
    const chestIntersects = raycaster.intersectObjects([...chestList]);

    const intersectedObject = intersects[0]?.object;
    const currentStep = tutorialSteps[curRoomUI.currentTutorialStep];

    // Prevent edge click if chest is expected
    if (
      curRoomUI.isTutorial &&
      currentStep.expectedChest !== null &&
      intersectedObject?.userData?.edge
    ) {
      document.querySelector(".Hint-Text").classList.add("hidden");
      curRoomUI.uiText.innerText = currentStep.errorMessage;
      curRoomUI.wrongSelectionFeedback?.();
      shakeScreen();
      return;
    }

    // Prevent chest click if edge is expected
    if (
      curRoomUI.isTutorial &&
      currentStep.expectedEdges &&
      chestIntersects.length > 0
    ) {
      document.querySelector(".Hint-Text").classList.add("hidden");
      curRoomUI.uiText.innerText = currentStep.errorMessage;
      curRoomUI.wrongSelectionFeedback?.();
      shakeScreen();
      return;
    }

    // Chest click logic
    if (chestIntersects.length > 0) {
      let clickedChest = chestIntersects[0].object;
      while (clickedChest && !chestList.includes(clickedChest)) {
        clickedChest = clickedChest.parent;
      }

      const index = chestList.indexOf(clickedChest);
      if (index !== -1) {
        if (curRoomUI.isTutorial) {
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

        // Non-tutorial mode
        chestList[index].visible = false;
        openChestList[index].visible = true;
        openChestList[index].userData.clicked = true;
        return;
      }
    }

    // Edge click logic
    if (curRoomUI.isTutorial) {
      const expectedEdges = currentStep.expectedEdges;

      if (expectedEdges && intersectedObject?.userData?.edge) {
        const { start, end } = intersectedObject.userData.edge;

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

      // Edge click on mistake-only step
      if (expectedEdges && expectedEdges.length === 0) {
        document.querySelector(".Hint-Text").classList.add("hidden");
        curRoomUI.uiText.innerText = currentStep.errorMessage;
        curRoomUI.wrongSelectionFeedback?.();
        shakeScreen();

        if (currentStep.advanceOnError) {
          setTimeout(() => {
            nextTutorialStep();
          }, 1000);
        }

        return;
      }
    }

    // Non-tutorial edge selection
    if (intersectedObject?.userData?.edge) {
      handleEdgeSelection(
        intersectedObject,
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

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

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
  updateEdgeTable(graph.edges);
  initializeDistanceTable(graph.nodes);

  console.log("Graph ==", graph);
  if (curRoomUI.currentLevel <= 3) {
    curAlgorithmForGraph = new DijkstraAlgorithm(graph);
    curRoomUI.currentAlgorithm = "Dijkstra";
  }
  createModels();
  createHoverElements();
}

function initializeDistanceTable(nodes) {
  const tableBody = document.getElementById("distance-table-body");
  if (!tableBody) {
    console.warn("⚠️ Table body element not found: #distance-table-body");
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

function showInputDialog() {
  document.getElementById("input-dialog").style.display = "block";
  document.getElementById("input-backdrop").style.display = "block";

  // Optional: prevent interactions underneath
  curRoomUI.isModalOpen = true;
}

function closeInputDialog() {
  const inputValue = document.getElementById("dialog-input").value.trim();
  const currentStep = tutorialSteps[curRoomUI.currentTutorialStep];
  const expected = currentStep.updatedDistance;
  const selectedEdge = currentStep.expectedEdges?.[0]; // [start, end]

  let isCorrect = false;

  // ✅ If distance input is expected, validate it
  if (expected) {
    const [node, correctValue] = Object.entries(expected)[0];

    if (inputValue === correctValue.toString()) {
      isCorrect = true;

      // ✅ Update distance table
      const cell = document.getElementById(`distance-${node}`);
      if (cell) cell.textContent = correctValue;

      // ✅ Mark edge as selected (no visual highlight)
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
          selectedLine.material.color.set(0x800080); // show red for correct tutorial step
          if (selectedLine.userData.label) {
            selectedLine.userData.label.material.color.set(0x000000);
          }
        }
      }
    }
  }

  // ✅ Close dialog either way
  document.getElementById("input-dialog").style.display = "none";
  document.getElementById("input-backdrop").style.display = "none";
  document.getElementById("dialog-input").value = "";
  curRoomUI.isModalOpen = false;

  if (isCorrect) {
    nextTutorialStep();
  } else {
    // ⛔ Handle intentionally wrong input step (like "try making a mistake")
    if (currentStep.advanceOnError) {
      setTimeout(() => {
        nextTutorialStep();
      }, 1000);
    } else {
      curRoomUI.uiText.innerText = "❌ Incorrect input. Try again.";
      shakeScreen?.();
    }
  }
}

// Attach handler once DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("dialog-ok-btn").onclick = closeInputDialog;
});

// ===== Function Decleration Section =====

// ===== Document Object Model & User Session Initialization Section =====
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
    chapterTitle = createNodeLabel(
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
// ===== Document Object Model & User Session Initialization Section =====

// ===== Scene Initialization Section =====
createThreePointLightingRoom(scene);
window.addEventListener("resize", onWindowResize, false);
window.closeInputDialog = closeInputDialog;
animate();
createDungeonRoom();
// ===== Scene Initialization Section =====

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
// ===== UI Callbacks Section =====
