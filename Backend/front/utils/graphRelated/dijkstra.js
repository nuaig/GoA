export class DijkstraAlgorithm {
  constructor(graph, startNode = 0) {
    this.graph = graph;
    this.startNode = startNode;
    this.adjacencyList = this.buildAdjacencyList(graph.edges);
    this.steps = [];
    this.currentStepIndex = 0;
    this.distances = {};
    this.previous = {};
    this.paths = {};

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
    const previous = {};
    const visited = new Set();
    const alreadyPressed = new Set();
    const priorityQueue = new MinPriorityQueue();

    for (let node in this.adjacencyList) {
      distances[node] = Infinity;
      previous[node] = null;
    }

    distances[start] = 0;
    priorityQueue.enqueue(start, 0);

    while (!priorityQueue.isEmpty()) {
      const currentNode = priorityQueue.dequeue().element;

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
      const validEdges = [];

      for (const { node: neighbor, weight } of neighbors) {
        const newDistance = distances[currentNode] + weight;

        if (newDistance < distances[neighbor]) {
          distances[neighbor] = newDistance;
          previous[neighbor] = parseInt(currentNode);
          priorityQueue.enqueue(neighbor, newDistance);
        }

        // [FIX] Only include edge if neighbor not yet visited or already used
        if (
          !visited.has(neighbor) &&
          !alreadyPressed.has(neighbor) &&
          !this.edgeAlreadyExpected(currentNode, neighbor)
        ) {
          validEdges.push({
            edge: [parseInt(currentNode), neighbor],
            weight: distances[neighbor],
          });
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

    const paths = {};
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

  edgeAlreadyExpected(a, b) {
    return this.steps.some((step) =>
      step.expectedEdges?.some(
        ({ edge: [x, y] }) => (x === a && y === b) || (x === b && y === a)
      )
    );
  }

  selectEdge(edge) {
    const step = this.steps[this.currentStepIndex];
    if (!step || !step.expectedEdges) return [0, 0];

    const [a, b] = edge;
    const match = step.expectedEdges.find(
      ({ edge: [x, y] }) => (a === x && b === y) || (a === y && b === x)
    );

    if (match) {
      if (!step.selectedEdges) step.selectedEdges = [];

      const alreadyChosen = step.selectedEdges.some(
        ([x, y]) => (a === x && b === y) || (a === y && b === x)
      );
      if (alreadyChosen) return [0, 0];

      step.selectedEdges.push([a, b]);

      const allSelected =
        step.expectedEdges.length === step.selectedEdges.length;
      if (allSelected) {
        this.currentStepIndex++;
      }

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
