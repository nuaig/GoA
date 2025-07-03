export class DijkstraAlgorithm {
  constructor(graph, startNode = 0) {
    this.graph = graph;
    this.startNode = startNode;
    this.adjacencyList = this.buildAdjacencyList(graph.edges);

    this.steps = [];
    this.currentStepIndex = 0;

    this.distances = {};
    this.previous = {};
    this.visited = new Set();
    this.priorityQueue = new MinPriorityQueue();
    this.paused = false;
    this.waitingNodes = [];

    this.resumedFromAmbiguity = false;
    this.resumedNode = null;

    this.dijkstra(this.startNode);
    console.log("========= INITIAL STEPS =========");
    this.steps.forEach((step, i) =>
      console.log(`[Step ${i}]`, JSON.stringify(step, null, 2))
    );
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
    for (let node in this.adjacencyList) {
      this.distances[node] = Infinity;
      this.previous[node] = null;
    }
    this.distances[start] = 0;
    this.priorityQueue.enqueue(start, 0);
    console.log("[dijkstra] Starting from node:", start);
    this.continueDijkstraFrom();
  }

  continueDijkstraFrom() {
    while (!this.priorityQueue.isEmpty() || this.resumedNode !== null) {
      let currentNode;

      if (this.resumedNode !== null) {
        currentNode = this.resumedNode;
        this.priorityQueue.remove(currentNode);
        console.log("[continueDijkstraFrom] Resuming from node:", currentNode);
        this.resumedNode = null;
      } else {
        const currentPriority = this.priorityQueue.peekPriority();
        const samePriorityNodes =
          this.priorityQueue.getAllWithPriority(currentPriority);
        const unvisitedSamePriority = samePriorityNodes.filter(
          (n) => !this.visited.has(n)
        );

        console.log(
          "[continueDijkstraFrom] Same-priority nodes:",
          samePriorityNodes
        );
        console.log(
          "[continueDijkstraFrom] Unvisited ties:",
          unvisitedSamePriority
        );

        if (!this.resumedFromAmbiguity && unvisitedSamePriority.length > 1) {
          this.waitingNodes = [...unvisitedSamePriority];
          this.steps.push({
            expectedChests: [...unvisitedSamePriority],
            expectedEdges: null,
            errorMessage:
              "Multiple nodes have the same shortest distance. Pick any one to continue.",
          });
          console.log("[continueDijkstraFrom] Ambiguity detected. Pausing.");
          this.paused = true;
          return;
        }

        const next = this.priorityQueue.dequeue();
        if (!next) break;
        currentNode = next.element;
        console.log("[continueDijkstraFrom] Dequeued node:", currentNode);
      }

      if (this.visited.has(currentNode)) {
        console.log(
          "[continueDijkstraFrom] Node already visited:",
          currentNode
        );
        continue;
      }

      if (!this.resumedFromAmbiguity) {
        this.steps.push({
          expectedChests: [Number(currentNode)],
          expectedEdges: null,
          errorMessage: "Click the correct closest node.",
        });
        console.log(
          "[continueDijkstraFrom] Added chest step for node:",
          currentNode
        );
      }

      this.visited.add(currentNode);
      this.resumedFromAmbiguity = false;

      const neighbors = this.adjacencyList[currentNode] || [];
      const validEdges = [];

      for (const { node: neighbor, weight } of neighbors) {
        if (this.visited.has(neighbor)) continue;

        const newDistance = this.distances[currentNode] + weight;
        if (newDistance < this.distances[neighbor]) {
          this.distances[neighbor] = newDistance;
          this.previous[neighbor] = Number(currentNode);
          this.priorityQueue.enqueue(neighbor, newDistance);
          console.log(
            `[continueDijkstraFrom] Updated distance of ${neighbor} to ${newDistance}`
          );
        }

        validEdges.push({
          edge: [Number(currentNode), neighbor],
          weight: this.distances[neighbor],
        });
      }

      if (validEdges.length > 0) {
        this.steps.push({
          expectedChests: null,
          expectedEdges: validEdges,
          errorMessage: "Now select a correct edge to update distances.",
        });
        console.log(
          "[continueDijkstraFrom] Added edge step for node:",
          currentNode
        );
      }
    }

    console.log("========= FINAL STEPS =========");
    this.steps.forEach((step, i) =>
      console.log(`[Step ${i}]`, JSON.stringify(step, null, 2))
    );
  }

  resumeFromNode(nodeId) {
    if (this.visited.has(nodeId)) {
      console.log(
        `[resumeFromNode] Node ${nodeId} was already visited. Ignoring resume.`
      );
      return;
    }

    this.paused = false;
    this.resumedFromAmbiguity = true;
    this.resumedNode = nodeId;
    this.waitingNodes = [];

    const currentPriority = this.distances[nodeId];
    const tied = this.priorityQueue.getAllWithPriority(currentPriority);
    console.log(
      "[resumeFromNode] Resuming from:",
      nodeId,
      "Removing ties:",
      tied
    );

    this.continueDijkstraFrom();
  }

  isComplete() {
    return this.currentStepIndex >= this.steps.length && !this.paused;
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
      console.log(`[selectEdge] Selected edge: ${a}-${b}`);

      const allSelected =
        step.expectedEdges.length === step.selectedEdges.length;
      if (allSelected) {
        this.currentStepIndex++;
        console.log("[selectEdge] All edges selected, moving to next step.");
      }

      return [1, match.weight];
    }

    return [0, 0];
  }
}

class MinPriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(element, priority) {
    this.values.push({ element, priority });
    this.sort();
    console.log(
      `[MinPriorityQueue] Enqueued: ${element} (priority ${priority})`
    );
  }

  dequeue() {
    const value = this.values.shift();
    console.log("[MinPriorityQueue] Dequeued:", value);
    return value;
  }

  peekPriority() {
    return this.values.length > 0 ? this.values[0].priority : Infinity;
  }

  getAllWithPriority(priority) {
    return this.values
      .filter((entry) => entry.priority === priority)
      .map((entry) => Number(entry.element));
  }

  remove(element) {
    this.values = this.values.filter((e) => e.element !== element);
    console.log("[MinPriorityQueue] Removed:", element);
  }

  isEmpty() {
    return this.values.length === 0;
  }

  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }
}
