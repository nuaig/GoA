import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
const assetLoader = new GLTFLoader();
export function loadModel(url, position, scene, mixers = []) {
  return new Promise((resolve, reject) => {
    assetLoader.load(
      url,
      function (gltf) {
        const model = gltf.scene.clone();
        model.position.copy(position);
        scene.add(model);

        let mixer = null;
        let action = null;
        if (gltf.animations && gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          action = mixer.clipAction(gltf.animations[0]);
          action.setLoop(THREE.LoopOnce);
          action.clampWhenFinished = true;
          action.enabled = true;
          action.paused = false;
          mixers.push(mixer);
        }

        resolve({ model, mixer, action });
      },
      undefined,
      function (error) {
        console.error(error);
        reject(error);
      }
    );
  });
}
