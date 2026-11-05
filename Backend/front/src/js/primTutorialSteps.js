// Steps for the Prim tutorial (tutorial graph: createSpecificGraphPrimTutorial).
// expectedEdge: [start, end, weight] the player should click, or null for "any edge".
export const tutorialSteps = [
  {
    instruction:
      "Select any edge to begin the tutorial after reading the explanation below.",
    explanation:
      "The treasure chests represent nodes, and the lines between them represent edges. Your goal is to open all the chests by forming a Minimum Spanning Tree (MST). An MST is a subset of edges that connects all nodes without forming cycles while keeping the total weight at a minimum.",
    expectedEdge: null, // No specific edge expected at this step
    errorMessage: "Click on any edge to start the tutorial.",
  },
  {
    instruction:
      "Select edge 0-2 with weight 1 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "You can start with any node as starting node but for this tutorial, let's start from node 0. Mark this node 0 as visited. You have to choose the edge with the minimum weight that connects any visited node (0) to any unvisited node (1, 2, 3, 4). There are only two edges that connects visisted node 0 to other unvisited nodes. Edge 0-1 has minimum weight among them.",
    expectedEdge: [0, 2, 1],
    errorMessage: "Wrong selection!",
  },
  {
    instruction:
      "Make a mistake by selecting edge 1-3 with weight 2 by clicking on it. Read the explanation carefully to understand why this is wrong.",
    explanation:
      "Even though this edge 1-3 with weight 2 is the next minimum edge in the whole graph. However, this edge is not connecting to any visited node. Therefore, it is a wrong choice.",
    expectedEdge: [1, 3, 2],
    errorMessage: "Wrong selection!",
  },
  {
    instruction:
      "Select edge 0-1 with weight 3 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "Look at all the edges that connects visited nodes (0, 2) to unvisited nodes (1, 3, 4). You will find that edge 0-1 with weight 3 is the edge with minimum weight among them. Therefore, it is added to the MST.",
    expectedEdge: [0, 1, 3],
    errorMessage:
      "Let's try to click edge 1-2 with weight 3 to see why that is not a good choice.",
  },
  {
    instruction:
      "Select edge 1-3 with weight 2 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "Look at all the edges that connects visited nodes (0, 1, 2) to unvisited nodes (3, 4). You will find that edge 1-3 with weight 2 is the edge with minimum weight among them. Therefore, it is added to the MST.",
    expectedEdge: [1, 3, 2],
    errorMessage:
      "Let's try to click edge 1-2 with weight 3 to see why that is not a good choice.",
  },
  {
    instruction:
      "Make a mistake by selecting edge 1-2 with weight 4 by clicking on it. Read the explanation carefully to understand why this is wrong.",
    explanation:
      "Even though this edge 1-2 with weight 4 is the next available edge with minimum weight, there are two reasons why this is incorrect. First reason is that it will cause a cycle and the other is that it is connected to two visited nodes (1, 2).",
    expectedEdge: [1, 2, 4],
    errorMessage:
      "Wrong selection! Pick the edge between nodes 1 and 3 with weight 4.",
  },
  {
    instruction:
      "Select edge 1-4 with weight 6 by clicking on it. Make sure to read the explanation before you select the edge.",
    explanation:
      "Look at all the edges that connects visited nodes (0, 1, 2, 3) to unvisited nodes (4). You will find that edge 1-4 with weight 6 is the edge with minimum weight among them. Therefore, it is added to the MST and you will achieve the minimum spanning tree since all nodes are already connected.",
    expectedEdge: [1, 4, 6],
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
