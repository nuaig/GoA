import * as THREE from "three";
import { MeshLine, MeshLineMaterial, MeshLineRaycast } from "three.meshline";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

let font;
const labels = [];

export function setFont(loadedFont) {
  font = loadedFont;
}

// Function to create text labels
function createLabel(text, position, color = 0x000000, scene) {
  const textGeometry = new TextGeometry(text, {
    font: font,
    size: 0.55,
    depth: 0.2,
  });

  // Compute the bounding box of the text geometry
  textGeometry.computeBoundingBox();
  const boundingBox = textGeometry.boundingBox;

  // Calculate the offset to center the text
  const textOffset = boundingBox
    .getCenter(new THREE.Vector3())
    .multiplyScalar(-1);

  // Apply the offset to the text geometry
  textGeometry.translate(textOffset.x, textOffset.y, textOffset.z);

  const textMaterial = new THREE.MeshBasicMaterial({ color });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);

  // Position the text mesh at the specified position
  textMesh.position.copy(position);
  textMesh.rotation.x = -Math.PI / 2;
  scene.add(textMesh);
  labels.push(textMesh);
  return textMesh;
}

export function drawLine(startCube, endCube, weight, edge, scene) {
  const lineMaterial = new MeshLineMaterial({
    color: 0x74c0fc,
    lineWidth: 0.1, // Set the desired line width
  });

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
  const line = new MeshLine();
  line.setGeometry(geometry);

  const mesh = new THREE.Mesh(line.geometry, lineMaterial);
  mesh.raycast = MeshLineRaycast;
  scene.add(mesh);

  // Create label in the middle of the line
  const midPoint = new THREE.Vector3(
    (startCube.position.x + endCube.position.x) / 2,
    (startCube.position.y + endCube.position.y) / 2,
    (startCube.position.z + endCube.position.z) / 2
  );
  const label = createLabel(weight.toString(), midPoint, 0x000000, scene);
  mesh.userData = { startCube, endCube, label, edge, selected: false }; // Store edge data and selected state

  return mesh;
}
// import * as THREE from "three";
// import { MeshLine, MeshLineMaterial, MeshLineRaycast } from "three.meshline";
// import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

// let font;
// const labels = [];

// export function setFont(loadedFont) {
//   font = loadedFont;
// }

// // Function to create text labels
// function createLabel(text, position, color = 0x000000, scene) {
//   const textGeometry = new TextGeometry(text, {
//     font: font,
//     size: 0.45,
//     depth: 0.1,
//   });
//   const textMaterial = new THREE.MeshBasicMaterial({ color });
//   const textMesh = new THREE.Mesh(textGeometry, textMaterial);
//   textMesh.position.copy(position);
//   textMesh.rotation.x = -Math.PI / 2;
//   scene.add(textMesh);
//   labels.push(textMesh);
//   return textMesh;
// }

// export function drawLine(startCube, endCube, weight, edge, scene) {
//   const lineMaterial = new MeshLineMaterial({
//     color: 0x0000ff,
//     lineWidth: 0.1, // Set the desired line width
//   });

//   // Calculate the midpoint
//   const midPoint = new THREE.Vector3(
//     (startCube.position.x + endCube.position.x) / 2,
//     (startCube.position.y + endCube.position.y) / 2,
//     (startCube.position.z + endCube.position.z) / 2
//   );

//   // Add random offset to the midpoint to create curviness
//   const randomOffset = new THREE.Vector3(
//     (Math.random() - 0.5) * 2, // Random offset in x
//     0,
//     (Math.random() - 0.5) * 2 // Random offset in z
//   ).multiplyScalar(2); // Adjust the multiplier to control the amount of curviness

//   midPoint.add(randomOffset);

//   // Define control points for the curve
//   const controlPoints = [startCube.position, midPoint, endCube.position];

//   // Create a Catmull-Rom spline curve
//   const curve = new THREE.CatmullRomCurve3(controlPoints);

//   const points = curve.getPoints(50); // Increase the number of points for more precision

//   const geometry = new THREE.BufferGeometry().setFromPoints(points);
//   const line = new MeshLine();
//   line.setGeometry(geometry);

//   const mesh = new THREE.Mesh(line.geometry, lineMaterial);
//   mesh.raycast = MeshLineRaycast;
//   scene.add(mesh);

//   // Create label in the middle of the curve
//   const labelMidPoint = curve.getPoint(0.5);
//   const label = createLabel(weight.toString(), labelMidPoint, 0x000000, scene);
//   mesh.userData = { startCube, endCube, label, edge, selected: false }; // Store edge data and selected state

//   return mesh;
// }
