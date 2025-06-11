export class DijkstraAlgorithm {
  constructor(graph) {
    this.graph = graph;
    this.selectedEdges = [];
    this.unSelectedEdges = [...graph.edges];
    this.currentWeight = 0;
  }

  getInitialEdges() {
    return [];
  }

  getNextEdges() {
    return [];
  }

  selectEdge(edge) {
    console.log("Dijkstra selecting edge");
    return [0, 0]; // Always wrong by default
  }

  isComplete() {
    return false;
  }

  getAllNodesWithSameParent(node) {
    return []; // Empty by default
  }
}
