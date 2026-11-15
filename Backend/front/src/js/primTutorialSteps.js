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
      "• Goal: build a Minimum Spanning Tree (MST) — connect all chests with the smallest total weight and no loops. A graph with 5 nodes needs exactly 4 edges.<br>" +
      "• Start from node 0 (marked \"Start\"). Grow the tree outward from there.<br>" +
      "• Each round: look only at edges from a visited node to an unvisited node, and pick the smallest one.<br>" +
      "• Overlap? Use \"Rearrange chests\" (upper right). More help: \"Click for help\" (lower right).",
    expectedEdge: null,
    errorMessage: "Press Next to begin.",
  },
  {
    instruction: "Step 1: Click on edge 0-2 with weight 1.",
    explanation:
      "Visited: {0}. Edges from a visited node to an unvisited node: 0-2 (weight 1) and 0-1 (weight 3). Smallest is 0-2 — add it.<br><br>" +
      "MST so far: 0-2. Total weight = 1.",
    expectedEdge: [0, 2, 1],
    errorMessage: "Click edge 0-2 with weight 1.",
  },
  {
    instruction:
      "Step 2: Make a mistake on purpose: click on edge 1-3 with weight 2 and see why it is rejected.",
    explanation:
      "Edge 1-3 (weight 2) looks cheap, but Prim only allows edges that touch the tree. Visited: {0, 2}. Neither 1 nor 3 is visited, so 1-3 is not connected to the tree yet.",
    expectedEdge: [1, 3, 2],
    errorMessage: "Click edge 1-3 with weight 2 to see why it is rejected.",
  },
  {
    instruction: "Step 3: Click on edge 0-1 with weight 3.",
    explanation:
      "Visited: {0, 2}. Edges from a visited node to an unvisited node: 0-1 (weight 3), 1-2 (weight 4), 2-3 (weight 5). Smallest is 0-1 — add it.<br><br>" +
      "MST so far: 0-2, 0-1. Total weight = 1 + 3 = 4.",
    expectedEdge: [0, 1, 3],
    errorMessage: "Click edge 0-1 with weight 3.",
  },
  {
    instruction: "Step 4: Click on edge 1-3 with weight 2.",
    explanation:
      "Visited: {0, 1, 2}. Edges from a visited node to an unvisited node: 1-3 (weight 2), 2-3 (weight 5), 1-4 (weight 6). Smallest is 1-3 — now it touches the tree, so add it.<br><br>" +
      "MST so far: 0-2, 0-1, 1-3. Total weight = 1 + 3 + 2 = 6.",
    expectedEdge: [1, 3, 2],
    errorMessage: "Click edge 1-3 with weight 2.",
  },
  {
    instruction:
      "Step 5: Make a mistake on purpose: click on edge 1-2 with weight 4 and see why it is rejected.",
    explanation:
      "Edge 1-2 (weight 4) joins two visited nodes. They are already linked through 0, so adding it would form a cycle.",
    expectedEdge: [1, 2, 4],
    errorMessage: "Click edge 1-2 with weight 4 to see why it is rejected.",
  },
  {
    instruction: "Step 6: Click on edge 1-4 with weight 6.",
    explanation:
      "Visited: {0, 1, 2, 3}. Edges from a visited node to an unvisited node: 1-4 (weight 6) and 3-4 (weight 7). Smallest is 1-4 — add it. All 5 nodes are visited — done.<br><br>" +
      "MST so far: 0-2, 0-1, 1-3, 1-4. Total weight = 1 + 3 + 2 + 6 = 12.",
    expectedEdge: [1, 4, 6],
    errorMessage: "Click edge 1-4 with weight 6.",
  },
  {
    instruction: "Done! You built the Minimum Spanning Tree.",
    explanation:
      "MST: 0-2, 0-1, 1-3, 1-4. Total weight = 12. All nodes connected, no cycle, smallest total.",
    expectedEdge: null,
    errorMessage: "Tutorial complete.",
  },
];
