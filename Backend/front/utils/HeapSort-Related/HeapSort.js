import * as THREE from "three";
import { createCube, createTextMesh } from "./arrayHelper.js"; // import helper functions
import { MeshLine, MeshLineMaterial } from "three.meshline";
export async function createDebossedAreas(
  currentLevelNodes,
  correctPositions,
  scene,
  DebossedAreaTexts,
  trackedObjects // Pass an array to track objects
) {
  const depthOffset = 0.1;
  const cubeSize = { width: 0.6, height: 0.5, depth: 0.1 };
  const wallSize = { width: 10, height: 9 };
  const startPosition = { x: 0, y: wallSize.height / 2 - 1, z: 0.1 };

  for (let i = 0; i < currentLevelNodes; i++) {
    const cube = await createCube(cubeSize, 0x04aa6d); // Await the promise
    console.log(cube);

    let level = Math.floor(Math.log2(i + 1));
    let levelIndex = i - Math.pow(2, level) + 1;
    let nodesInLevel = Math.pow(2, level);

    let xPosition =
      startPosition.x +
      (levelIndex - nodesInLevel / 2 + 0.5) * (wallSize.width / nodesInLevel);
    let yPosition = startPosition.y - level * (cubeSize.height + 1);

    cube.position.set(xPosition, yPosition, startPosition.z + depthOffset);
    correctPositions.set(
      i,
      new THREE.Vector3(xPosition, yPosition, startPosition.z + depthOffset)
    );
    cube.userData.index = i;
    scene.add(cube);
    trackedObjects.push(cube); // Track the cube

    // Create and add a text mesh for the index
    const indexTextMesh = await createTextMesh(`[${i}]`, 0.12, "#111213");
    indexTextMesh.position.set(
      xPosition,
      yPosition + 0.45,
      startPosition.z + depthOffset
    );
    scene.add(indexTextMesh);
    trackedObjects.push(indexTextMesh); // Track the text mesh
    indexTextMesh.visible = false;
    DebossedAreaTexts.push(indexTextMesh);
  }
  drawLines(scene, correctPositions, trackedObjects); // Pass tracked objects to `drawLines`
}
// async function createDebossedAreas() {
//   const depthOffset = 0.1;
//   const cubeSize = { width: 0.6, height: 0.5, depth: 0.1 };
//   const wallSize = { width: 10, height: 9 };
//   const startPosition = { x: 0, y: wallSize.height / 2 - 1.5, z: 0.1 };

//   for (let i = 0; i < currentLevelNodes; i++) {
//     const cube = await createCube(cubeSize, 0x04aa6d); // Await the promise
//     console.log(cube);

//     let level = Math.floor(Math.log2(i + 1));
//     let levelIndex = i - Math.pow(2, level) + 1;
//     let nodesInLevel = Math.pow(2, level);

//     let xPosition =
//       startPosition.x +
//       (levelIndex - nodesInLevel / 2 + 0.5) * (wallSize.width / nodesInLevel);
//     let yPosition = startPosition.y - level * (cubeSize.height + 1);

//     cube.position.set(xPosition, yPosition, startPosition.z + depthOffset);
//     correctPositions.set(
//       i,
//       new THREE.Vector3(xPosition, yPosition, startPosition.z + depthOffset)
//     );
//     cube.userData.index = i;
//     scene.add(cube);

//     // Create and add a text mesh for the index
//     createTextMesh(`[${i}]`, 0.12, "#111213").then((indexTextMesh) => {
//       indexTextMesh.position.set(
//         xPosition,
//         yPosition + 0.45,
//         startPosition.z + depthOffset
//       );
//       scene.add(indexTextMesh);
//       indexTextMesh.visible = false;
//       DebossedAreaTexts.push(indexTextMesh);
//     });
//   }
// }

export function findClosestDebossedIndex(
  draggedPosition,
  draggableIndex,
  correctPositions,
  currentLevel
) {
  let closestIndex = null;
  let shortestDistance = Infinity;

  correctPositions.forEach((position, index) => {
    if (currentLevel !== 0 && index === draggableIndex) {
      return;
    }
    let distance = draggedPosition.distanceTo(position);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      closestIndex = index;
    }
  });
  return shortestDistance > 0.7 ? null : closestIndex;
}

// function findClosestDebossedIndex(draggedPosition, draggableIndex) {
//   let closestIndex = null;
//   let shortestDistance = Infinity;

//   correctPositions.forEach((position, index) => {
//     if (currentLevel !== 0 && index === draggableIndex) {
//       return;
//     }
//     let distance = draggedPosition.distanceTo(position);
//     if (distance < shortestDistance) {
//       shortestDistance = distance;
//       closestIndex = index;
//     }
//   });
//   if (shortestDistance > 0.7) {
//     return null;
//   }

//   return closestIndex;
// }

function drawLines(scene, correctPositions, trackedObjects) {
  correctPositions.forEach((parentPos, i) => {
    const leftChildIndex = 2 * i + 1;
    const rightChildIndex = 2 * i + 2;

    if (correctPositions.has(leftChildIndex)) {
      const leftChildPos = correctPositions.get(leftChildIndex);
      createLine(scene, parentPos, leftChildPos, trackedObjects);
    }

    if (correctPositions.has(rightChildIndex)) {
      const rightChildPos = correctPositions.get(rightChildIndex);
      createLine(scene, parentPos, rightChildPos, trackedObjects);
    }
  });
}

function createLine(scene, startVector, endVector, trackedObjects) {
  const material = new MeshLineMaterial({
    color: "#000",
    lineWidth: 0.3, // Set the desired line width
  });
  const points = [];
  points.push(new THREE.Vector3(startVector.x, startVector.y, startVector.z));
  points.push(new THREE.Vector3(endVector.x, endVector.y, endVector.z));

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  trackedObjects.push(line); // Track the line
}

export function updateNextSwapIndices(lastUnsortedIndex, arrayElements) {
  console.log(
    `Updating swap indices from last unsorted index: ${lastUnsortedIndex}`
  );
  let n = lastUnsortedIndex; // Only consider up to the last unsorted index
  let currentSwapIndices = null;
  if (lastUnsortedIndex <= 0) {
    console.log("Heap sorting complete, no further swaps needed.");
    return currentSwapIndices; // Heap sorting complete, no further swaps needed
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    let largest = i;

    if (left < n && arrayElements[left].value > arrayElements[largest].value) {
      largest = left;
    }
    if (
      right < n &&
      arrayElements[right].value > arrayElements[largest].value
    ) {
      largest = right;
    }

    if (largest !== i) {
      currentSwapIndices = i < largest ? [i, largest] : [largest, i];
      console.log(`Next swap indices set: ${currentSwapIndices}`);
      return currentSwapIndices; // Found the next correct swap for reheapification
    }
  }
  return currentSwapIndices;
}
// function updateNextSwapIndices() {
//   console.log(
//     `Updating swap indices from last unsorted index: ${lastUnsortedIndex}`
//   );
//   if (lastUnsortedIndex <= 0) {
//     currentSwapIndices = null;
//     console.log("Heap sorting complete, no further swaps needed.");
//     return; // Heap sorting complete, no further swaps needed
//   }
//   let n = lastUnsortedIndex; // Only consider up to the last unsorted index
//   currentSwapIndices = null;

//   for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
//     const left = 2 * i + 1;
//     const right = 2 * i + 2;
//     let largest = i;

//     if (left < n && arrayElements[left].value > arrayElements[largest].value) {
//       largest = left;
//     }
//     if (
//       right < n &&
//       arrayElements[right].value > arrayElements[largest].value
//     ) {
//       largest = right;
//     }

//     if (largest !== i) {
//       currentSwapIndices = [i, largest];
//       console.log(`Next swap indices set: ${currentSwapIndices}`);
//       return; // Found the next correct swap for reheapification
//     }
//   }
//   if (!currentSwapIndices) {
//     console.log("No valid swaps found, checking heap condition...");
//     // Optionally validate the entire heap here
//   }
// }

export function arraySorted(arrayElements) {
  for (let i = 0; i < arrayElements.length - 1; i++) {
    if (arrayElements[i].value > arrayElements[i + 1].value) {
      return false; // If any element is greater than the next, it's not sorted
    }
  }
  return true; // If the loop completes without returning false, the array is sorted
}

// function arraySorted() {
//   for (let i = 0; i < arrayElements.length - 1; i++) {
//     if (arrayElements[i].value > arrayElements[i + 1].value) {
//       return false; // If any element is greater than the next, it's not sorted
//     }
//   }
//   return true; // If the loop completes without returning false, the array is sorted
// }

export function checkMaxHeapProperties(arrayElements) {
  let n = arrayElements.length;
  // Start from the last parent node and go back to the root
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    let parentValue = arrayElements[i].value; // Assuming your array elements have a value property
    let leftChildIndex = 2 * i + 1;
    let rightChildIndex = 2 * i + 2;

    // Check if the left child exists and is greater than the parent
    if (
      leftChildIndex < n &&
      arrayElements[leftChildIndex].value > parentValue
    ) {
      return false; // Left child is greater than the parent
    }

    // Check if the right child exists and is greater than the parent
    if (
      rightChildIndex < n &&
      arrayElements[rightChildIndex].value > parentValue
    ) {
      return false; // Right child is greater than the parent
    }
  }
  return true; // All checks passed, it is a max-heap
}

// function checkMaxHeapProperties() {
//   let n = arrayElements.length;
//   // Start from the last parent node and go back to the root
//   for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
//     let parentValue = arrayElements[i].value; // Assuming your array elements have a value property
//     let leftChildIndex = 2 * i + 1;
//     let rightChildIndex = 2 * i + 2;

//     // Check if the left child exists and is greater than the parent
//     if (
//       leftChildIndex < n &&
//       arrayElements[leftChildIndex].value > parentValue
//     ) {
//       return false; // Left child is greater than the parent
//     }

//     // Check if the right child exists and is greater than the parent
//     if (
//       rightChildIndex < n &&
//       arrayElements[rightChildIndex].value > parentValue
//     ) {
//       return false; // Right child is greater than the parent
//     }
//   }
//   return true; // All checks passed, it is a max-heap
// }
