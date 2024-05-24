import * as THREE from "three";
export function createThreePointLighting(scene) {
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
