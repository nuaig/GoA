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
      "• If you see overlapping edges or overlapping numbers in the graph, click the \"Rearrange chests\" button in the upper right corner.<br>" +
      "• To read more about the A* algorithm, use the \"Click for help\" button in the lower right corner.<br>" +
      "• Our goal is to find the shortest path from the start node S to the goal node G.<br>" +
      "• For every node n, A* keeps g(n), the cost of the best path found so far from S to n. It also uses h(n), an estimate of the remaining cost from n to G. It ranks nodes by f(n) = g(n) + h(n).<br>" +
      "• In this tutorial h(n) = 0 for every node, so f(n) = g(n), and A* behaves like Dijkstra's algorithm, except that it stops as soon as it reaches G.<br>" +
      "• At the start, g(S) = 0 and every other node has g = ∞. The Priority Queue table shows g, h and f for each node in the queue, and the Settled table shows the nodes we have finished.",
    expectedChests: null,
    expectedEdges: null,
    errorMessage: "Read the introduction, then press Next to begin.",
  },
  {
    instruction: "Step 0: Click on node S to begin.",
    explanation:
      "In each iteration, we take the node with the smallest f from the priority queue. At the start only S is in the queue, with f(S) = 0 + 0 = 0.<br>" +
      "When you click on S, its chest opens: S is now settled.",
    expectedChests: [0],
    expectedEdges: null,
    errorMessage: "Click on node S to begin.",
  },
  {
    instruction:
      "Step 1: Click on edge (S, 2). Type 1 in the input dialog, and press OK.",
    explanation:
      "We \"relax\" every edge (u, v) going out of the selected node u. Relaxing means computing a candidate g(v) = g(u) + weight(u, v), and then f(v) = g(v) + h(v).<br><br>" +
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
      "Queue: node 2 (f = 1), node 1 (f = 2). Node 2 has the smallest f, so we settle it next.",
    expectedChests: [2],
    expectedEdges: null,
    errorMessage: "Click on node 2: it has the smallest f in the queue.",
  },
  {
    instruction:
      "Step 4: Click on edge (2, 3). Type 3 in the input dialog, and press OK.",
    explanation:
      "Edge (2, S) leads to S, which is already settled, so we skip it.<br><br>" +
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
      "G enters the queue with f = 4. We have found a path to G, but A* does not stop yet: it only stops when G is the node with the smallest f in the queue.",
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
      "Node 1 already has g(1) = 2 (through S). We now have 2 candidates for node 1, 2 and 4, and we keep the smaller one, 2.",
    expectedChests: null,
    expectedEdges: [[2, 1]],
    updatedDistance: { 1: 4 },
    errorMessage: "Click on edge (2, 1).",
  },
  {
    instruction:
      "Step 7: All edges going out of node 2 have been relaxed. Click on node 1.",
    explanation:
      "Queue: node 1 (f = 2), node 3 (f = 3), G (f = 4). Node 1 has the smallest f, so we settle it next.",
    expectedChests: [1],
    expectedEdges: null,
    errorMessage: "Click on node 1: it has the smallest f in the queue.",
  },
  {
    instruction:
      "Step 8: Click on edge (1, 3). Type 6 in the input dialog, press OK, then choose the smaller value.",
    explanation:
      "Edges (1, S) and (1, 2) lead to settled nodes, so we skip them.<br><br>" +
      "g(1) = 2<br>" +
      "weight of edge (1, 3) = 4<br>" +
      "candidate g(3) = 2 + 4 = 6<br>" +
      "Node 3 already has g(3) = 3 (through node 2). We keep the smaller value, 3.",
    expectedChests: null,
    expectedEdges: [[1, 3]],
    updatedDistance: { 3: 6 },
    errorMessage: "Click on edge (1, 3).",
  },
  {
    instruction:
      "Step 9: All edges going out of node 1 have been relaxed. Click on node 3.",
    explanation:
      "Queue: node 3 (f = 3), G (f = 4). Node 3 has the smallest f, so we settle it next.",
    expectedChests: [3],
    expectedEdges: null,
    errorMessage: "Click on node 3: it has the smallest f in the queue.",
  },
  {
    instruction:
      "Step 10: Click on edge (3, G). Type 4 in the input dialog, and press OK.",
    explanation:
      "g(3) = 3<br>" +
      "weight of edge (3, G) = 1<br>" +
      "candidate g(G) = 3 + 1 = 4<br>" +
      "G already has g(G) = 4. The new path S → 2 → 3 → G costs the same, so g(G) stays 4.",
    expectedChests: null,
    expectedEdges: [[3, 4]],
    updatedDistance: { 4: 4 },
    errorMessage: "Click on edge (3, G).",
  },
  {
    instruction: "Step 11: Click on node G, the goal.",
    explanation:
      "Queue: G (f = 4). G now has the smallest f, and it is the goal, so A* stops. The shortest path from S to G costs 4: S → 2 → G (1 + 3).",
    expectedChests: [4],
    expectedEdges: null,
    errorMessage: "Click on node G to finish.",
  },
];
