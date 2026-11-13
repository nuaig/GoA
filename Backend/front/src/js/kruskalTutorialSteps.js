// Steps for the Kruskal tutorial (tutorial graph: createSpecificGraphKruskalTutorial):
//   0-1 = 2, 0-2 = 1, 1-2 = 3, 1-3 = 4, 2-3 = 5
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
      "• Goal: build a Minimum Spanning Tree (MST) — connect all chests with the smallest total weight and no loops. A graph with 4 nodes needs exactly 3 edges.<br>" +
      "• Sort edges smallest first: 0-2 (1), 0-1 (2), 1-2 (3), 1-3 (4), 2-3 (5).<br>" +
      "• Rule: add an edge if its two nodes are not already connected. Skip it if it would make a cycle. Stop at 3 edges.<br>" +
      "• Overlap? Use \"Rearrange chests\" (upper right). More help: \"Click for help\" (lower right).",
    expectedEdge: null,
    errorMessage: "Press Next to begin.",
  },
  {
    instruction: "Step 1: Click on edge 0-2 with weight 1.",
    explanation:
      "Smallest edge first: 0-2 (weight 1). Nodes 0 and 2 are not connected yet, so add it.<br><br>" +
      "MST so far: 0-2. Total weight = 1.",
    expectedEdge: [0, 2, 1],
    errorMessage: "Click the smallest edge: 0-2 with weight 1.",
  },
  {
    instruction: "Step 2: Click on edge 0-1 with weight 2.",
    explanation:
      "Next: 0-1 (weight 2). Node 1 is new, so no cycle — add it.<br><br>" +
      "MST so far: 0-2, 0-1. Total weight = 1 + 2 = 3.",
    expectedEdge: [0, 1, 2],
    errorMessage: "Click the next smallest edge: 0-1 with weight 2.",
  },
  {
    instruction:
      "Step 3: Make a mistake on purpose: click on edge 1-2 with weight 3 and see why it is rejected.",
    explanation:
      "Next: 1-2 (weight 3). Nodes 1 and 2 are already linked through 0 (1 → 0 → 2). Adding 1-2 would make a cycle, so skip it.",
    expectedEdge: [1, 2, 3],
    errorMessage: "Click edge 1-2 with weight 3 to see why it is rejected.",
  },
  {
    instruction: "Step 4: Click on edge 1-3 with weight 4.",
    explanation:
      "Next: 1-3 (weight 4). Node 3 is new, so add it. We now have 3 edges and all 4 nodes — done. Edge 2-3 is never needed.<br><br>" +
      "MST so far: 0-2, 0-1, 1-3. Total weight = 1 + 2 + 4 = 7.",
    expectedEdge: [1, 3, 4],
    errorMessage: "Click edge 1-3 with weight 4.",
  },
  {
    instruction: "Done! You built the Minimum Spanning Tree.",
    explanation:
      "MST: 0-2, 0-1, 1-3. Total weight = 7. All nodes connected, no cycle, smallest total.",
    expectedEdge: null,
    errorMessage: "Tutorial complete.",
  },
];
