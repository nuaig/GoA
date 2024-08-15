import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";

// We'll use a remote URL for the font
const fontUrl =
  "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json";

let cachedFont = null; // Cache the loaded font to reuse

function ensureFontLoaded() {
  if (cachedFont) {
    return Promise.resolve(cachedFont);
  } else {
    const loader = new FontLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        fontUrl,
        (font) => {
          cachedFont = font;
          resolve(font);
        },
        undefined,
        reject
      );
    });
  }
}

export async function createTextMesh(text, size, color, index) {
  const font = await ensureFontLoaded();
  const geometry = new TextGeometry(text, {
    font: font,
    size: size * 1.5,
    depth: 0.1,
    curveSegments: 12,
    bevelEnabled: false,
  });
  geometry.computeBoundingBox();
  const boundingBox = geometry.boundingBox;
  const centerOffsetX = -0.5 * (boundingBox.max.x - boundingBox.min.x);
  const centerOffsetY = -0.5 * (boundingBox.max.y - boundingBox.min.y);
  const centerOffsetZ = -0.5 * (boundingBox.max.z - boundingBox.min.z);
  geometry.translate(centerOffsetX, centerOffsetY, centerOffsetZ);
  const material = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.index = index; // Assign index here for proper reference during drag operations
  return mesh;
}

export async function createTextMesh1(text, size, color, index) {
  const font = await ensureFontLoaded();
  const textGeometry = new TextGeometry(text, {
    font: font,
    size: size * 1.5,
    depth: 0.05,
  });

  // Center the geometry
  textGeometry.computeBoundingBox();
  const boundingBox = textGeometry.boundingBox;
  const centerOffsetX = -0.5 * (boundingBox.max.x - boundingBox.min.x);
  const centerOffsetY = -0.5 * (boundingBox.max.y - boundingBox.min.y);
  const centerOffsetZ = -0.5 * (boundingBox.max.z - boundingBox.min.z);
  textGeometry.translate(centerOffsetX, centerOffsetY, centerOffsetZ);

  const textMaterial = new THREE.MeshBasicMaterial({ color: color });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);

  return textMesh;
}

export async function createCube(size, color) {
  const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
  const material = new THREE.MeshLambertMaterial({ color: color });

  const cube = new THREE.Mesh(geometry, material);

  return cube;
}

export async function updateText(
  newTextContent,
  oldText,
  size,
  depth = 0.05,
  color
) {
  const font = await ensureFontLoaded();
  // Create a new geometry with the updated text
  const newGeometry = new TextGeometry(newTextContent, {
    font: font,
    size: size * 1.5,
    depth: depth,
  });

  // Dispose of the old geometry
  oldText.geometry.dispose();
  oldText.material.dispose();

  // Assign the new geometry
  oldText.geometry = newGeometry;

  // Optionally, you might want to re-center the mesh
  newGeometry.computeBoundingBox();
  const centerOffsetX =
    -0.5 * (newGeometry.boundingBox.max.x - newGeometry.boundingBox.min.x);
  const centerOffsetY =
    -0.5 * (newGeometry.boundingBox.max.y - newGeometry.boundingBox.min.y);
  const centerOffsetZ =
    -0.5 * (newGeometry.boundingBox.max.z - newGeometry.boundingBox.min.z);
  newGeometry.translate(centerOffsetX, centerOffsetY, centerOffsetZ);
}

export async function createTextMeshNonAsync(text, size, color, index, scene) {
  const font = ensureFontLoaded();
  const geometry = new TextGeometry(text, {
    font: font,
    size: size * 1.5,
    depth: 0.1,
    curveSegments: 12,
    bevelEnabled: false,
  });
  const material = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.index = index; // Assign index here for proper reference during drag operations
  scene.add(mesh);
  return mesh;
}

export function generateRandomArray(size, min, max) {
  const array = [];
  for (let i = 0; i < size; i++) {
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    array.push(value);
  }
  return array;
}
