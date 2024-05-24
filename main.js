import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Graph, createRandomConnectedGraph } from "./graph.js"; // Adjust the path as needed
import { createThreePointLighting } from "./utils/threePointLighting.js";
import { KruskalAlgorithm } from "./kruskal.js";

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

const grid = new THREE.GridHelper(30, 30);
scene.add(grid);

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

const controls = new OrbitControls(camera, renderer.domElement);

// Importing models
const closedChestURL = new URL("./src/Prop_Chest_CLosed.gltf", import.meta.url);
const openChestURL = new URL("./src/Prop_Chest_Gold.gltf", import.meta.url);

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

// Initialize KruskalAlgorithm
const kruskal = new KruskalAlgorithm(graph);

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
  }

  console.log("All models loaded. Final chestList:", chestList);
  drawLines();
}

// Load font for text geometry
const fontLoader = new FontLoader();
let font;
fontLoader.load(
  "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  (loadedFont) => {
    font = loadedFont;
    createModels(); // Start creating models after font is loaded
  }
);

// Function to create text labels
function createLabel(text, position) {
  const textGeometry = new TextGeometry(text, {
    font: font,
    size: 0.25,
    depth: 0.1,
  });
  const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.copy(position);
  textMesh.rotation.x = -Math.PI / 2;
  scene.add(textMesh);
  labels.push(textMesh);
  return textMesh;
}
function drawLines() {
  console.log("Drawing lines between chests.");
  console.log("Graph edges:", graph.edges); // Debugging statement
  const lines = [];
  graph.edges.forEach(([start, end, weight]) => {
    console.log("Drawing line between:", start, end); // Debugging statement
    const edge = { start, end, weight }; // Create edge data
    const line = drawLine(chestList[start], chestList[end], weight, edge); // Pass edge data
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

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([...lines, ...labels]);

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
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
      if (intersectedObject.userData) {
        const edge = intersectedObject.userData.edge;

        if (kruskal.selectEdge([edge.start, edge.end, edge.weight])) {
          // Correct selection
          intersectedObject.material.color.set(0x00ff00); // Set line to green
          intersectedObject.userData.selected = true; // Mark as selected
          if (intersectedObject.userData.label) {
            intersectedObject.userData.label.material.color.set(0x00ff00); // Set label to green
          }
          const { startCube, endCube } = intersectedObject.userData;
          const closedStart = chestList[chestList.indexOf(startCube)];
          const openStart = openChestList[chestList.indexOf(startCube)];
          const closedEnd = chestList[chestList.indexOf(endCube)];
          const openEnd = openChestList[chestList.indexOf(endCube)];

          closedStart.visible = false;
          openStart.visible = true;
          closedEnd.visible = false;
          openEnd.visible = true;

          console.log("Selected edges:", kruskal.selectedEdges);
          console.log(
            "Current weight of the spanning tree:",
            kruskal.currentWeight
          );

          // Remove the selected line and label from the hover effect arrays
          lines.splice(lines.indexOf(intersectedObject), 1);
          labels.splice(labels.indexOf(intersectedObject.userData.label), 1);
        } else {
          // Incorrect selection
          console.log("Incorrect edge selection:", edge);
          intersectedObject.material.color.set(0xff0000); // Set line to red
          if (intersectedObject.userData.label) {
            intersectedObject.userData.label.material.color.set(0xff0000); // Set label to red
          }

          // Shake the screen
          shakeScreen();

          // Reset colors after 3 seconds
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

// Function to draw a line between two chests
function drawLine(startCube, endCube, weight, edge) {
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
  const points = [];

  const numSegments = 50; // Increase the number of segments for more precision
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const x =
      startCube.position.x + t * (endCube.position.x - startCube.position.x);
    const y =
      startCube.position.y + t * (endCube.position.y - startCube.position.y);
    const z =
      startCube.position.z + t * (endCube.position.z - startCube.position.z);
    points.push(new THREE.Vector3(x, y, z));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, lineMaterial);
  scene.add(line);

  // Create label in the middle of the line
  const midPoint = new THREE.Vector3(
    (startCube.position.x + endCube.position.x) / 2,
    (startCube.position.y + endCube.position.y) / 2,
    (startCube.position.z + endCube.position.z) / 2
  );
  const label = createLabel(weight.toString(), midPoint);
  line.userData = { startCube, endCube, label, edge, selected: false }; // Store edge data and selected state

  return line;
}

// Lighting

createThreePointLighting(scene);
camera.position.z = 15;

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
