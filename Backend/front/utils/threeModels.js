import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

const assetLoader = new GLTFLoader();

export function loadModel(url, position, scene, mixers = []) {
  return new Promise((resolve, reject) => {
    console.log("Attempting to load model from URL:", url);

    assetLoader.load(
      url,
      function (gltf) {
        try {
          if (!gltf.scene) {
            console.error("Scene is missing in the loaded GLTF file:", gltf);
            reject(new Error("Invalid GLTF: Scene is missing"));
            return;
          }

          const model = gltf.scene.clone();
          model.position.copy(position);
          scene.add(model);

          let mixer = null;
          let action = null;

          if (gltf.animations && gltf.animations.length > 0) {
            console.log("Animations found in GLTF file:", gltf.animations);
            mixer = new THREE.AnimationMixer(model);
            action = mixer.clipAction(gltf.animations[0]);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.enabled = true;
            action.paused = false;
            mixers.push(mixer);
          } else {
            console.warn("No animations found in the GLTF file.");
          }

          resolve({ model, mixer, action });
        } catch (error) {
          console.error("Error processing GLTF model:", error);
          reject(error);
        }
      },
      undefined,
      function (error) {
        console.error("Error loading GLTF model:", error);
        reject(error);
      }
    );
  });
}
