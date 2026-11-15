// Steps for the A* tutorial (tutorial graph: createSpecificGraphAstarTutorial):
//   S-1 = 2, S-2 = 1, 1-2 = 3, 1-3 = 4, 2-3 = 2, 2-G = 3, 3-G = 1
//   S = node 0, G = node 4, heuristic weight 0 (h(n) = 0, so f(n) = g(n)).
//
// Step types:
//   - type: "info"   -> read-only page; the player presses the Next button.
//   - expectedChests -> the player clicks a node (chest).
//   - expectedEdges  -> the player clicks an edge and types the CANDIDATE
//                       value g(u) + weight in updatedDistance; if a node
//                       already has a different g, the game asks the player
//                       to choose the smaller of the two.
// Text is rendered as HTML inside a <pre>, so use <br> for line breaks.
export const tutorialSteps = [
  {
    type: "info",
    instruction: "Read the notes below, then press Next.",
    explanation:
      "• Goal: find the shortest path from S to G.<br>" +
      "• For each node: g = cost from S so far, h = guess of cost left to G, f(n) = g(n) + h(n).<br>" +
      "• In this tutorial h(n) = 0, so f = g. A* acts like Dijkstra, but stops when G is done.<br>" +
      "• Start: g(S) = 0, everyone else = ∞. Use the Priority Queue and Settled tables.<br>" +
      "• Overlap? Use \"Rearrange chests\" (upper right). More help: \"Click for help\" (lower right).",
    expectedChests: null,
    expectedEdges: null,
    errorMessage: "Press Next to begin.",
  },
  {
    instruction: "Step 0: Click on node S to begin.",
    explanation:
      "Always settle the node with the smallest f. Only S is in the queue (f = 0). Click S to settle it.",
    expectedChests: [0],
    expectedEdges: null,
    errorMessage: "Click on node S.",
  },
  {
    instruction:
      "Step 1: Click on edge (S, 2). Type 1 in the input dialog, and press OK.",
    explanation:
      "Check each edge out of the settled node. New cost = g(u) + weight.<br><br>" +
      "g(S) = 0<br>" +
      "weight of edge (S, 2) = 1<br>" +
      "candidate g(2) = 0 + 1 = 1, so f(2) = 1 + 0 = 1<br>" +
      "Node 2 had no value yet (∞), so it enters the queue with f = 1.",
    expectedChests: null,
    expectedEdges: [[0, 2]],
    updatedDistance: { 2: 1 },
    errorMessage: "Click on edge (S, 2).",
  },
  {
    instruction:
      "Step 2: Click on edge (S, 1). Type 2 in the input dialog, and press OK.",
    explanation:
      "g(S) = 0<br>" +
      "weight of edge (S, 1) = 2<br>" +
      "candidate g(1) = 0 + 2 = 2, so f(1) = 2<br>" +
      "Node 1 had no value yet (∞), so it enters the queue with f = 2.",
    expectedChests: null,
    expectedEdges: [[0, 1]],
    updatedDistance: { 1: 2 },
    errorMessage: "Click on edge (S, 1).",
  },
  {
    instruction:
      "Step 3: All edges going out of S have been relaxed. Click on node 2.",
    explanation:
      "Queue: node 2 (f = 1), node 1 (f = 2). Node 2 has the smallest f — settle it.",
    expectedChests: [2],
    expectedEdges: null,
    errorMessage: "Click on node 2.",
  },
  {
    instruction:
      "Step 4: Click on edge (2, 3). Type 3 in the input dialog, and press OK.",
    explanation:
      "Skip edges to settled nodes (2 → S).<br><br>" +
      "g(2) = 1<br>" +
      "weight of edge (2, 3) = 2<br>" +
      "candidate g(3) = 1 + 2 = 3, so f(3) = 3<br>" +
      "Node 3 had no value yet (∞), so it enters the queue with f = 3.",
    expectedChests: null,
    expectedEdges: [[2, 3]],
    updatedDistance: { 3: 3 },
    errorMessage: "Click on edge (2, 3).",
  },
  {
    instruction:
      "Step 5: Click on edge (2, G). Type 4 in the input dialog, and press OK.",
    explanation:
      "g(2) = 1<br>" +
      "weight of edge (2, G) = 3<br>" +
      "candidate g(G) = 1 + 3 = 4, so f(G) = 4<br>" +
      "G enters the queue with f = 4. We found a path to G, but A* only stops when G has the smallest f.",
    expectedChests: null,
    expectedEdges: [[2, 4]],
    updatedDistance: { 4: 4 },
    errorMessage: "Click on edge (2, G).",
  },
  {
    instruction:
      "Step 6: Click on edge (2, 1). Type 4 in the input dialog, press OK, then choose the smaller value.",
    explanation:
      "g(2) = 1<br>" +
      "weight of edge (2, 1) = 3<br>" +
      "candidate g(1) = 1 + 3 = 4<br>" +
      "Node 1 already has g(1) = 2. Keep the smaller one, 2.",
    expectedChests: null,
    expectedEdges: [[2, 1]],
    updatedDistance: { 1: 4 },
    errorMessage: "Click on edge (2, 1).",
  },
  {
    instruction:
      "Step 7: All edges going out of node 2 have been relaxed. Click on node 1.",
    explanation:
      "Queue: node 1 (f = 2), node 3 (f = 3), G (f = 4). Node 1 has the smallest f — settle it.",
    expectedChests: [1],
    expectedEdges: null,
    errorMessage: "Click on node 1.",
  },
  {
    instruction:
      "Step 8: Click on edge (1, 3). Type 6 in the input dialog, press OK, then choose the smaller value.",
    explanation:
      "Skip edges to settled nodes.<br><br>" +
      "g(1) = 2<br>" +
      "weight of edge (1, 3) = 4<br>" +
      "candidate g(3) = 2 + 4 = 6<br>" +
      "Node 3 already has g(3) = 3. Keep the smaller one, 3.",
    expectedChests: null,
    expectedEdges: [[1, 3]],
    updatedDistance: { 3: 6 },
    errorMessage: "Click on edge (1, 3).",
  },
  {
    instruction:
      "Step 9: All edges going out of node 1 have been relaxed. Click on node 3.",
    explanation:
      "Queue: node 3 (f = 3), G (f = 4). Node 3 has the smallest f — settle it.",
    expectedChests: [3],
    expectedEdges: null,
    errorMessage: "Click on node 3.",
  },
  {
    instruction:
      "Step 10: Click on edge (3, G). Type 4 in the input dialog, and press OK.",
    explanation:
      "g(3) = 3<br>" +
      "weight of edge (3, G) = 1<br>" +
      "candidate g(G) = 3 + 1 = 4<br>" +
      "G already has g(G) = 4. Same cost, so g(G) stays 4.",
    expectedChests: null,
    expectedEdges: [[3, 4]],
    updatedDistance: { 4: 4 },
    errorMessage: "Click on edge (3, G).",
  },
  {
    instruction: "Step 11: Click on node G, the goal.",
    explanation:
      "Queue: G (f = 4). G has the smallest f and is the goal — stop. Shortest path costs 4: S → 2 → G.",
    expectedChests: [4],
    expectedEdges: null,
    errorMessage: "Click on node G.",
  },
];
