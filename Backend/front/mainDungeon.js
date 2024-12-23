import * as THREE from "three";
import { loadModel } from "./utils/threeModels.js";
import * as CANNON from "cannon-es";
import { createThreePointLighting } from "./utils/threePointLighting.js";
import { Player } from "./utils/lockedFirstPersonCam/player.js";
import { GameStatusService } from "./utils/gameStatus/gameStatusService.js";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import { gsap } from "gsap";

document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Make a request to check if the user is logged in
    const response = await fetch("/api/users/getUser", {
      method: "GET",
      credentials: "include", // Include cookies in the request
    });

    // Check if the user is logged in
    if (response.ok) {
      const userData = await response.json();
      console.log("User is logged in:", userData);
      // Initialize GameStatusService with the logged-in userId
      gameStatusService = new GameStatusService(userData.id);

      // Await the initialization of GameStatusService (including fetching game status)
      await gameStatusService.init();

      createMainDungeon();
    } else {
      sessionStorage.setItem("userAuthenticated", "false");
      // If the user is not logged in, redirect to login page
      console.warn("User is not logged in. Redirecting to login page.");
      window.location.href = "signInSignUp.html";
    }
  } catch (error) {
    console.error("Error checking login status:", error);
    // Optionally redirect to login in case of an error
    window.location.href = "signInSignUp.html";
  }

  const loginSuccess = sessionStorage.getItem("loginSuccess");
  const kruskalSuccess = sessionStorage.getItem("kruskal");
  if (loginSuccess) {
    Toastify({
      text: "Logged In Successfully!",
      duration: 3000, // Duration in milliseconds
      close: true, // Show close button
      gravity: "top", // Position: 'top' or 'bottom'
      position: "right", // Position: 'left', 'center' or 'right'
      backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)", // Custom background color
    }).showToast();
    sessionStorage.setItem("loginSuccess", "false");
  }
  const focusIcon = document.querySelector(".Pesudocode-Box-Action");

  // Check if the effect has already been shown
  const effectShown = localStorage.getItem("effectShown");

  if (!effectShown) {
    // Create and append the overlay
    const overlay = document.createElement("div");
    overlay.classList.add("focus-overlay");
    document.body.appendChild(overlay);

    // Function to remove the pulse effect and overlay
    function removeFocusEffectAndShowControls() {
      overlay.remove(); // Remove the overlay
      focusIcon.style.animation = "none"; // Stop the pulse animation
      focusIcon.classList.remove("focus-effect"); // Remove the class if it still exists
      openModal(controlsModal);

      // Store a flag in localStorage to indicate the effect has been shown
      localStorage.setItem("effectShown", "true");
    }

    // Remove focus mode after a certain time or on click
    focusIcon.addEventListener("click", removeFocusEffectAndShowControls);
  } else {
    focusIcon.style.animation = "none"; // Stop the pulse animation
    focusIcon.classList.remove("focus-effect");
  }
});

const controlsModal = document.querySelector(".modal__control");
const overlay = document.querySelector(".overlay");
const controlsCloseButton = document.querySelector(
  ".modal__control .btn__close"
);
const settingsCloseButton = document.querySelector(
  ".modal__settings .btn__close"
);
const leaderboardCloseButton = document.querySelector(
  ".modal__leaderboard .btn__close"
);

const leaderboardTogglerEle = document.querySelector(".Leaderboard-icon");
const leaderboardModal = document.querySelector(".modal__leaderboard");
const settingsModal = document.querySelector(".modal__settings");
const settingsTogglerEle = document.querySelector(".settings__icon");
const restartHandler = document.querySelector(".btn__restart");
const symbol_dict = {
  kruskal: null,
  heapsort: null,
  prim: null,
};
let gameStatusService;

const openModal = function (modalType) {
  modalType.classList.remove("hidden");
  overlay.classList.remove("hidden");
};

const closeModal = function (modalType) {
  modalType.classList.add("hidden");
  overlay.classList.add("hidden");
};

controlsCloseButton.addEventListener("click", () => {
  closeModal(controlsModal);
});

settingsCloseButton.addEventListener("click", () => {
  closeModal(settingsModal);
});

leaderboardCloseButton.addEventListener("click", () => {
  closeModal(leaderboardModal);
});

leaderboardTogglerEle.addEventListener("click", () => {
  openModal(leaderboardModal);
});

// Event listener for opening the settings modal
settingsTogglerEle.addEventListener("click", () => {
  openModal(settingsModal);
});

const scene = new THREE.Scene();
const world = new CANNON.World();
world.gravity.set(0, 0, 0);
world.doors = [];
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor("#000");
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const player = new Player(scene, world);
const mainDungeonURL = new URL("./src/main_dungeon.glb", import.meta.url);
let gameCompleted = false;

let treasure_wall_gate;
// Global variable to track completion of each glow effect
let glowEffectsCompleted = { Kruskal: false, Prim: false, Heapsort: true };
function applyGlowEffect(material, status, key) {
  if (status === "completed_first_time") {
    player.position.set(-0.8, 2, -20);
    player.camera.lookAt(-0.8, 2, -20);

    // Animate both color and intensity over 5 seconds
    gsap.to(material.emissive, { r: 1, g: 1, b: 1, duration: 5 }); // Animate color to white
    gsap.to(material, {
      emissiveIntensity: 5,
      duration: 5,
      onComplete: async () => {
        glowEffectsCompleted[key] = true; // Mark this glow effect as completed
        checkAllGlowEffects(); // Check if all glow effects are completed

        // Update the status to "completed" using updateStatusToComplete
        try {
          await gameStatusService.updateStatusToCompleted(key, 3, "regular"); // Assuming level 3
          console.log("Status updated to completed in the database.");
        } catch (error) {
          console.error("Error updating status to completed:", error);
        }
      },
    });
  } else if (status === "completed") {
    // Set color and intensity instantly without animation
    material.emissive.set("#fff");
    material.emissiveIntensity = 5;
    glowEffectsCompleted[key] = true; // Mark this glow effect as completed
    checkAllGlowEffects(); // Check if all glow effects are completed
  }
}

// Function to check if all glow effects are completed and trigger the gate animation
function checkAllGlowEffects() {
  const allCompleted = Object.values(glowEffectsCompleted).every(Boolean); // Check if all are true
  if (allCompleted && treasure_wall_gate) {
    // Set a new position for the player
    player.position.set(-0.8, 2, -20);
    player.camera.lookAt(-0.8, 2, -20);

    // Use GSAP to smoothly move the Y position of the treasure wall gate
    gsap.to(treasure_wall_gate.position, {
      y: treasure_wall_gate.position.y - 5, // Adjust this value as needed
      duration: 2, // 2 seconds for smooth transition
      ease: "power2.inOut",
      onComplete: () => {
        console.log("Gate animation complete.");
      },
    });
  }
}

async function createMainDungeon() {
  const position = new THREE.Vector3(0, 0, 0);
  try {
    const { model } = await loadModel(mainDungeonURL.href, position, scene);
    console.log(gameStatusService.getLocalGameStatus());

    // Check if level 3 is completed for each algorithm
    // Check if level 3 is completed for each algorithm
    const kruskalStatus =
      gameStatusService.getLocalGameStatus()?.games?.Kruskal?.regular?.[2]
        ?.status;
    const primStatus =
      gameStatusService.getLocalGameStatus()?.games?.Prim?.regular?.[2]?.status;
    const heapsortStatus =
      gameStatusService.getLocalGameStatus()?.games?.Heapsort?.regular?.[2]
        ?.status;

    const kruskalCompleted = kruskalStatus.includes("completed");
    const primCompleted = primStatus.includes("completed");
    const heapsortCompleted = heapsortStatus.includes("completed");

    // Set gameCompleted to true only if all statuses are completed
    gameCompleted = kruskalCompleted && primCompleted && heapsortCompleted;

    model.traverse((child) => {
      if (child.isMesh) {
        // Assign the treasure wall gate if it's found
        if (child.name === "treasure_wall_gate") {
          treasure_wall_gate = child; // Assign the gate to the variable
        }

        if (kruskalCompleted) {
          if (child.name === "treasure_wall_gate") {
            console.log(
              `Skipping physics for ${child.name} due to Kruskal level 3 completion`
            );
            return; // Skip adding physics for this object
          }
        }

        if (child.name.includes("wall") || child.name.includes("pillar")) {
          addPhysicsToMesh(child, world, { mass: 0 });
        }

        if (child.name.includes("wall_doorway_door")) {
          console.log(child.name);
          world.doors.push(child);
        }

        if (child.name.includes("status_symbol") && child.material) {
          if (child.material.name === "kruskal_symbol") {
            symbol_dict["kruskal"] = child.material;
            applyGlowEffect(symbol_dict["kruskal"], kruskalStatus, "Kruskal");
          }

          if (child.material.name === "prim_symbol") {
            symbol_dict["prim"] = child.material;
            applyGlowEffect(symbol_dict["prim"], primStatus, "Prim");
          }

          if (child.material.name === "heapsort_symbol") {
            symbol_dict["heapsort"] = child.material;
            applyGlowEffect(
              symbol_dict["heapsort"],
              heapsortStatus,
              "Heapsort"
            );
          }
        }
      }
    });

    // Check if the game is completed
    console.log(gameCompleted, treasure_wall_gate);
    if (gameCompleted && treasure_wall_gate) {
      // Set a new position for the player
      player.position.set(-0.3, 2, -15);
      player.camera.lookAt(-0.3, 2, -15);

      // Use GSAP to smoothly move the Y position of the treasure wall gate
      gsap.to(treasure_wall_gate.position, {
        y: treasure_wall_gate.position.y - 5, // Adjust this value as needed
        duration: 2, // 2 seconds for smooth transition
        ease: "power2.inOut", // Ease type for smooth animation

        onComplete: () => {
          console.log("Gate animation complete.");
        },
      });
    }

    console.log(symbol_dict);
  } catch (error) {
    console.log("Error loading dungeon", error);
  }
}

const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x808080,
  side: THREE.DoubleSide,
});
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);

// Rotate the floor to be horizontal
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = 0; // Adjust height if necessary
scene.add(floorMesh);
floorMesh.visible = false;

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
  mass: 0, // mass = 0 makes the body static
  shape: floorShape,
  position: new CANNON.Vec3(0, 0, 0),
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Align the plane with the floor
world.addBody(floorBody);

function createBoundingBoxHelper(body, color = 0xff0000) {
  let shape = body.shapes[0]; // Assuming one shape per body for simplicity
  let mesh;

  switch (shape.type) {
    case CANNON.Shape.types.BOX:
      const boxGeometry = new THREE.BoxGeometry(
        shape.halfExtents.x * 2,
        shape.halfExtents.y * 2,
        shape.halfExtents.z * 2
      );
      const boxMaterial = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
      });
      mesh = new THREE.Mesh(boxGeometry, boxMaterial);
      break;

    case CANNON.Shape.types.SPHERE:
      const sphereGeometry = new THREE.SphereGeometry(shape.radius, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
      });
      mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
      break;

    // Add cases for other shapes (e.g., Plane, Cylinder) if needed

    default:
      console.warn("Shape type not supported for visualization");
      break;
  }

  if (mesh) {
    // Sync the position and rotation with the Cannon.js body
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }

  return mesh;
}

function addPhysicsToMesh(mesh, world, options) {
  // Create a Box3 bounding box that fits the mesh exactly
  const boundingBox = new THREE.Box3().setFromObject(mesh);

  // Get the size and center of the bounding box
  const size = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());

  // Create a Cannon.js box shape based on the exact size of the bounding box
  const shape = new CANNON.Box(
    new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
  );

  // Create a physics body for the mesh with the exact shape and position
  const body = new CANNON.Body({
    mass: options.mass, // Use 0 for static objects like walls
    shape: shape,
    position: new CANNON.Vec3(center.x, center.y, center.z),
  });

  // Add the physics body to the world
  world.addBody(body);

  // Optional: Add collision detection for the player
  body.addEventListener("collide", (event) => {
    if (event.body === player.body) {
      console.log("Player collided with a wall");
    }
  });

  mesh.userData.physicsBody = body;

  // Add a bounding box helper for visualization (with red color)
  // const helper = createBoundingBoxHelper(body, 0xff0000); // Red color for bounding box
  // if (helper) {
  //   scene.add(helper);
  // }
}

console.log(symbol_dict);
createThreePointLighting(scene);

document.body.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    player.controls.lock();
  }
});

let previousTime = performance.now();

function storeCameraLookAt(camera) {
  // Create a direction vector
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  // Calculate the global look-at position
  const globalLookAt = camera.position
    .clone()
    .add(direction.multiplyScalar(10)); // Multiply by a scalar to move the point further away

  // Store the global look-at position
  localStorage.setItem("player_lookAt", JSON.stringify(globalLookAt));
}

function onMouseDown(event) {
  if (player.controls.isLocked && player.selectedDoor) {
    const position = {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    };

    const lookAt = new THREE.Vector3();
    player.camera.getWorldDirection(lookAt);

    localStorage.setItem("player_pos", JSON.stringify(position));
    storeCameraLookAt(player.camera);
    // then guide the window to kruskal.html
    if (player.selectedDoor.name.includes("kruskal"))
      window.location.href = "Kruskal.html";
    if (player.selectedDoor.name.includes("heapsort"))
      window.location.href = "heapsort.html";
    if (player.selectedDoor.name.includes("prim"))
      window.location.href = "Prim.html";
  }
}

document.addEventListener("mousedown", onMouseDown);

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  const dt = (currentTime - previousTime) / 1000;

  player.update(dt);
  player.updateRaycaster(world);
  world.step(1 / 60, dt); // Update physics world

  renderer.render(scene, player.camera);
  previousTime = currentTime;
}

animate();

// Function to fetch leaderboard data from an API
async function fetchLeaderboard() {
  try {
    const response = await fetch("/api/status/leaderboard", {
      method: "GET",
      credentials: "include", // Include cookies in the request
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json(); // Assuming the response is a JSON array of leaderboard entries
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return []; // Return an empty array on error
  }
}

// Function to populate the leaderboard
async function populateLeaderboard() {
  const leaderboardData = await fetchLeaderboard();
  console.log(leaderboardData);
  const leaderboardHolder = document.querySelector("ul.leaderboard__holder");
  const leaderboardItems = leaderboardHolder.querySelectorAll("li");

  leaderboardItems.forEach((item, index) => {
    const rankElement = item.querySelector(".leaderboard__rank");
    const nameElement = item.querySelector(".leaderboard__name");
    const scoreElement = item.querySelector(".leaderboard__score");
    console.log(leaderboardData.leaderboard.length);
    if (index < leaderboardData.leaderboard.length) {
      // Fill with actual data
      const userData = leaderboardData.leaderboard[index];
      rankElement.textContent = index + 1; // Rank starts at 1
      nameElement.textContent = userData.username || "Anonymous";
      scoreElement.textContent = userData.totalScore || 0;
    } else {
      // Fill with default data
      rankElement.textContent = index + 1;
      nameElement.textContent = "Anonymous";
      scoreElement.textContent = 0;
    }
  });
}

// Initialize the leaderboard population
populateLeaderboard();

// Handle window resize
window.addEventListener("resize", () => {
  player.camera.aspect = window.innerWidth / window.innerHeight;
  player.camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "F5") {
    event.preventDefault(); // Prevent the default F5 behavior
    localStorage.clear(); // Clear localStorage

    window.location.reload(); // Reload the page
  }
});

restartHandler.addEventListener("click", (event) => {
  event.preventDefault(); // Prevent the default F5 behavior
  localStorage.clear(); // Clear localStorage

  window.location.reload(); // Reload the page
});
