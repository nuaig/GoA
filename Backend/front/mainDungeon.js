import * as THREE from "three";
import { loadModel } from "./utils/threeModels.js";
import * as CANNON from "cannon-es";
import { createThreePointLighting } from "./utils/threePointLighting.js";
import { Player } from "./utils/lockedFirstPersonCam/player.js";
import { GameStatusService } from "./utils/gameStatus/gameStatusService.js";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import { gsap } from "gsap";

function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  loadingScreen.style.opacity = 1;

  const fadeEffect = setInterval(() => {
    if (loadingScreen.style.opacity > 0) {
      loadingScreen.style.opacity -= 0.1;
    } else {
      clearInterval(fadeEffect);
      loadingScreen.style.display = "none";
    }
  }, 50); // 50ms for smooth fade
}

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
      if (gameStatusService.gameStatus.role !== "admin") {
        const dashboardHandler = document.querySelector(".btn__dashboard");
        if (dashboardHandler) {
          dashboardHandler.style.display = "none"; // Hide the dashboard access button
        }
      }
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

  const instructionShown = localStorage.getItem("instructionShown");
  if (!instructionShown) {
    openGameInstructionModal();
    localStorage.setItem("instructionShown", "true");
  }
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
    // Function to remove the pulse effect, overlay, and reset z-index
    function removeFocusEffectAndShowControls() {
      overlay.remove(); // Remove the overlay
      focusIcon.style.animation = "none"; // Stop the pulse animation
      focusIcon.classList.remove("focus-effect"); // Remove the class if it still exists

      // Revert the z-index to default
      focusIcon.style.zIndex = "1"; // Or use the initial/default z-index value

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

const controlsTogllerEle = document.querySelector(".Pesudocode-Box-Action");
const controlsModal = document.querySelector(".modal__control");
const gameCompletionModal = document.querySelector(".modal__game__completion");
const gameCompletionContinueButton = document.querySelector(
  ".btn__continue__completion"
);
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

const leaderboardTogglerIconEle = document.querySelector(".Leaderboard-icon");
const leaderboardButtonEle = document.querySelector(".btn__leaderboard");
const leaderboardModal = document.querySelector(".modal__leaderboard");
const settingsModal = document.querySelector(".modal__settings");
const settingsTogglerEle = document.querySelector(".settings__icon");
const dashboardHandler = document.querySelector(".btn__dashboard");
const signOutHandler = document.querySelector(".btn__sign_out");
const gameInstructionModal = document.querySelector(".game-instruction-modal");
const gameInstructionStartButton = document.querySelector(
  ".btn__game__instruction__start"
);
const gameInstructionSettingsButton = document.querySelector(
  ".btn__map__game__instruction"
);

const symbol_dict = {
  kruskal: null,
  heapsort: null,
  prim: null,
};
let gameStatusService;

const openModal = function (modalType) {
  modalType.classList.remove("hidden");
  overlay.classList.remove("hidden");

  // Lower the z-index of Pesudocode-Box-Action
  const pesudocodeBoxAction = document.querySelector(".Pesudocode-Box-Action");
  if (pesudocodeBoxAction) {
    pesudocodeBoxAction.style.zIndex = "0"; // Push it below the overlay
  }
};

const closeModal = function (modalType) {
  modalType.classList.add("hidden");
  overlay.classList.add("hidden");
};

const openGameInstructionModal = function () {
  gameInstructionModal.classList.remove("hidden");
  overlay.classList.remove("hidden");
};

gameInstructionStartButton.addEventListener("click", () => {
  closeModal(gameInstructionModal);
});

controlsTogllerEle.addEventListener("click", () => {
  openModal(controlsModal);
});

controlsCloseButton.addEventListener("click", () => {
  closeModal(controlsModal);
});

settingsCloseButton.addEventListener("click", () => {
  closeModal(settingsModal);
});

leaderboardCloseButton.addEventListener("click", () => {
  closeModal(leaderboardModal);
});

leaderboardTogglerIconEle.addEventListener("click", () => {
  openModal(leaderboardModal);
});

leaderboardButtonEle.addEventListener("click", () => {
  closeModal(settingsModal);
  openModal(leaderboardModal);
});

// Event listener for opening the settings modal
settingsTogglerEle.addEventListener("click", () => {
  openModal(settingsModal);
});

gameInstructionSettingsButton.addEventListener("click", () => {
  closeModal(settingsModal);
  openModal(gameInstructionModal);
});

dashboardHandler.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

gameCompletionContinueButton.addEventListener("click", () => {
  closeModal(gameCompletionModal);
  player.controls.lock();
  stopTriggerFireworks();
});

function displayMessage(message) {
  const uiTextElement = document.querySelector(".UI-Text"); // If using an ID
  uiTextElement.innerHTML = message;
}

const scene = new THREE.Scene();
const world = new CANNON.World();
world.gravity.set(0, 0, 0);
world.doors = [];
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor("#000");
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const player = new Player(scene, world);
const mainDungeonURL = new URL(
  "./src/main_dungeon_v4_compressed.glb",
  import.meta.url
);
let gameCompleted = false;

let treasure_wall_gate_left = [];
let treasure_wall_gate_right = [];
// Global variable to track completion of each glow effect
let glowEffectsCompleted = { Kruskal: false, Prim: false, Heapsort: false };

function triggerFireworks() {
  const fireworks = document.querySelectorAll(".firework");
  fireworks.forEach((firework) => {
    firework.classList.add("running");
  });
}

function stopTriggerFireworks() {
  const fireworks = document.querySelectorAll(".firework");
  fireworks.forEach((firework) => {
    firework.classList.remove("running");
    firework.style.animation = "none";
    // Reset transform to initial state if needed
    firework.style.transform = "translate(0, 0)";
    firework.style.opacity = 0; // Optionally hide the element
  });
}

function applyGlowEffect(material, status, key) {
  if (status === "completed_first_time") {
    player.position.set(-0.8, 2, -20);
    player.camera.lookAt(-0.8, 2, -20);
    const message = `Congratulations! You've mastered the ${key} Room. The symbol of ${key} now glows brightly, 
    marking your triumph. Venture forth and conquer the remaining chambers to unveil the secrets of the treasure chest. Press 'Enter' to continue your adventure.`;
    const completionElement = document.querySelector("#completion-message");
    triggerFireworks();
    displayMessage(message);
    // Animate both color and intensity over 5 seconds
    gsap.to(material.emissive, { r: 1, g: 1, b: 1, duration: 10 }); // Animate color to white
    gsap.to(material, {
      emissiveIntensity: 8,
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

function checkAllGlowEffects() {
  const allCompleted = Object.values(glowEffectsCompleted).every(Boolean);

  if (allCompleted) {
    const message = `Well done, brave explorer! The treasure door is now unlocked. Continue to sharpen your skills by revisiting any of the rooms at your leisure.`;
    triggerFireworks();
    displayMessage(message);
    triggerFireworks();
    // Set a new position for the player
    player.position.set(-0.8, 2, -20);
    player.camera.lookAt(-0.8, 2, -20);
    player.setGameDone();
    // Open Left Door (Rotates Counterclockwise)
    treasure_wall_gate_left.forEach((gate, index) => {
      if (gate && gate.rotation) {
        console.log(`Opening left gate: ${gate.name}`);

        gsap.to(gate.rotation, {
          y: -Math.PI / 2, // Rotate 90 degrees CCW
          duration: 6,
          ease: "power2.inOut",
          onComplete: () => {
            console.log(`Left gate animation complete: ${gate.name}`);
            openModal(gameCompletionModal);
          },
        });
      } else {
        console.warn(`Left gate at index ${index} is undefined or invalid`);
      }
    });

    // Open Right Door (Rotates Clockwise)
    treasure_wall_gate_right.forEach((gate, index) => {
      if (gate && gate.rotation) {
        console.log(`Opening right gate: ${gate.name}`);

        gsap.to(gate.rotation, {
          y: -Math.PI / 2, // Rotate 90 degrees CW
          duration: 6,
          ease: "power2.inOut",
          onComplete: () => {
            console.log(`Right gate animation complete: ${gate.name}`);
          },
        });
      } else {
        console.warn(`Right gate at index ${index} is undefined or invalid`);
      }
    });
  }
}

async function createMainDungeon() {
  const position = new THREE.Vector3(0, 0, 0);

  // Show loading screen
  document.getElementById("loading-screen").style.display = "flex";

  try {
    const { model } = await loadModel(mainDungeonURL.href, position, scene);

    console.log(gameStatusService.getLocalGameStatus());

    // Hide loading screen smoothly after model is loaded
    hideLoadingScreen();

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

    gameCompleted = kruskalCompleted && primCompleted && heapsortCompleted;

    model.traverse((child) => {
      if (child.isMesh) {
        if (child.name.includes("wall_doorway_door_treasure_left_ready")) {
          treasure_wall_gate_left.push(child);
        }
        if (child.name.includes("wall_doorway_door_treasure_right_ready")) {
          treasure_wall_gate_right.push(child);
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

    console.log("World doors:", world.doors);
    console.log(symbol_dict);
  } catch (error) {
    console.log("Error loading dungeon", error);
    hideLoadingScreen(); // Hide loading screen even if there’s an error
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
    stopTriggerFireworks();
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
      window.location.href = "Dijkstra.html";
  }
}

document.addEventListener("mousedown", onMouseDown);

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
      if (userData.totalScore > 0) {
        nameElement.textContent = userData.username || "Anonymous";
      } else {
        nameElement.textContent = "Anonymous";
      }
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
    sessionStorage.clear();
    window.location.reload(); // Reload the page
  }
});

signOutHandler.addEventListener("click", async (event) => {
  event.preventDefault(); // Prevent the default action
  try {
    // Make a POST request to the logout API
    const response = await fetch("/api/users/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Needed for cookies to be included
    });

    const result = await response.json();
    if (response.ok) {
      console.log("Logout successful:", result.msg); // Successful logout
      localStorage.clear(); // Clear localStorage after successful logout
      window.location.href = "signInSignUp.html"; // Redirect to the sign-in page
    } else {
      console.error("Logout failed:", result.msg); // Log failure message
      alert("Logout failed, please try again.");
    }
  } catch (error) {
    console.error("Error during logout:", error);
    alert("An error occurred while trying to log out.");
  }
});

// Mini-map
const miniMapCamera = new THREE.OrthographicCamera(
  150 / -2, // left
  150 / 2, // right
  150 / 2, // top
  150 / -2, // bottom
  1, // near clipping plane
  1000 // far clipping plane
);
const scale = 50; // Reduce this value to zoom in
miniMapCamera.left = -scale;
miniMapCamera.right = scale;
miniMapCamera.top = scale;
miniMapCamera.bottom = -scale;
miniMapCamera.updateProjectionMatrix();
miniMapCamera.position.set(0, 250, -10); // Position it above the dungeon
miniMapCamera.lookAt(new THREE.Vector3(0, 0, -10)); // Look directly down
const miniMapRenderer = new THREE.WebGLRenderer({ alpha: true });
miniMapRenderer.setSize(350, 350); // Size of the mini-map
miniMapRenderer.domElement.id = "miniMapCanvas";

document.body.appendChild(miniMapRenderer.domElement); // Append it to the body or a specific element
miniMapRenderer.domElement.style.position = "absolute";
miniMapRenderer.domElement.style.top = "15px";
miniMapRenderer.domElement.style.left = "15px";

// function updateMiniMap() {
//   const playerPosition = player.camera.position; // Use the camera's position instead
//   miniMapCamera.position.x = playerPosition.x;
//   miniMapCamera.position.z = playerPosition.z;
//   miniMapCamera.updateProjectionMatrix();
// }

const mapBackground = new THREE.Mesh(
  new THREE.CircleGeometry(100, 32),
  new THREE.MeshBasicMaterial({ color: "#868e96" })
);
mapBackground.rotation.x = -Math.PI / 2;
scene.add(mapBackground);
mapBackground.position.y = player.camera.position.y;
const playerMarker = new THREE.Mesh(
  new THREE.CircleGeometry(3, 32),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
playerMarker.rotation.x = -Math.PI / 2; // Rotate the marker to face up
scene.add(playerMarker);

function updatePlayerMarker() {
  playerMarker.position.copy(player.camera.position); // Directly use the camera's position
  playerMarker.position.y = player.camera.position.y + 0.04;
}

// function animate() {
//   requestAnimationFrame(animate);

//   const currentTime = performance.now();
//   const dt = (currentTime - previousTime) / 1000;

//   player.update(dt);
//   player.updateRaycaster(world);
//   world.step(1 / 60, dt); // Update physics world

//   // Update player marker and mini-map camera position based on player position
//   updatePlayerMarker();
//   // updateMiniMap();

//   renderer.render(scene, player.camera);
//   previousTime = currentTime;

//   miniMapRenderer.render(scene, miniMapCamera); // Mini-map rendering
// }
const FIXED_TIME_STEP = 1 / 60; // 60 updates per second
let accumulatedTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  let dt = (currentTime - previousTime) / 1000; // Convert ms to seconds
  previousTime = currentTime;

  // Cap dt to prevent large jumps in physics (e.g., if game lags)
  dt = Math.min(dt, 0.1); // Max 100ms per frame

  // Accumulate time and perform fixed steps
  accumulatedTime += dt;
  while (accumulatedTime >= FIXED_TIME_STEP) {
    world.step(FIXED_TIME_STEP); // Always use fixed step
    player.update(FIXED_TIME_STEP); // Update player at fixed step
    accumulatedTime -= FIXED_TIME_STEP;
  }
  player.updateRaycaster(world);
  // Update player marker and mini-map camera position based on player position
  updatePlayerMarker();
  // updateMiniMap();

  renderer.render(scene, player.camera);
  previousTime = currentTime;

  miniMapRenderer.render(scene, miniMapCamera); // Mini-map rendering
}
animate();
