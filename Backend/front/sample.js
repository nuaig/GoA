import * as THREE from "three";

import GameRoomUI from "./utils/UI/gameRoomUI.js";

let curGameSession;

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

const curRoomUI = new GameRoomUI("Kruskal", 1, camera);
document.addEventListener("DOMContentLoaded", function () {
  const startButton = document.getElementById("btn__instruction__start");

  if (startButton) {
    startButton.addEventListener("click", function () {
      console.log("Clicked start button");
    });
  } else {
    console.error("Button with ID 'btn__instruction__start' not found.");
  }
});
// Add an event listener to initialize the game after login
// document.addEventListener("DOMContentLoaded", async function () {
//   try {
//     const response = await fetch("/api/users/getUser", {
//       method: "GET",
//       credentials: "include",
//     });

//     if (response.ok) {
//       const userData = await response.json();
//       console.log("User is logged in:", userData);

//       // Initialize GameStatusService with the logged-in userId
//       const gameStatusService = new GameStatusService(userData.id);
//       curRoomUI.setGameStatusService(gameStatusService);
//       // Await the initialization of GameStatusService
//       await curRoomUI.gameStatusService.init();
//       const userId = curRoomUI.gameStatusService.getUserId();
//       curGameSession = new GameSession(
//         userId,
//         "Kruskal",
//         "regular",
//         curRoomUI.currentLevel
//       );
//       curRoomUI.setGameSession(curGameSession);

//       // Ensure toggleMode is called only after initialization
//       await curRoomUI.toggleMode("regular");
//     } else {
//       console.warn("User is not logged in. Redirecting to login page.");
//       window.location.href = "signInSignUp.html";
//     }
//   } catch (error) {
//     console.error("Error checking login status:", error);
//     window.location.href = "signInSignUp.html";
//   }
// });
