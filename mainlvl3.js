import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Graph, createRandomConnectedGraph } from "./graph.js"; // Adjust the path as needed
import { createThreePointLighting } from "./utils/threePointLighting.js";
import { KruskalAlgorithm } from "./kruskal.js";
import { drawLine, setFont } from "./utils/graphRelated/drawLine.js";

const modal = document.querySelector(".modal");
const overlay = document.querySelector(".overlay");
const buttonAgain = document.querySelector(".btn__again");
const buttonNext = document.querySelector(".btn__next");
/*
Graph related variables
------(((******)))---------
*/

let currentLevel = 1;
let curNodes;
let curEdges;
let graph;
// const colors = [#fa5252, #e64980, #be4bdb, #7950f2, #4c6ef5, #15aabf, #12b886,#40c057 , #fab005, #fd7e14]
const levelConfig = {
  1: { nodes: 6, edges: 5 },
  2: { nodes: 8, edges: 7 },
  3: { nodes: 10, edges: 9 },
};
const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
curNodes = Array.from({ length: numNodes }, (_, i) => i);
curEdges = numEdges;

//

// Create a random connected graph

graph = createRandomConnectedGraph(curNodes, curEdges);
// Click event to open hint
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

let health = 3;

function updateHealth() {
  const healthIcons = document.querySelectorAll(".health-icon");
  if (health >= 0 && health <= 3) {
    healthIcons[health].style.fill = "white";
    health--;
  } else {
    uiText.innerHTML = `Game Over. Better luck next time!`;
  }
}

// Initialize Three.js scene, camera, and renderer
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

const controls = new OrbitControls(camera, renderer.domElement);

// Importing models
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
const cubeSize = 1; // Define the size of the cube for positioning purposes
const minDistance = cubeSize * 8; // Minimum distance between chests, scaled by cube size
const gridSize = 40; // Size of the area within which chests will be placed
const labels = []; // Array to store text labels
let dungeonRoomMixer; // To store the mixer for the dungeon room animation
let dungeonRoomAction; // To store the action for the dungeon room animation
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

// Initialize KruskalAlgorithm
let kruskal = new KruskalAlgorithm(graph);

console.log("Generated Graph:", graph); // Debugging statement

// Function to load a model
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
          action.setLoop(THREE.LoopOnce); // Set the animation to play once
          action.clampWhenFinished = true; // Stop the animation at the last frame
          action.enabled = true;
          action.paused = false;
          mixers.push(mixer); // Add mixer to the mixers array
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

// Create and position models sequentially to maintain order
async function createModels() {
  // Function to check if three points form a valid triangle
  function isTriangleInequalitySatisfied(a, b, c, margin) {
    const ab = a.distanceTo(b);
    const bc = b.distanceTo(c);
    const ac = a.distanceTo(c);
    return (
      ab + bc > ac + margin && ab + ac > bc + margin && ac + bc > ab + margin
    );
  }

  const margin = 0.2; // Adjust the margin as needed

  for (let i = 0; i < curNodes.length; i++) {
    let validPosition = false;
    let position = new THREE.Vector3();

    // Loop until a valid position is found
    while (!validPosition) {
      // Set a random position in the x-z plane with y = 0
      const randomX = (Math.random() - 0.5) * gridSize;
      const randomZ = (Math.random() - 0.5) * gridSize;
      position.set(randomX, 0, randomZ);

      // Assume the position is valid
      validPosition = true;

      // Check against all existing chests in chestList
      for (let x = 0; x < chestList.length; x++) {
        if (chestList[x].position.distanceTo(position) < minDistance) {
          validPosition = false;
          break;
        }

        // Check against all pairs of existing chests
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

    // Load the closed chest model at the valid position
    const closedModel = await loadModel(closedChestURL.href, position);
    closedModel.model.scale.set(1.5, 1.5, 1.5);
    chestList.push(closedModel.model);

    // Load the open chest model at the same position but keep it hidden initially
    const openModel = await loadModel(openChestURL.href, position);
    openModel.model.visible = false;
    openChestList.push(openModel.model);

    // Add a label in front of the chest
    const labelPosition = position.clone();
    labelPosition.x -= 0.8; // Adjust the height if needed
    labelPosition.z -= 0.5;
    chestLabelList.push(createNodeLabel(`Chest ${i}`, labelPosition));
  }

  console.log("All models loaded. Final chestList:", chestList);
  drawLines();
}

// Load font for text geometry
const fontLoader = new FontLoader();
let font;
let chapterTitle;
let levelTitle;
fontLoader.load(
  "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  (loadedFont) => {
    font = loadedFont;
    setFont(font); // Set the font for text labels
    createModels(); // Start creating models after font is loaded
    chapterTitle = createNodeLabel(
      "Kruskal's Algorithm",
      new THREE.Vector3(7, 5, -22),
      0.7,
      0.3,
      0x212529
    );
    levelTitle = createNodeLabel(
      "Level 1",
      new THREE.Vector3(9, 3, -22),
      0.65,
      0.3,
      0x212529
    );
  }
);

// Function to create node labels
function createNodeLabel(
  text,
  position,
  size = 0.35,
  depth = 0.15,
  color = 0xffd700
) {
  const textGeometry = new TextGeometry(text, {
    font: font,
    size: size,
    depth: depth,
  });
  const textMaterial = new THREE.MeshBasicMaterial({ color: color }); // Gold color
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(position.x, position.y, position.z + 1.5); // Position in front of the chest

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
  // Remove the old geometry and material
  textMesh.geometry.dispose();
  textMesh.material.dispose();

  // Create new TextGeometry with the new text
  const newTextGeometry = new TextGeometry(newText, {
    font: font,
    size: size,
    depth: depth,
  });

  // Update the geometry and material of the textMesh
  textMesh.geometry = newTextGeometry;
  textMesh.material = new THREE.MeshBasicMaterial({ color: color });

  // If you need to update the position as well, do it here
  // textMesh.position.set(newPosition.x, newPosition.y, newPosition.z + 1.5);
}

function createRing(innerRadius, outerRadius, depth, color) {
  // Define the shape for the ring
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  // Define the extrusion settings
  const extrudeSettings = {
    depth: depth,
    bevelEnabled: false,
  };

  // Create the geometry and material
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2; // Rotate to match the label orientation
  ring.visible = false; // Initially hidden
  return ring;
}

// Create a ring mesh for hover effect
const labelDepth = 0.1; // Use the same depth as the label
let hoverRing = createRing(0.45, 0.5, labelDepth, 0x000000); // Adjust inner and outer radius and color as needed
scene.add(hoverRing);

// Function to draw lines between the chests
function drawLines() {
  console.log("Drawing lines between chests.");
  console.log("Graph edges:", graph.edges); // Debugging statement
  const lines = [];
  graph.edges.forEach(([start, end, weight]) => {
    console.log("Drawing line between:", start, end); // Debugging statement
    const edge = { start, end, weight }; // Create edge data
    const line = drawLine(
      chestList[start],
      chestList[end],
      weight,
      edge,
      scene
    ); // Pass edge data
    lines.push(line);
    edgeList.push(line);
    edgeLabelList.push(line.userData.label);
  });

  // Hovering effect on lines
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.5;
  const mouse = new THREE.Vector2();
  let selectedLine = null;

  // Create the sphere for hover effect
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
      return; // Stop hover effects when Kruskal's algorithm is complete
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([...lines, ...labels]);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      if (intersectedObject.userData.selected) {
        sphereInter.visible = false;
        hoverRing.visible = false;
        return; // Skip already selected lines
      }

      sphereInter.position.copy(intersects[0].point);
      sphereInter.visible = true;

      if (selectedLine !== intersectedObject) {
        if (selectedLine && !selectedLine.userData.selected) {
          selectedLine.material.color.set(0x74c0fc); // Reset previous line color
          hoverRing.visible = false; // Hide the previous ring
        }
        selectedLine = intersectedObject;
        if (!selectedLine.userData.selected) {
          selectedLine.material.color.set(0x00ff00); // Highlight selected line
          hoverRing.position.copy(selectedLine.userData.label.position); // Position the ring around the label
          hoverRing.visible = true; // Show the ring
        }
      }
    } else {
      sphereInter.visible = false;
      hoverRing.visible = false;

      if (selectedLine && !selectedLine.userData.selected) {
        selectedLine.material.color.set(0x74c0fc); // Reset previous line color
        hoverRing.visible = false; // Hide the previous ring
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
    const uiText = document.getElementById("UI-Text");

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      if (intersectedObject.userData.selected) {
        return; // Skip already selected lines
      }

      if (intersectedObject.userData) {
        const edge = intersectedObject.userData.edge;

        if (kruskal.selectEdge([edge.start, edge.end, edge.weight])) {
          // Correct selection
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

          // Create and position the permanent ring around the label
          const permanentRing = createRing(0.45, 0.5, labelDepth, 0x000000);
          permanentRing.position.copy(
            intersectedObject.userData.label.position
          );
          permanentRing.position.y -= labelDepth / 2; // Adjust the y-position to align with the label depth
          scene.add(permanentRing);
          permanentRing.visible = true; // Make the ring visible
          ringList.push(permanentRing);

          console.log("Selected edges:", kruskal.selectedEdges);
          console.log(
            "Current weight of the spanning tree:",
            kruskal.currentWeight
          );
          if (kruskal.isComplete()) {
            uiText.innerHTML = `Congratulations! You've completed the game!<br>The total weight of the minimum spanning tree is ${kruskal.currentWeight}.`;

            // Play the dungeon room animation once when the game is complete
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
          // Incorrect selection
          console.log("Incorrect edge selection:", edge);
          intersectedObject.material.color.set(0xff0000); // Set line to red
          if (intersectedObject.userData.label) {
            intersectedObject.userData.label.material.color.set(0xff0000); // Set label to red
          }
          updateHealth(); // Update health
          shakeScreen(); // Shake screen
          uiText.innerText = "Wrong selection. Try again.";
          setTimeout(() => {
            intersectedObject.material.color.set(0x0000ff); // Reset line color
            if (intersectedObject.userData.label) {
              intersectedObject.userData.label.material.color.set(0x000000); // Reset label color
            }
          }, 3000);
        }
      }
    }
  }

  window.addEventListener("mousemove", onMouseMove, false);
  window.addEventListener("click", onClick, false);
}

// Lighting
createThreePointLighting(scene);
camera.position.z = 15;
camera.position.y = 10;

// Function to handle window resizing
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize, false);

// Function for rendering the scene
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const deltaSeconds = clock.getDelta();
  mixers.forEach((mixer) => {
    mixer.update(deltaSeconds);
  }); // Update mixers
  controls.update();
  renderer.render(scene, camera);
}
animate();

async function createDungeonRoom() {
  const position = new THREE.Vector3(0, -0.1, 0); // Position the floor slightly below the chests
  try {
    const { model, mixer, action } = await loadModel(
      dungeonRoomURL.href,
      position
    );

    // if (model) {
    //   model.scale.set(0.5, 0.5, 0.5); // Scale the model
    // } else {
    //   console.error("Model is undefined.");
    // }

    if (mixer && action) {
      dungeonRoomMixer = mixer; // Store the mixer for later use
      dungeonRoomAction = action; // Store the action for later use
      console.log("Mixer and action initialized:", mixer, action);
      dungeonRoomAction.timeScale = 0.25;
      // Set to the last frame when the animation ends
      dungeonRoomAction.setLoop(THREE.LoopOnce);
      dungeonRoomAction.clampWhenFinished = true;
      dungeonRoomAction.paused = false;
    } else {
      console.error("Mixer or action is undefined.");
    }
  } catch (error) {
    console.error("Error loading dungeon room:", error);
  }
}

// Call the function to load the floor tile
createDungeonRoom();

// Advancing Next Level
function resetScene() {
  // Remove all chests and labels from the scene
  chestList.forEach((chest) => scene.remove(chest));
  openChestList.forEach((chest) => scene.remove(chest));
  chestLabelList.forEach((label) => scene.remove(label));
  edgeList.forEach((edge) => scene.remove(edge));
  edgeLabelList.forEach((label) => scene.remove(label));
  ringList.forEach((ring) => scene.remove(ring));

  // Clear the lists
  chestList.length = 0;
  openChestList.length = 0;
  chestLabelList.length = 0;
  edgeList.length = 0;
  edgeLabelList.length = 0;
  ringList.length = 0;
  labels.length = 0; // Clear labels
  mixers.length = 0; // Clear mixers

  // Remove hover sphere from the scene
  if (sphereInter) {
    scene.remove(sphereInter);
    sphereInter.geometry.dispose(); // Dispose of the geometry
    sphereInter.material.dispose(); // Dispose of the material
  }

  // Hide hover ring
  hoverRing.visible = false;

  // Optionally remove hoverRing from scene if you want it to be recreated later
  // scene.remove(hoverRing);
}

function createHoverElements() {
  // Create the hover sphere
  const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  sphereInter = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereInter.visible = false;
  scene.add(sphereInter);

  // Create the hover ring
  hoverRing = createRing(0.45, 0.5, labelDepth, 0x000000);
  hoverRing.visible = false;
  scene.add(hoverRing);
}

function advanceNextLevel() {
  // Retrieve the configuration for the next level
  const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
  curNodes = Array.from({ length: numNodes }, (_, i) => i);
  curEdges = numEdges;

  // Create a new random connected graph
  graph = createRandomConnectedGraph(curNodes, curEdges);

  // Initialize KruskalAlgorithm with the new graph
  kruskal = new KruskalAlgorithm(graph);

  // Recreate the models and necessary elements for the new level
  createModels();

  // Recreate the hover elements
  createHoverElements();
}

buttonNext.addEventListener("click", () => {
  currentLevel++;
  closeModal();
  resetScene();
  advanceNextLevel();
  updateNodeLabel(levelTitle, `Level ${currentLevel}`, 0.65, 0.15, 0x212529);
  // Recreate hover sphere and ring if necessary
  // createHoverElements(); // Implement this function if needed
});
