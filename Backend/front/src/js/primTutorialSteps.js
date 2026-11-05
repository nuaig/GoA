// Steps for the Prim tutorial (tutorial graph: createSpecificGraphPrimTutorial):
//   0-1 = 3, 0-2 = 1, 1-2 = 4, 1-3 = 2, 1-4 = 6, 2-3 = 5, 3-4 = 7; start node 0.
//
// Step types:
//   - type: "info"   -> read-only page; the player presses the Next button.
//   - expectedEdge   -> [start, end, weight] the player should click,
//                       or null for "any edge" (used by the final page).
// Text is rendered as HTML inside a <pre>, so use <br> for line breaks.
export const tutorialSteps = [
  {
    type: "info",
    instruction: "Read the notes below, then press Next.",
    explanation:
      "• If you see overlapping edges or overlapping numbers in the graph, click the \"Rearrange chests\" button in the upper right corner.<br>" +
      "• To read more about Prim's algorithm, including its pseudo-code, use the \"Click for help\" button in the lower right corner.<br>" +
      "• Our goal is to build a Minimum Spanning Tree (MST): a set of edges that connects all nodes (chests) without forming any cycle, with the smallest possible total weight. A graph with 5 nodes needs exactly 4 edges.<br>" +
      "• Prim's algorithm grows the tree from one starting node, here node 0 (marked \"Start\"). Node 0 is \"visited\"; all other nodes are \"unvisited\".<br>" +
      "• In each iteration, we look at the edges that connect a visited node to an unvisited node and pick the one with the smallest weight. Its unvisited node becomes visited. We stop when every node is visited.",
    expectedEdge: null,
    errorMessage: "Read the introduction, then press Next to begin.",
  },
  {
    instruction: "Step 1: Click on edge 0-2 with weight 1.",
    explanation:
      "Visited: {0}. Edges from a visited node to an unvisited node: 0-2 (weight 1) and 0-1 (weight 3). The smallest is 0-2, so we add it, and node 2 becomes visited.<br><br>" +
      "MST so far: 0-2. Total weight = 1.",
    expectedEdge: [0, 2, 1],
    errorMessage: "Wrong selection! Start with edge 0-2 with weight 1.",
  },
  {
    instruction:
      "Step 2: Make a mistake on purpose: click on edge 1-3 with weight 2 and see why it is rejected.",
    explanation:
      "Edge 1-3 (weight 2) is the smallest edge left in the whole graph, but Prim's algorithm only looks at edges that touch a visited node. Visited: {0, 2}. Neither node 1 nor node 3 is visited, so 1-3 is not connected to the tree yet. The hints below show which rule it breaks.",
    expectedEdge: [1, 3, 2],
    errorMessage:
      "Let's try to click edge 1-3 with weight 2 to see why that is not a good choice.",
  },
  {
    instruction: "Step 3: Click on edge 0-1 with weight 3.",
    explanation:
      "Visited: {0, 2}. Edges from a visited node to an unvisited node: 0-1 (weight 3), 1-2 (weight 4), 2-3 (weight 5). The smallest is 0-1, so we add it, and node 1 becomes visited.<br><br>" +
      "MST so far: 0-2, 0-1. Total weight = 1 + 3 = 4.",
    expectedEdge: [0, 1, 3],
    errorMessage: "Wrong selection! Pick edge 0-1 with weight 3.",
  },
  {
    instruction: "Step 4: Click on edge 1-3 with weight 2.",
    explanation:
      "Visited: {0, 1, 2}. Edges from a visited node to an unvisited node: 1-3 (weight 2), 2-3 (weight 5), 1-4 (weight 6). The smallest is 1-3. It was rejected in Step 2 only because it didn't touch the tree; now node 1 is visited, so we add it, and node 3 becomes visited.<br><br>" +
      "MST so far: 0-2, 0-1, 1-3. Total weight = 1 + 3 + 2 = 6.",
    expectedEdge: [1, 3, 2],
    errorMessage: "Wrong selection! Pick edge 1-3 with weight 2.",
  },
  {
    instruction:
      "Step 5: Make a mistake on purpose: click on edge 1-2 with weight 4 and see why it is rejected.",
    explanation:
      "Edge 1-2 (weight 4) connects two nodes that are both already visited. They are already joined through node 0 (1 → 0 → 2), so adding 1-2 would form a cycle. Prim's algorithm never adds an edge between two visited nodes. The hints below show which rule it breaks.",
    expectedEdge: [1, 2, 4],
    errorMessage:
      "Let's try to click edge 1-2 with weight 4 to see why that is not a good choice.",
  },
  {
    instruction: "Step 6: Click on edge 1-4 with weight 6.",
    explanation:
      "Visited: {0, 1, 2, 3}. Edges from a visited node to an unvisited node: 1-4 (weight 6) and 3-4 (weight 7). The smallest is 1-4, so we add it, and node 4 becomes visited.<br><br>" +
      "All 5 nodes are now visited and the MST has 4 edges, so we are done.<br>" +
      "MST: 0-2, 0-1, 1-3, 1-4. Total weight = 1 + 3 + 2 + 6 = 12.",
    expectedEdge: [1, 4, 6],
    errorMessage: "Wrong selection! Pick edge 1-4 with weight 6.",
  },
  {
    instruction: "Voila! You've built the Minimum Spanning Tree.",
    explanation:
      "The MST is 0-2, 0-1, 1-3, 1-4, with total weight 12. It connects all nodes, contains no cycle, and no other set of 4 edges has a smaller total weight.",
    expectedEdge: null,
    errorMessage: "You've completed the tutorial! Click anywhere to exit.",
  },
];
