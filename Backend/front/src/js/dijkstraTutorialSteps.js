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
      "• If you see overlapping edges or overlapping numbers in the graph, click the \"Rearrange chests\" button in the upper right corner.<br>" +
      "• To read more about Dijkstra's algorithm, use the \"Click for help\" button in the lower right corner.<br>" +
      "• Our goal is to find the shortest distance from the source node (node 0 in this example) to all other nodes.<br>" +
      "• We start by marking all nodes \"unvisited\". The distance from the source node to itself starts at 0, and the distance from the source to every other node starts at infinity (∞). These starting values are shown in the right table below (Distance from Source).<br>" +
      "• Then we go through a series of iterations, updating the distances from the source node to the other nodes.",
    expectedChests: null,
    expectedEdges: null,
    errorMessage: "Read the introduction, then press Next to begin.",
  },
  {
    instruction: "Step 0: Click on node 0 to begin.",
    explanation:
      "In each iteration, we choose the unvisited node with the minimum distance from the source. The distance from the source node to itself is 0, so we always start from the source node.<br>" +
      "When you click on node 0, its chest opens: node 0 is now visited.",
    expectedChests: [0],
    expectedEdges: null,
    errorMessage: "Incorrect! Please click on node 0.",
  },
  {
    instruction:
      "Step 1: Click on edge (0, 2). Type 1 in the input dialog, and press OK.",
    explanation:
      "We need to \"Relax\" (process) all edges (u, v) going out of the selected node u, in no specific order. Relaxing edge (u, v) means checking whether going from the source to u, then following edge (u, v) to v, gives a shorter distance from the source to v. If it does, we update the distance to v.<br><br>" +
      "distance from source \"0\" to \"0\" = 0<br>" +
      "weight of edge (0, 2) = 1<br>" +
      "distance from source to node \"2\" = ∞<br>" +
      "0 + 1 = 1 is less than ∞, so we update the distance to node 2 to 1.",
    expectedChests: null,
    expectedEdges: [[0, 2]],
    updatedDistance: { 2: 1 },
    errorMessage: "Click the edge (0, 2) to record the distance to node 2.",
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
    errorMessage: "Click the edge (0, 1) to update the distance to node 1.",
  },
  {
    instruction:
      "Step 3: All edges going out of node 0 have been relaxed, so we select a new node. Click on node 2.",
    explanation:
      "Among all unvisited nodes, choose the one with the shortest distance from the source (see the Distance from Source table below).<br>" +
      "Unvisited nodes: node 1 = 2, node 2 = 1, node 3 = ∞, node 4 = ∞. Node 2 has the shortest distance, so we visit it next.",
    expectedChests: [2],
    expectedEdges: null,
    errorMessage:
      "Incorrect! Click on node 2 — it's the nearest unvisited node.",
  },
  {
    instruction:
      "Step 4: Click on edge (2, 1). Type 2 in the input dialog, and press OK.",
    explanation:
      "Edge (2, 0) leads to node 0, which is already visited, so we skip it.<br><br>" +
      "distance from source to node \"2\" = 1<br>" +
      "weight of edge (2, 1) = 3<br>" +
      "distance from source to node \"1\" = 2<br>" +
      "1 + 3 = 4 is not less than 2, so the distance to node 1 stays 2.",
    expectedChests: null,
    expectedEdges: [[2, 1]],
    updatedDistance: { 1: 2 },
    errorMessage: "Click (2, 1) to compare if it's a better path to node 1.",
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
    errorMessage: "Click (2, 4) to record the current distance to node 4.",
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
    errorMessage: "Click (2, 3) to update the distance to node 3.",
  },
  {
    instruction:
      "Step 7: All edges going out of node 2 have been relaxed. Click on node 1.",
    explanation:
      "Among all unvisited nodes, choose the one with the shortest distance from the source.<br>" +
      "Unvisited nodes: node 1 = 2, node 3 = 3, node 4 = 7. Node 1 has the shortest distance, so we visit it next.",
    expectedChests: [1],
    expectedEdges: null,
    errorMessage: "Incorrect! Click on node 1 — it’s the next closest node.",
  },
  {
    instruction:
      "Step 8: Click on edge (1, 3). Type 3 in the input dialog, and press OK.",
    explanation:
      "Edges (1, 0) and (1, 2) lead to visited nodes, so we skip them.<br><br>" +
      "distance from source to node \"1\" = 2<br>" +
      "weight of edge (1, 3) = 4<br>" +
      "distance from source to node \"3\" = 3<br>" +
      "2 + 4 = 6 is not less than 3, so the distance to node 3 stays 3.",
    expectedChests: null,
    expectedEdges: [[1, 3]],
    updatedDistance: { 3: 3 },
    errorMessage: "Click (1, 3) to evaluate its path to node 3.",
  },
  {
    instruction:
      "Step 9: All edges going out of node 1 have been relaxed. Click on node 3.",
    explanation:
      "Among all unvisited nodes, choose the one with the shortest distance from the source.<br>" +
      "Unvisited nodes: node 3 = 3, node 4 = 7. Node 3 has the shortest distance, so we visit it next.",
    expectedChests: [3],
    expectedEdges: null,
    errorMessage: "Incorrect! Click on node 3 to visit it next.",
  },
  {
    instruction:
      "Step 10: Click on edge (3, 4). Type 4 in the input dialog, and press OK.",
    explanation:
      "Edges (3, 1) and (3, 2) lead to visited nodes, so we skip them.<br><br>" +
      "distance from source to node \"3\" = 3<br>" +
      "weight of edge (3, 4) = 1<br>" +
      "distance from source to node \"4\" = 7<br>" +
      "3 + 1 = 4 is less than 7, so we update the distance to node 4 to 4.",
    expectedChests: null,
    expectedEdges: [[3, 4]],
    updatedDistance: { 4: 4 },
    errorMessage: "Click (3, 4) to update the distance to node 4.",
  },
  {
    instruction:
      "Step 11: All edges going out of node 3 have been relaxed. Click on node 4, the last unvisited node.",
    explanation:
      "Node 4 is the only unvisited node left, with distance 4. Once it is visited, every node is visited, and the table shows the shortest distance from node 0 to every node.",
    expectedChests: [4],
    expectedEdges: null,
    errorMessage: "Click on node 4 to complete Dijkstra’s algorithm.",
  },
];
