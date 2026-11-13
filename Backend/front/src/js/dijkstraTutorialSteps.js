// Steps for the Dijkstra tutorial.
// Tutorial graph (see createSpecificGraphDijkstraTutorial):
//   (0,1)=2, (0,2)=1, (1,2)=3, (1,3)=4, (2,3)=2, (2,4)=6, (3,4)=1
//
// Step types:
//   - type: "info"   -> read-only page; the player presses the Next button.
//   - expectedChests -> the player clicks a node (chest).
//   - expectedEdges  -> the player clicks an edge and types updatedDistance.
// Text is rendered as HTML inside a <pre>, so use <br> for line breaks.
export const tutorialSteps = [
  {
    type: "info",
    instruction: "Read the notes below, then press Next.",
    explanation:
      "• Goal: find the shortest distance from node 0 to every other node.<br>" +
      "• Start: node 0 = 0. Every other node = infinity (∞). See the Distance from Source table.<br>" +
      "• Each round: open the closest unvisited node, then check its edges and update distances if a shorter path is found.<br>" +
      "• Overlap? Use \"Rearrange chests\" (upper right). More help: \"Click for help\" (lower right).",
    expectedChests: null,
    expectedEdges: null,
    errorMessage: "Press Next to begin.",
  },
  {
    instruction: "Step 0: Click on node 0 to begin.",
    explanation:
      "Always start at the closest unvisited node. Node 0 is closest (distance 0). Click it to mark it visited.",
    expectedChests: [0],
    expectedEdges: null,
    errorMessage: "Click on node 0.",
  },
  {
    instruction:
      "Step 1: Click on edge (0, 2). Type 1 in the input dialog, and press OK.",
    explanation:
      "\"Relax\" an edge (u, v): ask if path-to-u + edge weight is shorter than the current distance to v. If yes, update it.<br><br>" +
      "distance from source \"0\" to \"0\" = 0<br>" +
      "weight of edge (0, 2) = 1<br>" +
      "distance from source to node \"2\" = ∞<br>" +
      "0 + 1 = 1 is less than ∞, so we update the distance to node 2 to 1.",
    expectedChests: null,
    expectedEdges: [[0, 2]],
    updatedDistance: { 2: 1 },
    errorMessage: "Click the edge (0, 2).",
  },
  {
    instruction:
      "Step 2: Click on edge (0, 1). Type 2 in the input dialog, and press OK.",
    explanation:
      "distance from source to node \"0\" = 0<br>" +
      "weight of edge (0, 1) = 2<br>" +
      "distance from source to node \"1\" = ∞<br>" +
      "0 + 2 = 2 is less than ∞, so we update the distance to node 1 to 2.",
    expectedChests: null,
    expectedEdges: [[0, 1]],
    updatedDistance: { 1: 2 },
    errorMessage: "Click the edge (0, 1).",
  },
  {
    instruction:
      "Step 3: All edges going out of node 0 have been relaxed, so we select a new node. Click on node 2.",
    explanation:
      "Pick the closest unvisited node.<br>" +
      "Unvisited nodes: node 1 = 2, node 2 = 1, node 3 = ∞, node 4 = ∞. Node 2 is closest.",
    expectedChests: [2],
    expectedEdges: null,
    errorMessage: "Click on node 2.",
  },
  {
    instruction:
      "Step 4: Click on edge (2, 1). Type 2 in the input dialog, and press OK.",
    explanation:
      "Skip edges to visited nodes (like 2 → 0).<br><br>" +
      "distance from source to node \"2\" = 1<br>" +
      "weight of edge (2, 1) = 3<br>" +
      "distance from source to node \"1\" = 2<br>" +
      "1 + 3 = 4 is not less than 2, so the distance to node 1 stays 2.",
    expectedChests: null,
    expectedEdges: [[2, 1]],
    updatedDistance: { 1: 2 },
    errorMessage: "Click (2, 1).",
  },
  {
    instruction:
      "Step 5: Click on edge (2, 4). Type 7 in the input dialog, and press OK.",
    explanation:
      "distance from source to node \"2\" = 1<br>" +
      "weight of edge (2, 4) = 6<br>" +
      "distance from source to node \"4\" = ∞<br>" +
      "1 + 6 = 7 is less than ∞, so we update the distance to node 4 to 7.",
    expectedChests: null,
    expectedEdges: [[2, 4]],
    updatedDistance: { 4: 7 },
    errorMessage: "Click (2, 4).",
  },
  {
    instruction:
      "Step 6: Click on edge (2, 3). Type 3 in the input dialog, and press OK.",
    explanation:
      "distance from source to node \"2\" = 1<br>" +
      "weight of edge (2, 3) = 2<br>" +
      "distance from source to node \"3\" = ∞<br>" +
      "1 + 2 = 3 is less than ∞, so we update the distance to node 3 to 3.",
    expectedChests: null,
    expectedEdges: [[2, 3]],
    updatedDistance: { 3: 3 },
    errorMessage: "Click (2, 3).",
  },
  {
    instruction:
      "Step 7: All edges going out of node 2 have been relaxed. Click on node 1.",
    explanation:
      "Pick the closest unvisited node.<br>" +
      "Unvisited nodes: node 1 = 2, node 3 = 3, node 4 = 7. Node 1 is closest.",
    expectedChests: [1],
    expectedEdges: null,
    errorMessage: "Click on node 1.",
  },
  {
    instruction:
      "Step 8: Click on edge (1, 3). Type 3 in the input dialog, and press OK.",
    explanation:
      "Skip edges to visited nodes (1 → 0 and 1 → 2).<br><br>" +
      "distance from source to node \"1\" = 2<br>" +
      "weight of edge (1, 3) = 4<br>" +
      "distance from source to node \"3\" = 3<br>" +
      "2 + 4 = 6 is not less than 3, so the distance to node 3 stays 3.",
    expectedChests: null,
    expectedEdges: [[1, 3]],
    updatedDistance: { 3: 3 },
    errorMessage: "Click (1, 3).",
  },
  {
    instruction:
      "Step 9: All edges going out of node 1 have been relaxed. Click on node 3.",
    explanation:
      "Pick the closest unvisited node.<br>" +
      "Unvisited nodes: node 3 = 3, node 4 = 7. Node 3 is closest.",
    expectedChests: [3],
    expectedEdges: null,
    errorMessage: "Click on node 3.",
  },
  {
    instruction:
      "Step 10: Click on edge (3, 4). Type 4 in the input dialog, and press OK.",
    explanation:
      "Skip edges to visited nodes.<br><br>" +
      "distance from source to node \"3\" = 3<br>" +
      "weight of edge (3, 4) = 1<br>" +
      "distance from source to node \"4\" = 7<br>" +
      "3 + 1 = 4 is less than 7, so we update the distance to node 4 to 4.",
    expectedChests: null,
    expectedEdges: [[3, 4]],
    updatedDistance: { 4: 4 },
    errorMessage: "Click (3, 4).",
  },
  {
    instruction:
      "Step 11: All edges going out of node 3 have been relaxed. Click on node 4, the last unvisited node.",
    explanation:
      "Only node 4 is left (distance 4). Visit it — every node is done, and the table shows the shortest distances from node 0.",
    expectedChests: [4],
    expectedEdges: null,
    errorMessage: "Click on node 4.",
  },
];
