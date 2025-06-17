export class DijkstraAlgorithm {
  constructor(graph, startNode = 0) {
    this.graph = graph;
    this.startNode = startNode;
    this.adjacencyList = this.buildAdjacencyList(graph.edges);
    this.steps = [];
    this.currentStepIndex = 0;
    this.distances = {};
    this.previous = {};

    this.dijkstra(this.startNode);
    console.log("Generated Dijkstra steps:", this.steps);
  }

  buildAdjacencyList(edges) {
    const adjList = {};
    for (const [from, to, weight] of edges) {
      if (!adjList[from]) adjList[from] = [];
      if (!adjList[to]) adjList[to] = [];
      adjList[from].push({ node: to, weight });
      adjList[to].push({ node: from, weight });
    }
    return adjList;
  }

  dijkstra(start) {
    const distances = {};
    const priorityQueue = new MinPriorityQueue();
    const previous = {};
    const paths = {};
    const visited = new Set();
    const alreadyPressed = new Set();

    for (let node in this.adjacencyList) {
      distances[node] = Infinity;
      previous[node] = null;
    }
    distances[start] = 0;
    priorityQueue.enqueue(start, 0);

    while (!priorityQueue.isEmpty()) {
      let currentNode = priorityQueue.dequeue().element;

      if (!alreadyPressed.has(currentNode)) {
        this.steps.push({
          expectedChest: parseInt(currentNode),
          expectedEdges: null,
          errorMessage: "Incorrect node selection.",
        });
        alreadyPressed.add(currentNode);
      }

      visited.add(currentNode);
      const neighbors = this.adjacencyList[currentNode] || [];
      let validEdges = [];

      for (const { node: neighbor, weight } of neighbors) {
        if (visited.has(neighbor)) continue;

        const newDist = distances[currentNode] + weight;
        if (newDist < distances[neighbor]) {
          distances[neighbor] = newDist;
          previous[neighbor] = parseInt(currentNode);
          priorityQueue.enqueue(neighbor, newDist);
          validEdges.push({ edge: [parseInt(currentNode), neighbor], weight });
        }
      }

      if (validEdges.length > 0) {
        this.steps.push({
          expectedChest: null,
          expectedEdges: validEdges,
          errorMessage: "Incorrect edge selection.",
        });
      }
    }

    for (let node in distances) {
      const path = [];
      let temp = node;
      while (temp !== null) {
        path.unshift(temp);
        temp = previous[temp];
      }
      paths[node] = path.length > 1 ? path : null;
    }

    this.distances = distances;
    this.previous = previous;
    this.paths = paths;
  }

  selectEdge(edge) {
    const step = this.steps[this.currentStepIndex];
    if (!step || !step.expectedEdges) return [0, 0];

    const [a, b] = edge;
    const match = step.expectedEdges.find(
      ({ edge: [x, y] }) => (a === x && b === y) || (a === y && b === x)
    );

    if (match) {
      this.currentStepIndex++;
      return [1, match.weight];
    }

    return [0, 0];
  }

  isComplete() {
    return this.currentStepIndex >= this.steps.length;
  }

  getAllNodesWithSameParent(node) {
    return [node];
  }
}

class MinPriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(element, priority) {
    this.values.push({ element, priority });
    this.sort();
  }

  dequeue() {
    return this.values.shift();
  }

  isEmpty() {
    return this.values.length === 0;
  }

  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }
}
