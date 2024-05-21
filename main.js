import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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
const numChests = 7;
const cubeSize = 1; // Define the size of the cube for positioning purposes
const minDistance = cubeSize * 3.5; // Minimum distance between cubes, scaled by cube size
const gridSize = 15; // Size of the area within which cubes will be placed

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
  for (let i = 0; i < numChests; i++) {
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

      // Check against all existing cubes in chestList
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

// Function to draw lines between the chests
function drawLines() {
  console.log("Drawing lines between chests.");
  const lines = [];
  for (let i = 1; i < chestList.length; i++) {
    const line = drawLine(chestList[0], chestList[i]);
    lines.push(line);
  }

  // Hovering effect on lines
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.5;
  const mouse = new THREE.Vector2();
  let selectedLine = null;
  let previousChests = [];

  function onMouseMove(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(lines);

    if (intersects.length > 0) {
      if (selectedLine !== intersects[0].object) {
        if (selectedLine) {
          selectedLine.material.color.set(0x0000ff); // Reset previous line color
          previousChests.forEach(({ closed, open }) => {
            closed.visible = true; // Show closed chest
            open.visible = false; // Hide open chest
          });
        }
        selectedLine = intersects[0].object;
        selectedLine.material.color.set(0xff0000); // Highlight selected line

        const { startCube, endCube } = selectedLine.userData;
        previousChests = [
          {
            closed: startCube,
            open: openChestList[chestList.indexOf(startCube)],
          },
          { closed: endCube, open: openChestList[chestList.indexOf(endCube)] },
        ];
        previousChests.forEach(({ closed, open }) => {
          closed.visible = false; // Hide closed chest
          open.visible = true; // Show open chest
        });
      }
    } else {
      if (selectedLine) {
        selectedLine.material.color.set(0x0000ff); // Reset previous line color
        previousChests.forEach(({ closed, open }) => {
          closed.visible = true; // Show closed chest
          open.visible = false; // Hide open chest
        });
      }
      selectedLine = null;
      previousChests = [];
    }
  }

  window.addEventListener("mousemove", onMouseMove, false);
}

// Function to draw a line between two cubes
function drawLine(startCube, endCube) {
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
  line.userData = { startCube, endCube };
  scene.add(line);
  return line;
}

// Lighting
function createThreePointLighting() {
  const three_point_lighting_prefab = new THREE.Group();
  const light = new THREE.AmbientLight(0xffffff, 1);
  const light1 = new THREE.DirectionalLight(0xffffff, 5);
  const light2 = new THREE.DirectionalLight(0xffffff, 1);
  const light3 = new THREE.DirectionalLight(0xffffff, 1);

  light1.position.x += 100;
  light2.position.x -= 100;
  light3.position.z += 100;

  three_point_lighting_prefab.add(light);
  three_point_lighting_prefab.add(light1);
  three_point_lighting_prefab.add(light2);
  three_point_lighting_prefab.add(light3);

  scene.add(three_point_lighting_prefab);
}

createThreePointLighting();
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

// Start creating models
createModels();
