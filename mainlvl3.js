import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Graph, createRandomConnectedGraph } from "./graph.js";
import { createThreePointLighting } from "./utils/threePointLighting.js";
import { KruskalAlgorithm } from "./kruskal.js";
import { drawLine, setFont } from "./utils/graphRelated/drawLine.js";

const colors = [
  "#fa5252",
  "#e64980",
  "#be4bdb",
  "#7950f2",
  "#4c6ef5",
  "#15aabf",
  "#12b886",
  "#40c057",
  "#fab005",
  "#fd7e14",
];

function toggleInstructions() {
  const instructions = document.getElementsByClassName(
    "topnav-instructions"
  )[0];
  if (instructions.style.display === "block") {
    instructions.style.display = "none";
  } else {
    instructions.style.display = "block";
  }
}

window.toggleInstructions = toggleInstructions;

function getRandomColor() {
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}

const uiText = document.getElementById("UI-Text");
const scoreText = document.querySelector(".score-label-2");
const finalScoreText = document.querySelector(".label__final_score span");
const stars = document.querySelectorAll(".star path:last-child");
const modal = document.querySelector(".modal");
const instructionModal = document.querySelector(".instruction");
const overlay = document.querySelector(".overlay");
const hoverEffect = document.querySelector(".hover");

const buttonAgain = document.querySelector(".btn__again");
const buttonNext = document.querySelector(".btn__next");
const buttonStart = document.querySelector(".btn__instruction__start");

buttonStart.addEventListener("click", () => {
  console.log("clicked");
  overlay.classList.add("hidden");
  instructionModal.classList.add("hidden");
});

function effectForCorrectSelect() {
  const elements = document.querySelectorAll(".correct__select");
  elements.forEach((element) => {
    element.classList.add("highlight__correct");

    // Remove the class after the animation is done to allow re-triggering
    setTimeout(() => {
      element.classList.remove("highlight__correct");
    }, 2000); // 500ms matches the animation duration
  });
}

function shakeForWrongSelect() {
  const elements = document.querySelectorAll(".wrong__select");
  elements.forEach((element) => {
    element.classList.add("highlight__wrong");

    // Remove the class after the animation is done to allow re-triggering
    setTimeout(() => {
      element.classList.remove("highlight__wrong");
    }, 2000); // 500ms matches the animation duration
  });
}

let currentScore = 0;
let currentLevel = 1;
let curNodes;
let curEdges;
let graph;

const levelConfig = {
  1: { nodes: 6, edges: 8 },
  2: { nodes: 8, edges: 13 },
  3: { nodes: 10, edges: 16 },
};
const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
curNodes = Array.from({ length: numNodes }, (_, i) => i);
curEdges = numEdges;

graph = createRandomConnectedGraph(curNodes, curEdges);

let componentColors = {};

function updateComponentColors(uf, nodes) {
  const newColors = {};
  nodes.forEach((node) => {
    const root = uf.find(node);
    if (!newColors[root]) {
      newColors[root] = getRandomColor();
    }
    componentColors[node] = newColors[root];
  });
}

function updateNodeLabelColor(textMesh, color) {
  textMesh.material.color.set(color);
}

let kruskal = new KruskalAlgorithm(graph);

let health = 4;

function updateHealth() {
  const healthIcons = document.querySelectorAll(".health-icon");
  if (health >= 0 && health <= 4) {
    healthIcons[health].style.fill = "white";
    health--;
  } else {
    uiText.innerHTML = `Game Over. Better luck next time!`;
  }
}

function resetHealth() {
  health = 4;
  const healthIcons = document.querySelectorAll(".health-icon");
  for (let i = 0; i <= health; i++) {
    healthIcons[i].style.fill = "red";
  }
}

function setStars() {
  let numStars;
  if (health === 4) {
    numStars = 2;
  } else if (health >= 2 && health < 4) {
    // Updated the condition to prevent overlap
    numStars = 1;
  } else if (health >= 0 && health < 2) {
    numStars = 0;
  } else {
    numStars = -1;
  }
  console.log(numStars);

  for (let i = 0; i <= numStars; i++) {
    stars[i].style.fill = "#fab005"; // Ensure the color is a string
  }
}

function resetStars() {
  for (let i = 0; i <= 2; i++) {
    stars[i].style.fill = "#e9ecef"; // Ensure the color is a string
  }
}

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

const assetLoader = new GLTFLoader();
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
let levelComplete;

const openModal = function (e) {
  e.preventDefault();
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
};

const closeModal = function () {
  modal.classList.add("hidden");
  overlay.classList.add("hidden");
};

function loadModel(url, position) {
  return new Promise((resolve, reject) => {
    assetLoader.load(
      url,
      function (gltf) {
        const model = gltf.scene.clone();
        model.position.copy(position);
        scene.add(model);

        let mixer = null;
        let action = null;
        if (gltf.animations && gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          action = mixer.clipAction(gltf.animations[0]);
          action.setLoop(THREE.LoopOnce);
          action.clampWhenFinished = true;
          action.enabled = true;
          action.paused = false;
          mixers.push(mixer);
        }

        resolve({ model, mixer, action });
      },
      undefined,
      function (error) {
        console.error(error);
        reject(error);
      }
    );
  });
}

async function createModels() {
  function isTriangleInequalitySatisfied(a, b, c, margin) {
    const ab = a.distanceTo(b);
    const bc = b.distanceTo(c);
    const ac = a.distanceTo(c);
    return (
      ab + bc > ac + margin && ab + ac > bc + margin && ac + bc > ab + margin
    );
  }

  const margin = 0.1;

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

    const closedModel = await loadModel(closedChestURL.href, position);
    closedModel.model.scale.set(1.5, 1.5, 1.5);
    chestList.push(closedModel.model);

    const openModel = await loadModel(openChestURL.href, position);
    openModel.model.visible = false;
    openChestList.push(openModel.model);

    const labelPosition = position.clone();
    // labelPosition.x -= 0.35;

    // labelPosition.z -= 0.4;
    labelPosition.x -= 0.35;
    labelPosition.y += 1.5;
    labelPosition.z -= 1.5;

    const chestLabel = createNodeLabel(`${i}`, labelPosition);
    chestLabelList.push(chestLabel);
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
      new THREE.Vector3(8, 6, -33),
      1,
      0.3,
      0x212529
    );
    levelTitle = createNodeLabel(
      "Level 1",
      new THREE.Vector3(11, 4, -33),
      0.9,
      0.3,
      0x212529
    );
  }
);

function createNodeLabel(
  text,
  position,
  size = 0.8,
  depth = 0.15,
  color = 0xffd700
) {
  const textGeometry = new TextGeometry(text, {
    font: font,
    size: size,
    depth: depth,
  });
  const textMaterial = new THREE.MeshBasicMaterial({ color: color });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(position.x, position.y, position.z + 1.5);

  scene.add(textMesh);
  return textMesh;
}

function updateNodeLabel(
  textMesh,
  newText,
  size = 0.35,
  depth = 0.15,
  color = 0xffd700
) {
  textMesh.geometry.dispose();
  textMesh.material.dispose();

  const newTextGeometry = new TextGeometry(newText, {
    font: font,
    size: size,
    depth: depth,
  });

  textMesh.geometry = newTextGeometry;
  textMesh.material = new THREE.MeshBasicMaterial({ color: color });
}

function createRing(innerRadius, outerRadius, depth, color) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const extrudeSettings = {
    depth: depth,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  return ring;
}

const labelDepth = 0.1;
let hoverRing = createRing(0.6, 0.7, labelDepth, 0x000000);
scene.add(hoverRing);

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

  function onMouseMove(event) {
    event.preventDefault();
    if (kruskal.isComplete()) {
      sphereInter.visible = false;
      hoverRing.visible = false;
      return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([...lines, ...labels]);

    if (intersects.length > 0) {
      hoverEffect.classList.add("highlight");
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
      hoverEffect.classList.remove("highlight");
      sphereInter.visible = false;
      hoverRing.visible = false;

      if (selectedLine && !selectedLine.userData.selected) {
        selectedLine.material.color.set(0x74c0fc);
        hoverRing.visible = false;
      }
      selectedLine = null;
    }
  }

  function shakeScreen() {
    document.body.classList.add("shake");
    setTimeout(() => {
      document.body.classList.remove("shake");
    }, 500);
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
        return;
      }

      if (intersectedObject.userData) {
        const edge = intersectedObject.userData.edge;
        const rootStart = kruskal.uf.find(edge.start);
        const rootEnd = kruskal.uf.find(edge.end);
        const sameTree = rootStart === rootEnd;

        if (kruskal.selectEdge([edge.start, edge.end, edge.weight])) {
          effectForCorrectSelect();
          if (sameTree) {
            const color = componentColors[rootStart];
            updateNodeLabelColor(chestLabelList[edge.start], color);
            updateNodeLabelColor(chestLabelList[edge.end], color);
          } else {
            const nodesWithSameParentStart = kruskal.getAllNodesWithSameParent(
              edge.start
            );
            const nodesWithSameParentEnd = kruskal.getAllNodesWithSameParent(
              edge.end
            );
            const newColor = getRandomColor();

            nodesWithSameParentStart
              .concat(nodesWithSameParentEnd)
              .forEach((node) => {
                updateNodeLabelColor(chestLabelList[node], newColor);
                componentColors[node] = newColor;
              });
          }

          intersectedObject.userData.selected = true;

          const { startCube, endCube } = intersectedObject.userData;
          const closedStart = chestList[chestList.indexOf(startCube)];
          const openStart = openChestList[chestList.indexOf(startCube)];
          const closedEnd = chestList[chestList.indexOf(endCube)];
          const openEnd = openChestList[chestList.indexOf(endCube)];

          closedStart.visible = false;
          openStart.visible = true;
          closedEnd.visible = false;
          openEnd.visible = true;

          const permanentRing = createRing(0.6, 0.7, labelDepth, 0x000000);
          permanentRing.position.copy(
            intersectedObject.userData.label.position
          );
          permanentRing.position.y -= labelDepth / 2;
          scene.add(permanentRing);
          permanentRing.visible = true;
          ringList.push(permanentRing);

          console.log("Selected edges:", kruskal.selectedEdges);
          console.log(
            "Current weight of the spanning tree:",
            kruskal.currentWeight
          );

          currentScore += 10;
          scoreText.innerHTML = `${currentScore}`;
          if (kruskal.isComplete()) {
            currentScore = Math.floor(currentScore * ((health + 1) * 0.1 + 1));
            uiText.innerHTML = `Congratulations! You've completed the game!<br>The total weight of the minimum spanning tree is ${kruskal.currentWeight}.`;
            finalScoreText.innerHTML = `${currentScore}`;
            setStars();
            if (dungeonRoomMixer && dungeonRoomAction) {
              console.log("Completed, animation should begin");
              dungeonRoomAction.reset().play();
              console.log(dungeonRoomAction);
            }
            openModal(event);
            window.removeEventListener("mousemove", onMouseMove, false);
            window.removeEventListener("click", onClick, false);
          } else {
            uiText.innerText = `Correct! Current weight is ${kruskal.currentWeight}.`;
          }
        } else {
          shakeForWrongSelect();
          console.log("Incorrect edge selection:", edge);
          intersectedObject.material.color.set(0xff0000);
          if (intersectedObject.userData.label) {
            intersectedObject.userData.label.material.color.set(0xff0000);
          }
          updateHealth();
          shakeScreen();
          uiText.innerText = "Wrong selection. Try again.";
          setTimeout(() => {
            intersectedObject.material.color.set(0x74c0fc);
            if (intersectedObject.userData.label) {
              intersectedObject.userData.label.material.color.set(0x000000);
            }
          }, 3000);
        }
      }
    }
  }

  window.addEventListener("mousemove", onMouseMove, false);
  window.addEventListener("click", onClick, false);

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
}

async function createDungeonRoom() {
  const position = new THREE.Vector3(0, -0.1, 0);
  try {
    const { model, mixer, action } = await loadModel(
      dungeonRoomURL.href,
      position
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

  currentScore = 0;
  scoreText.innerHTML = "00";
  resetStars();

  if (sphereInter) {
    scene.remove(sphereInter);
    sphereInter.geometry.dispose();
    sphereInter.material.dispose();
  }

  hoverRing.visible = false;
}

function createHoverElements() {
  const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  sphereInter = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereInter.visible = false;
  scene.add(sphereInter);

  hoverRing = createRing(0.6, 0.7, labelDepth, 0x000000);
  hoverRing.visible = false;
  scene.add(hoverRing);
}

function advanceNextLevel() {
  const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
  curNodes = Array.from({ length: numNodes }, (_, i) => i);
  curEdges = numEdges;

  graph = createRandomConnectedGraph(curNodes, curEdges);
  kruskal = new KruskalAlgorithm(graph);

  updateComponentColors(kruskal.uf, curNodes);
  createModels();
  createHoverElements();
}

buttonNext.addEventListener("click", () => {
  uiText.innerHTML = `Please click on the Edge to Create Minimum Spanning Tree`;
  resetHealth();
  currentLevel++;
  closeModal();
  resetScene();
  advanceNextLevel();
  updateNodeLabel(levelTitle, `Level ${currentLevel}`, 0.9, 0.3, 0x212529);
});

buttonAgain.addEventListener("click", () => {
  uiText.innerHTML = `Please click on the Edge to Create Minimum Spanning Tree`;
  resetHealth();

  closeModal();
  resetScene();
  advanceNextLevel();
  updateNodeLabel(levelTitle, `Level ${currentLevel}`, 0.9, 0.3, 0x212529);
});
