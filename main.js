import * as THREE from "three";
import { loadModel } from "./utils/threeModels.js";
import { createThreePointLighting } from "./utils/threePointLighting.js";

class InputController {
  constructor() {
    this.KEYS = {
      w: 87,
      a: 65,
      s: 83,
      d: 68,
      space: 32,
      shift: 16,
    };
    this.MOUSE_MOVE_THRESHOLD = 0.3; // Small threshold to ignore minor movements
    this.initialize();
  }

  initialize() {
    this.current = {
      leftButton: false,
      rightButton: false,
      mouseX: 0,
      mouseY: 0,
      mouseXDelta: 0,
      mouseYDelta: 0,
    };
    this.previous = {
      mouseX: 0,
      mouseY: 0,
    };
    this.keys = {};
    this.target = document;
    this.target.addEventListener(
      "mousedown",
      (e) => this.onMouseDown(e),
      false
    );
    this.target.addEventListener(
      "mousemove",
      (e) => this.onMouseMove(e),
      false
    );
    this.target.addEventListener("mouseup", (e) => this.onMouseUp(e), false);
    this.target.addEventListener("keydown", (e) => this.onKeyDown(e), false);
    this.target.addEventListener("keyup", (e) => this.onKeyUp(e), false);
    this.target.addEventListener("mouseout", () => this.onMouseLeave(), false);
    this.target.addEventListener(
      "mouseleave",
      () => this.onMouseLeave(),
      false
    );
  }

  onMouseDown(e) {
    switch (e.button) {
      case 0: {
        this.current.leftButton = true;
        break;
      }
      case 2: {
        this.current.rightButton = true;
        break;
      }
    }
  }

  onMouseUp(e) {
    switch (e.button) {
      case 0: {
        this.current.leftButton = false;
        break;
      }
      case 2: {
        this.current.rightButton = false;
        break;
      }
    }
  }

  onMouseMove(e) {
    this.current.mouseX = e.pageX - window.innerWidth / 2;
    this.current.mouseY = e.pageY - window.innerHeight / 2;

    const deltaX = this.current.mouseX - this.previous.mouseX;
    const deltaY = this.current.mouseY - this.previous.mouseY;

    // Only update deltas if the movement is above the threshold
    this.current.mouseXDelta =
      Math.abs(deltaX) > this.MOUSE_MOVE_THRESHOLD ? deltaX : 0;
    this.current.mouseYDelta =
      Math.abs(deltaY) > this.MOUSE_MOVE_THRESHOLD ? deltaY : 0;

    // Update previous values
    this.previous.mouseX = this.current.mouseX;
    this.previous.mouseY = this.current.mouseY;
  }

  onMouseLeave() {
    // Reset mouse deltas when the mouse leaves the viewport
    this.current.mouseXDelta = 0;
    this.current.mouseYDelta = 0;
  }

  onKeyDown(e) {
    this.keys[e.keyCode] = true;
  }

  onKeyUp(e) {
    this.keys[e.keyCode] = false;
  }

  update() {
    // Reset deltas after processing to prevent residual movement
    this.current.mouseXDelta = 0;
    this.current.mouseYDelta = 0;
  }

  key(keyCode) {
    return this.keys[keyCode] || false;
  }
}

class FirstPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.input = new InputController();
    this.rotation = new THREE.Quaternion();
    this.translation = new THREE.Vector3();
    this.phi = 0;
    this.phiSpeed = 8;
    this.theta = 0;
    this.thetaSpeed = 5;
    this.walkSpeed = 20;
    this.strafeSpeed = 20;
  }

  update(timeElapsedS) {
    this.updateRotation(timeElapsedS);
    this.updateTranslation(timeElapsedS);
    this.updateCamera();
    this.input.update();
  }

  updateCamera() {
    this.camera.quaternion.copy(this.rotation);
    this.camera.position.add(this.translation);
  }

  updateTranslation(timeElapsedS) {
    const forwardVelocity =
      (this.input.key(this.input.KEYS.w) ? 1 : 0) +
      (this.input.key(this.input.KEYS.s) ? -1 : 0);
    const strafeVelocity =
      (this.input.key(this.input.KEYS.a) ? 1 : 0) +
      (this.input.key(this.input.KEYS.d) ? -1 : 0);

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(qx);
    forward.multiplyScalar(forwardVelocity * timeElapsedS * this.walkSpeed);

    const left = new THREE.Vector3(-1, 0, 0);
    left.applyQuaternion(qx);
    left.multiplyScalar(strafeVelocity * timeElapsedS * this.strafeSpeed);

    this.translation.add(forward);
    this.translation.add(left);

    if (forwardVelocity === 0 && strafeVelocity === 0) {
      this.translation.set(0, 0, 0); // Reset translation only if no movement keys are pressed
    }
  }

  updateRotation(timeElapsedS) {
    const xh = this.input.current.mouseXDelta / window.innerWidth;
    const yh = this.input.current.mouseYDelta / window.innerHeight;

    this.phi += -xh * this.phiSpeed;
    this.theta = clamp(
      this.theta + -yh * this.thetaSpeed,
      -Math.PI / 3,
      Math.PI / 3
    );

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi);
    const qz = new THREE.Quaternion();
    qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta);

    const q = new THREE.Quaternion();
    q.multiply(qx);
    q.multiply(qz);

    this.rotation.copy(q);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const mixers = [];
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor("#000");
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.set(-0.3, 1.5, 12); // Set the camera position
camera.lookAt(0, 1, 0);

const axesHelper = new THREE.AxesHelper(5); // 5 is the size of the axes lines
scene.add(axesHelper);

const fpsCamera = new FirstPersonCamera(camera);

const mainDungeonURL = new URL("./src/main_dungeon.glb", import.meta.url);

async function createMainDungeon() {
  const position = new THREE.Vector3(0, 0, 0);
  try {
    const { model, mixer, action } = await loadModel(
      mainDungeonURL.href,
      position,
      scene,
      mixers
    );
    console.log("Model loaded successfully:", model);

    // Log the model's position, scale, and bounding box
    console.log("Model Position:", model.position);
    console.log("Model Scale:", model.scale);

    const bbox = new THREE.Box3().setFromObject(model);
    console.log("Bounding Box:", bbox);
  } catch (error) {
    console.log("Error loading dungeon", error);
  }
}

createMainDungeon();
createThreePointLighting(scene);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const deltaSeconds = clock.getDelta();
  mixers.forEach((mixer) => {
    mixer.update(deltaSeconds);
  });
  step(deltaSeconds);

  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function step(timeElapsed) {
  const timeElapsedSpeed = timeElapsed * 0.001;
  fpsCamera.update(timeElapsedSpeed);
}
