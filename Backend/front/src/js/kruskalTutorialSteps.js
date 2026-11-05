// Steps for the Kruskal tutorial (tutorial graph: createSpecificGraphKruskalTutorial).
// expectedEdge: [start, end, weight] the player should click, or null for "any edge".
export const tutorialSteps = [
  {
    instruction:
      "Select any edge to begin the tutorial after reading the explanation below.",
    explanation:
      "The treasure chests represent nodes, and the lines between them represent edges. Node 0 will be your starting node. Your goal is to open all the chests by forming a Minimum Spanning Tree (MST). An MST is a subset of edges that connects all nodes without forming cycles while keeping the total weight at a minimum.",
    expectedEdge: null, // No specific edge expected at this step
    errorMessage: "Click on any edge to start the tutorial.",
  },
  {
    instruction:
      "Select edge 0-2 with weight 1 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "First, sort all edges in ascending order. Select the edge with the minimum weight to be added to the MST. The first edge to be added is the edge between node 0 and 2 with weight 1 since it is the smallest.",
    expectedEdge: [0, 2, 1],
    errorMessage:
      "Wrong selection! Start with the smallest edge (0-2 with weight 1).",
  },
  {
    instruction:
      "Select edge 0-1 with weight 2 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "The next edge in the sorted list is between node 0 and 1 with weight 2. Check if it will cause a cycle. Since edge 0-1 doesn't form a cycle, it can be safely added to the MST.",
    expectedEdge: [0, 1, 2],
    errorMessage:
      "Wrong selection! The next smallest edge is 0-1 with weight 2.",
  },
  {
    instruction:
      "Make a mistake by selecting edge 1-2 with weight 3 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "Edge 1-2 with weight 3 is the next minimum-weight edge. However, adding it to the MST will create a cycle. Therefore, this selection is incorrect.",
    expectedEdge: [1, 2, 3],
    errorMessage:
      "Let's try to click edge 1-2 with weight 3 to see why that is not a good choice",
  },
  {
    instruction:
      "Select edge 1-3 with weight 4 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "Edge 1-3 with weight 4 is the next edge with minimum weight. Since it doesn't cause a cycle, it can be safely added to the MST and you will achieve the minimum spanning tree since all nodes are already connected.",
    expectedEdge: [1, 3, 4],
    errorMessage:
      "Wrong selection! Pick the edge between nodes 1 and 3 with weight 4.",
  },
  {
    instruction: "Voila! You've successfully built the MST.",
    explanation:
      "You have connected all nodes without forming cycles while maintaining the minimum total weight. Congratulations on completing the tutorial!",
    expectedEdge: null, // No specific edge expected for completion
    errorMessage: "You've completed the tutorial! Click anywhere to exit.",
  },
];
