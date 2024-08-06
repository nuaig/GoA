import * as THREE from "three";
import { entity } from "../entity.js";
import { math } from "./math.js";
import { player_input } from "./player-input.js";
import { passes } from "./passes.js";

export const first_person_camera = (() => {
  class FirstPersonCamera extends entity.Component {
    static CLASS_NAME = "FirstPersonCamera";

    get NAME() {
      return FirstPersonCamera.CLASS_NAME;
    }

    constructor(params) {
      super();

      this.params_ = params;
      this.camera_ = params.camera;
      this.group_ = new THREE.Group();
      this.params_.scene.add(this.group_);
    }

    Destroy() {
      this.params_.scene.remove(this.group_);
    }

    InitEntity() {
      this.rotation_ = new THREE.Quaternion();
      this.translation_ = new THREE.Vector3(0, 3, 0);
      this.phi_ = 0;
      this.phiSpeed_ = 8;
      this.theta_ = 0;
      this.thetaSpeed_ = 5;
      this.walkSpeed_ = 10;
      this.strafeSpeed_ = 10;

      this.Parent.Attributes.FPSCamera = {
        group: this.group_,
      };

      this.SetPass(passes.CAMERA);
    }

    Update(timeElapsedS) {
      this.updateRotation_(timeElapsedS);
      this.updateCamera_(timeElapsedS);
      this.updateTranslation_(timeElapsedS);

      this.Parent.SetPosition(this.translation_);
      this.Parent.SetQuaternion(this.rotation_);
    }

    updateCamera_(_) {
      this.camera_.quaternion.copy(this.rotation_);
      this.camera_.position.copy(this.translation_);
      this.group_.position.copy(this.translation_);
      this.group_.quaternion.copy(this.rotation_);
    }

    updateTranslation_(timeElapsedS) {
      const input = this.GetComponent("PlayerInput");

      const forwardVelocity =
        (input.key(player_input.KEYS.w) ? 1 : 0) +
        (input.key(player_input.KEYS.s) ? -1 : 0);
      const strafeVelocity =
        (input.key(player_input.KEYS.a) ? 1 : 0) +
        (input.key(player_input.KEYS.d) ? -1 : 0);

      const qx = new THREE.Quaternion();
      qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);

      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(qx);
      forward.multiplyScalar(forwardVelocity * timeElapsedS * this.walkSpeed_);

      const left = new THREE.Vector3(-1, 0, 0);
      left.applyQuaternion(qx);
      left.multiplyScalar(strafeVelocity * timeElapsedS * this.strafeSpeed_);

      this.translation_.add(forward);
      this.translation_.add(left);

      if (forwardVelocity === 0 && strafeVelocity === 0) {
        this.translation_.set(0, 0, 0);
      }
    }

    updateRotation_(timeElapsedS) {
      const input = this.GetComponent("PlayerInput");

      const xh = input.current_.mouseXDelta / window.innerWidth;
      const yh = input.current_.mouseYDelta / window.innerHeight;

      this.phi_ += -xh * this.phiSpeed_;
      this.theta_ = math.clamp(
        this.theta_ + -yh * this.thetaSpeed_,
        -Math.PI / 3,
        Math.PI / 3
      );

      const qx = new THREE.Quaternion();
      qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);
      const qz = new THREE.Quaternion();
      qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta_);

      const q = new THREE.Quaternion();
      q.multiply(qx);
      q.multiply(qz);

      this.rotation_.copy(q);
    }
  }

  return {
    FirstPersonCamera: FirstPersonCamera,
  };
})();
