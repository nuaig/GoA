import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Graph, createRandomConnectedGraph } from "./graph.js"; // Adjust the path as needed
import { createThreePointLighting } from "./utils/threePointLighting.js";
import { PrimAlgorithm } from "./utils/graphRelated/prims.js";
import { drawLine, setFont } from "./utils/graphRelated/drawLine.js";

const uiText = document.getElementById("UI-Text");
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

// const grid = new THREE.GridHelper(30, 30);
// scene.add(grid);

// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);

const controls = new OrbitControls(camera, renderer.domElement);

// Importing models
const closedChestURL = new URL("./src/Prop_Chest_CLosed.gltf", import.meta.url);
const openChestURL = new URL("./src/Prop_Chest_Gold.gltf", import.meta.url);
const dungeonRoomURL = new URL("./src/DungeonRoom.glb", import.meta.url);

const assetLoader = new GLTFLoader();
let chestList = [];
let openChestList = [];
const mixers = [];
const cubeSize = 1; // Define the size of the cube for positioning purposes
const minDistance = cubeSize * 3.5; // Minimum distance between chests, scaled by cube size
const gridSize = 15; // Size of the area within which chests will be placed
const labels = []; // Array to store text labels

// Create a random connected graph
const nodes = Array.from({ length: 7 }, (_, i) => i);
const totalEdges = 10; // Adjust the number of edges as needed
const graph = createRandomConnectedGraph(nodes, totalEdges);

// Initialize PrimAlgorithm
const prim = new PrimAlgorithm(graph);

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
        resolve(model);

        // Check for animations
        if (gltf.animations && gltf.animations.length) {
          const mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => {
            mixer.clipAction(clip).play();
          });
          mixers.push(mixer);
        }
      },
      undefined,
      function (error) {
        console.error(error);
        reject(error);
      }
    );
  });
}

// Function to highlight a chest
function highlightChest(chest) {
  const circleGeometry = new THREE.CircleGeometry(1, 32);
  const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  const circle = new THREE.Mesh(circleGeometry, circleMaterial);
  circle.position.set(
    chest.position.x,
    chest.position.y + 0.1,
    chest.position.z
  ); // Slightly above the chest
  circle.rotation.x = -Math.PI / 2;
  scene.add(circle);
  return circle;
}

// Create and position models sequentially to maintain order
async function createModels() {
  for (let i = 0; i < nodes.length; i++) {
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
      }
    }

    // Load the closed chest model at the valid position
    const closedModel = await loadModel(closedChestURL.href, position);
    chestList.push(closedModel);

    // Load the open chest model at the same position but keep it hidden initially
    const openModel = await loadModel(openChestURL.href, position);
    openModel.visible = false;
    openChestList.push(openModel);

    // Add a label in front of the chest
    const labelPosition = position.clone();
    labelPosition.x -= 0.55; // Adjust the height if needed
    labelPosition.z -= 0.5;
    createNodeLabel(`Chest ${i}`, labelPosition);
  }

  console.log("All models loaded. Final chestList:", chestList);

  // Highlight a random chest as the starting node
  const randomIndex = Math.floor(Math.random() * chestList.length);
  const startClosedChest = chestList[randomIndex];
  const startOpenChest = openChestList[randomIndex];
  const startLabelPosition = startClosedChest.position.clone();
  startLabelPosition.y += 2;
  startLabelPosition.z -= 1.5;
  startLabelPosition.x -= 0.95;
  createNodeLabel("Starting Point", startLabelPosition);
  // Hide the closed chest and show the open chest
  startClosedChest.visible = false;
  startOpenChest.visible = true;

  highlightChest(startOpenChest);

  // Set the starting node in Prim's algorithm
  prim.setStartingNode(randomIndex);

  drawLines();
}

// Load font for text geometry
const fontLoader = new FontLoader();
let font;
fontLoader.load(
  "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  (loadedFont) => {
    font = loadedFont;
    setFont(font); // Set the font for text labels
    createModels(); // Start creating models after font is loaded
  }
);

// Function to create node labels
function createNodeLabel(text, position) {
  const textGeometry = new TextGeometry(text, {
    font: font,
    size: 0.25,
    depth: 0.1,
  });
  const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Gold color
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(position.x, position.y, position.z + 1); // Position in front of the chest

  scene.add(textMesh);
}

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
  });

  // Hovering effect on lines
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.5;
  const mouse = new THREE.Vector2();
  let selectedLine = null;

  // Create the sphere for hover effect
  const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sphereInter = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereInter.visible = false;
  scene.add(sphereInter);

  function onMouseMove(event) {
    event.preventDefault();
    if (prim.isComplete()) {
      sphereInter.visible = false;
      return; // Stop hover effects when Prim's algorithm is complete
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([...lines, ...labels]);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      if (intersectedObject.userData.selected) {
        sphereInter.visible = false;
        return; // Skip already selected lines
      }

      sphereInter.position.copy(intersects[0].point);
      sphereInter.visible = true;

      if (selectedLine !== intersectedObject) {
        if (selectedLine && !selectedLine.userData.selected) {
          selectedLine.material.color.set(0x0000ff); // Reset previous line color
          if (selectedLine.userData.label) {
            selectedLine.userData.label.material.color.set(0x000000); // Reset previous label color
          }
        }
        selectedLine = intersectedObject;
        if (!selectedLine.userData.selected) {
          selectedLine.material.color.set(0x00ff00); // Highlight selected line
          if (selectedLine.userData.label) {
            selectedLine.userData.label.material.color.set(0x00ff00); // Highlight label
          }
        }
      }
    } else {
      sphereInter.visible = false;

      if (selectedLine && !selectedLine.userData.selected) {
        selectedLine.material.color.set(0x0000ff); // Reset previous line color
        if (selectedLine.userData.label) {
          selectedLine.userData.label.material.color.set(0x000000); // Reset previous label color
        }
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
        return; // Skip already selected lines
      }

      if (intersectedObject.userData) {
        const edge = intersectedObject.userData.edge;

        if (prim.selectEdge([edge.start, edge.end, edge.weight])) {
          effectForCorrectSelect();
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

          const permanentRing = createRing(0.6, 0.7, labelDepth, 0x000000);
          permanentRing.position.copy(
            intersectedObject.userData.label.position
          );
          permanentRing.position.y -= labelDepth / 2;
          scene.add(permanentRing);
          permanentRing.visible = true;
          ringList.push(permanentRing);

          console.log("Selected edges:", curAlgorithmForGraph.selectedEdges);
          console.log(
            "Current weight of the spanning tree:",
            prim.currentWeight
          );
          if (prim.isComplete()) {
            currentScore = Math.floor(currentScore * ((health + 1) * 0.1 + 1));
            uiText.innerHTML = `Congratulations! You've completed the game!<br>The total weight of the minimum spanning tree is ${curAlgorithmForGraph.currentWeight}.`;
            finalScoreText.innerHTML = `${currentScore}`;
            setStars(health);
            if (dungeonRoomMixer && dungeonRoomAction) {
              console.log("Completed, animation should begin");
              dungeonRoomAction.reset().play();
              console.log(dungeonRoomAction);
            }
            openModal(event);
            window.removeEventListener("mousemove", onMouseMove, false);
            window.removeEventListener("click", onClick, false);
          } else {
            uiText.innerText = `Correct! Current weight is ${prim.currentWeight}.`;
          }
        } else {
          // Incorrect selection
          shakeForWrongSelect();
          console.log("Incorrect edge selection:", edge);
          intersectedObject.material.color.set(0xff0000); // Set line to red
          if (intersectedObject.userData.label) {
            intersectedObject.userData.label.material.color.set(0xff0000); // Set label to red
          }
          health = updateHealth(health);
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
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

async function createDungeonRoom() {
  const position = new THREE.Vector3(0, -0.1, 0); // Position the floor slightly below the chests
  const dungeonRoom = await loadModel(dungeonRoomURL.href, position);
  dungeonRoom.scale.set(0.5, 0.5, 0.5); // Scale the floor tile if necessary
}

// Call the function to load the floor tile
createDungeonRoom();
