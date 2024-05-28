export class PrimAlgorithm {
  constructor(graph) {
    this.graph = graph;
    this.selectedNodes = new Set();
    this.selectedEdges = [];
    this.remainingEdges = [...graph.edges]; // Initialize remainingEdges with all edges
    this.currentWeight = 0;
  }

  // Set the starting node and initialize the edges connected to the starting node
  setStartingNode(index) {
    this.selectedNodes.add(index);
  }

  // Get the next valid edges after selecting an edge
  getNextEdges() {
    const nextEdges = [];

    this.selectedNodes.forEach((node) => {
      this.remainingEdges.forEach((edge) => {
        if (
          (edge[0] === node && !this.selectedNodes.has(edge[1])) ||
          (edge[1] === node && !this.selectedNodes.has(edge[0]))
        ) {
          nextEdges.push(edge);
        }
      });
    });

    nextEdges.sort((a, b) => a[2] - b[2]);

    // Get the minimum weight
    const minWeight = nextEdges.length > 0 ? nextEdges[0][2] : null;

    // Filter and return all edges with the minimum weight
    return nextEdges.filter((edge) => edge[2] === minWeight);
  }

  // Select an edge and update the state
  selectEdge(edge) {
    const nextEdges = this.getNextEdges();
    const [node1, node2, weight] = edge;

    // Check if the selected edge is in the list of next valid edges
    const isValidEdge = nextEdges.some(
      (e) => e[0] === edge[0] && e[1] === edge[1] && e[2] === edge[2]
    );
    if (!isValidEdge) {
      return false; // Edge is not valid according to Prim's algorithm
    }

    if (this.selectedNodes.has(node1) && this.selectedNodes.has(node2)) {
      return false; // Edge forms a cycle
    }

    // Successfully add the edge
    this.selectedEdges.push(edge);
    this.currentWeight += weight;
    this.selectedNodes.add(node1);
    this.selectedNodes.add(node2);

    // Remove the selected edge and any edges that would form a cycle from remainingEdges
    this.remainingEdges = this.remainingEdges.filter(
      (e) =>
        !(e[0] === edge[0] && e[1] === edge[1] && e[2] === edge[2]) &&
        !(this.selectedNodes.has(e[0]) && this.selectedNodes.has(e[1]))
    );

    return true;
  }

  // Check if the algorithm is complete
  isComplete() {
    return this.selectedEdges.length === this.graph.nodes.length - 1;
  }
}
