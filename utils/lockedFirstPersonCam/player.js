import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import * as CANNON from "cannon-es";

const CENTER_SCREEN = new THREE.Vector2();

export class Player {
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  cameraHelper = new THREE.CameraHelper(this.camera);
  controls = new PointerLockControls(this.camera, document.body);

  maxSpeed = 20;
  velocity = new THREE.Vector3();
  input = new THREE.Vector3();

  raycaster = new THREE.Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(),
    0,
    5
  );
  selectedDoor = null;

  constructor(scene, world) {
    this.position.set(-0.3, 2, 6);
    this.camera.lookAt(0, 1, 0);
    scene.add(this.camera);
    scene.add(this.cameraHelper);
    const playerShape = new CANNON.Sphere(0.5); // Using a sphere for simplicity
    this.body = new CANNON.Body({
      mass: 1, // Dynamic object
      shape: playerShape,
      position: new CANNON.Vec3(
        this.position.x,
        this.position.y,
        this.position.z
      ),
    });
    world.addBody(this.body);
    document.addEventListener("keyup", this.onKeyUp.bind(this));
    document.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  update(dt) {
    if (this.controls.isLocked === true) {
      // Calculate the forward and right vectors based on the camera's direction
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward); // Forward direction based on camera orientation

      const right = new THREE.Vector3();
      right.crossVectors(this.camera.up, forward).normalize(); // Right direction perpendicular to forward

      // Initialize move direction
      const moveDirection = new THREE.Vector3();

      // Handle forward and backward movement
      if (this.input.z !== 0) {
        moveDirection.add(forward.multiplyScalar(this.input.z));
      }

      // Handle left and right movement (negate right for "A" key to go left)
      if (this.input.x !== 0) {
        moveDirection.add(right.multiplyScalar(-this.input.x));
      }

      // Apply the movement direction to the physics body
      this.body.velocity.set(
        moveDirection.x * this.maxSpeed * dt,
        this.body.velocity.y, // Preserve Y velocity (e.g., for gravity)
        moveDirection.z * this.maxSpeed * dt
      );

      // Limit or dampen the Y velocity
      if (this.body.velocity.y > 0) {
        // Example threshold
        this.body.velocity.y = Math.min(this.body.velocity.y, 0); // Limit Y velocity
      }

      // Sync the camera position with the physics body
      this.camera.position.copy(this.body.position);
    }
  }

  updateRaycaster(world) {
    // Set the raycaster from the camera's center point
    this.raycaster.setFromCamera(CENTER_SCREEN, this.camera);

    // Assuming doors are stored in an array in world.doors
    const intersections = this.raycaster.intersectObjects(world.doors, true);

    if (intersections.length > 0) {
      const intersectedDoor = intersections[0].object;
      console.log("Intersected with a door:", intersectedDoor.name);
      this.selectedDoor = intersectedDoor;
      // Handle door interaction logic here (e.g., open the door)
    } else {
      this.selectedDoor = null;
    }
  }

  get position() {
    return this.camera.position;
  }

  onKeyUp(event) {
    switch (event.code) {
      case "Escape":
        if (event.repeat) break;
        if (this.controls.isLocked) {
          console.log("unlocking controls");
          this.controls.unlock();
        } else {
          console.log("locking controls");
          this.controls.lock();
        }
        break;
      case "KeyW":
        this.input.z = 0;
        break;
      case "KeyA":
        this.input.x = 0;
        break;
      case "KeyS":
        this.input.z = 0;
        break;
      case "KeyD":
        this.input.x = 0;
        break;
    }
  }

  onKeyDown(event) {
    switch (event.code) {
      case "KeyW":
        this.input.z = this.maxSpeed;
        break;
      case "KeyA":
        this.input.x = -this.maxSpeed;
        break;
      case "KeyS":
        this.input.z = -this.maxSpeed;
        break;
      case "KeyD":
        this.input.x = this.maxSpeed;
        break;
      case "KeyR":
        if (this.repeat) break;
        this.position.set(-0.3, 1.5, 12);
        this.velocity.set(0, 0, 0);
        break;
    }
  }
}
