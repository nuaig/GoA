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
      "• If you see overlapping edges or overlapping numbers in the graph, click the \"Rearrange chests\" button in the upper right corner.<br>" +
      "• To read more about Kruskal's algorithm, including its pseudo-code, use the \"Click for help\" button in the lower right corner.<br>" +
      "• Our goal is to build a Minimum Spanning Tree (MST): a set of edges that connects all nodes (chests) without forming any cycle, with the smallest possible total weight. A graph with 4 nodes needs exactly 3 edges.<br>" +
      "• Kruskal's algorithm starts by sorting all edges by weight, smallest first: 0-2 (1), 0-1 (2), 1-2 (3), 1-3 (4), 2-3 (5).<br>" +
      "• Then we go through the sorted list. For each edge, if its two nodes are not already connected, we add it to the MST. If they are already connected, adding it would form a cycle, so we skip it. We stop once we have 3 edges.",
    expectedEdge: null,
    errorMessage: "Read the introduction, then press Next to begin.",
  },
  {
    instruction: "Step 1: Click on edge 0-2 with weight 1.",
    explanation:
      "Edge 0-2 is first in the sorted list (weight 1). Nodes 0 and 2 are not connected yet, so adding it cannot create a cycle. We add it to the MST.<br><br>" +
      "MST so far: 0-2. Total weight = 1.",
    expectedEdge: [0, 2, 1],
    errorMessage:
      "Wrong selection! Start with the smallest edge (0-2 with weight 1).",
  },
  {
    instruction: "Step 2: Click on edge 0-1 with weight 2.",
    explanation:
      "Next in the sorted list is edge 0-1 (weight 2). Is node 1 already connected to node 0? No, so far only nodes 0 and 2 are connected. No cycle, so we add it.<br><br>" +
      "MST so far: 0-2, 0-1. Total weight = 1 + 2 = 3.",
    expectedEdge: [0, 1, 2],
    errorMessage:
      "Wrong selection! The next smallest edge is 0-1 with weight 2.",
  },
  {
    instruction:
      "Step 3: Make a mistake on purpose: click on edge 1-2 with weight 3 and see why it is rejected.",
    explanation:
      "Edge 1-2 (weight 3) is next in the sorted list. But nodes 1 and 2 are already connected through node 0 (1 → 0 → 2). Adding 1-2 would close the loop 1 → 0 → 2 → 1, which is a cycle. So Kruskal's algorithm skips this edge. The hints below show which rule it breaks.",
    expectedEdge: [1, 2, 3],
    errorMessage:
      "Let's try to click edge 1-2 with weight 3 to see why that is not a good choice.",
  },
  {
    instruction: "Step 4: Click on edge 1-3 with weight 4.",
    explanation:
      "Next in the sorted list is edge 1-3 (weight 4). Node 3 is not connected to anything yet, so there is no cycle. We add it.<br><br>" +
      "The MST now has 3 edges and connects all 4 nodes, so we are done. Edge 2-3 (weight 5) is never needed.<br>" +
      "MST: 0-2, 0-1, 1-3. Total weight = 1 + 2 + 4 = 7.",
    expectedEdge: [1, 3, 4],
    errorMessage:
      "Wrong selection! Pick the edge between nodes 1 and 3 with weight 4.",
  },
  {
    instruction: "Voila! You've built the Minimum Spanning Tree.",
    explanation:
      "The MST is 0-2, 0-1, 1-3, with total weight 7. These edges connect all nodes, contain no cycle, and no other set of 3 edges has a smaller total weight.",
    expectedEdge: null,
    errorMessage: "You've completed the tutorial! Click anywhere to exit.",
  },
];
