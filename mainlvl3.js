import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Graph, createRandomConnectedGraph } from "./graph.js";
import { createThreePointLighting } from "./utils/threePointLighting.js";
import { KruskalAlgorithm } from "./utils/graphRelated/kruskal.js";
import { PrimAlgorithm } from "./utils/graphRelated/prims.js";
import { loadModel } from "./utils/threeModels.js";
import {
  toggleInstructions,
  closePseudocode,
  updateHealth,
  resetHealth,
  setStars,
  resetStars,
  updateHintIcons,
} from "./utils/UI/ui.js";
import {
  effectForCorrectSelect,
  shakeForWrongSelect,
  shakeScreen,
} from "./utils/UI/animations.js";
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
} from "./utils/graphRelated/drawLine.js";

const uiText = document.getElementById("UI-Text");
const scoreText = document.querySelector(".score-label-2");
const finalScoreText = document.querySelector(".label__final_score span");
const stars = document.querySelectorAll(".star path:last-child");
const modal = document.querySelector(".modal");
const instructionModal = document.querySelector(".instruction");
const overlay = document.querySelector(".overlay");
const hoverEffects = document.querySelectorAll(".hover");

const pseudoBoxButton = document.querySelector(".Pesudocode-Box-Action");
const reArrangeButton = document.querySelector(".Rearrange-Action");

const buttonAgain = document.querySelector(".btn__again");
const buttonNext = document.querySelector(".btn__next");
const buttonStart = document.querySelector(".btn__instruction__start");

buttonStart.addEventListener("click", () => {
  console.log("clicked");
  overlay.classList.add("hidden");
  instructionModal.classList.add("hidden");
});

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

let currentScore = 0;
let currentLevel = 1;
let curNodes;
let curEdges;
let graph;

const levelConfig = {
  1: { nodes: 6, edges: 9 },
  2: { nodes: 3, edges: 3 },
  3: { nodes: 3, edges: 3 },

  4: { nodes: 6, edges: 8 },
  5: { nodes: 8, edges: 12 },
  6: { nodes: 9, edges: 15 },
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

window.toggleInstructions = function () {
  toggleInstructions(currentAlgorithm);
};

pseudoBoxButton.addEventListener("click", () => {
  toggleInstructions(currentAlgorithm);
});

let health = 4;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0xa3a3a3);
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

camera.position.set(0, 26, 26); // Set the camera position

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 4);

const closedChestURL = new URL("./src/Prop_Chest_CLosed.gltf", import.meta.url);
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
const labels = [];
let dungeonRoomMixer;
let dungeonRoomAction;

const openModal = function () {
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
};

const closeModal = function () {
  modal.classList.add("hidden");
  overlay.classList.add("hidden");
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
  scoreText.innerHTML = `${currentScore}`;
}

function handleEdgeSelection(
  intersectedObject,
  currentAlgorithm,
  onClick,
  onMouseMove
) {
  const edge = intersectedObject.userData.edge;
  // let rootStart, rootEnd, sameTree;
  // if (currentAlgorithm === "kruskal") {
  //   rootStart = curAlgorithmForGraph.uf.find(edge.start);
  //   rootEnd = curAlgorithmForGraph.uf.find(edge.end);
  //   sameTree = rootStart === rootEnd;
  // }

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
      setStars(health);
      if (dungeonRoomMixer && dungeonRoomAction) {
        console.log("Completed, animation should begin");
        dungeonRoomAction.reset().play();
        console.log(dungeonRoomAction);
      }
      openModal();
      window.removeEventListener("mousemove", onMouseMove, false);
      window.removeEventListener("click", onClick, false);
    } else {
      uiText.innerText = `Correct! Current weight is ${currentWeight}.`;
    }
  } else {
    shakeForWrongSelect();
    console.log("Incorrect edge selection:", edge);
    intersectedObject.material.color.set(0xff0000); // Set line to red
    if (intersectedObject.userData.label) {
      intersectedObject.userData.label.material.color.set(0xff0000); // Set label to red
    }
    health = updateHealth(health);
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
    // if (selectEdgeResult === -1) {
    //   if (currentAlgorithm === "kruskal") {
    //     uiText.innerText =
    //       "Incorrect Selection. The selected edge forms a cycle and a tree cannot have any cycle. To create a minimum spanning tree using Kruskal's, please select the edge with the minimum weight that doesn't form a cycle among remaining edges.";
    //   } else {
    //     uiText.innerText =
    //       "Incorrect Selection. The selected edge forms a cycle and a tree cannot have any cycle. To create a minimum spanning tree using Prim's, please select the edge with the minimum weight connected to the tree that won't form a cycle.";
    //   }
    // } else if (selectEdgeResult === -2) {
    //   if (currentAlgorithm === "kruskal") {
    //     uiText.innerText =
    //       "Incorrect Selection. Although the selected edge doesn't form a cycle, it is not the edge with the minimum weight among remaining edges. To create a minimum spanning tree using Kruskal's, please select the edge with the minimum weight that doesn't form a cycle among remaining edges.";
    //   } else {
    //     uiText.innerText =
    //       "Incorrect Selection. Although the selected edge connects to the tree and doesn't form a cycle, it is not the edge with the minimum weight. To create a minimum spanning tree using Prim's, please select the edge with the minimum weight connected to the tree that won't form a cycle.";
    //   }
    // } else {
    //   uiText.innerText =
    //     "Incorrect Selection. The selected edge doesn't connect to the current tree. To create a minimum spanning tree using Prim's, please select the edge with the minimum weight connected to the tree that won't form a cycle.";
    // }
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
  console.log(edgeList[0].userData.startCube);

  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.5;
  const mouse = new THREE.Vector2();
  let selectedLine = null;

  const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  sphereInter = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereInter.visible = false;
  scene.add(sphereInter);

  function onMouseMove(event) {
    event.preventDefault();
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
  }

  function onClick(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([...lines, ...labels]);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      if (intersectedObject.userData.selected) {
        return; // Skip already selected lines
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
  }

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
      console.error("Mixer or action is undefined.");
    }
    model.scale.set(1.5, 1.5, 1.5);
  } catch (error) {
    console.error("Error loading dungeon room:", error);
  }
}

createDungeonRoom();

function resetScene() {
  chestList.forEach((chest) => scene.remove(chest));
  openChestList.forEach((chest) => scene.remove(chest));
  chestLabelList.forEach((label) => scene.remove(label));
  edgeList.forEach((edge) => scene.remove(edge));
  edgeLabelList.forEach((label) => scene.remove(label));
  ringList.forEach((ring) => scene.remove(ring));

  chestList.length = 0;
  openChestList.length = 0;
  chestLabelList.length = 0;
  edgeList.length = 0;
  edgeLabelList.length = 0;
  ringList.length = 0;
  labels.length = 0;
  mixers.length = 0;

  usedColors.clear();
  componentColors = {};

  currentScore = 0;
  scoreText.innerHTML = "00";
  resetStars();

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

function advanceNextLevel() {
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

buttonNext.addEventListener("click", () => {
  uiText.innerHTML = `Please click on the Edge to Create Minimum Spanning Tree`;
  health = resetHealth();
  currentLevel++;
  closeModal();
  closePseudocode();
  resetScene();
  advanceNextLevel();
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
  uiText.innerHTML = `Please click on the Edge to Create Minimum Spanning Tree`;
  health = resetHealth();

  closeModal();
  resetScene();
  advanceNextLevel();
  updateNodeLabel(levelTitle, `Level ${currentLevel}`, 0.9, 0.3, 0x212529);
});
