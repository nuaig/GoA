/**
 * A* pathfinding algorithm for the game graph.
 * Produces a sequence of steps (expected nodes/edges) for the player to follow.
 * Uses a min-priority queue keyed by f(n) = g(n) + h(n).
 */

export class AstarAlgorithm {
  constructor(graph, startNode = 0) {
    this.graph = graph;
    this.startNode = startNode;

    this.goalNode =
      graph.goalNode ??
      Math.max(...Object.keys(graph.nodes || this.buildNodeSet(graph.edges)));

    this.heuristicType = graph.heuristicType ?? "zero"; // "zero" | "euclid" | "w_euclid"

    this.adjacencyList = this.buildAdjacencyList(graph.edges);

    this.steps = [];
    this.currentStepIndex = 0;

    this.gValues = {};
    this.fValues = {};
    this.previous = {};
    this.visited = new Set();
    this.priorityQueue = new MinPriorityQueue();

    this.paused = false;
    this.waitingNodes = [];

    this.resumedFromAmbiguity = false;
    this.resumedNode = null;

    this.astar(this.startNode);
  }

  /**
   * Builds a list of node ids from an edge list (all endpoints).
   * @param {Array<[number, number, number]>} edges - [from, to, weight] tuples
   * @returns {number[]}
   */
  buildNodeSet(edges) {
    const nodes = new Set();
    for (const [a, b] of edges) {
      nodes.add(a);
      nodes.add(b);
    }
    return Array.from(nodes);
  }

  /**
   * Builds an adjacency list from edges: node -> [{ node, weight }, ...].
   * @param {Array<[number, number, number]>} edges - [from, to, weight] tuples
   * @returns {Object.<number, Array<{node: number, weight: number}>>}
   */
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

  /**
   * Heuristic h(n): estimated cost from node to goal.
   * "zero" => 0 (Dijkstra-like). "euclid" / "w_euclid" use graph node positions.
   * @param {number} node
   * @returns {number}
   */
  heuristic(node) {
    if (this.heuristicType === "zero") return 0;

    const p = this.graph.nodePositions?.[Number(node)];
    const g = this.graph.nodePositions?.[Number(this.goalNode)];
    if (!p || !g) return 0;

    const dx = p.x - g.x;
    const dz = p.z - g.z;
    const euclid = Math.sqrt(dx * dx + dz * dz);

    if (this.heuristicType === "euclid") return euclid;
    if (this.heuristicType === "w_euclid") return 1.5 * euclid;
    return 0;
  }

  /**
   * Initializes g/f/previous for all nodes and starts A* from the given node.
   * @param {number} start
   */
  astar(start) {
    for (let node in this.adjacencyList) {
      this.gValues[node] = Infinity;
      this.fValues[node] = Infinity;
      this.previous[node] = null;
    }

    this.gValues[start] = 0;
    this.fValues[start] = this.heuristic(start);

    this.priorityQueue.enqueue(start, this.fValues[start]);

    this.continueAstar();
  }

  /**
   * Runs the main A* loop: dequeue smallest f(n), expand neighbors, record steps.
   * Pauses when multiple nodes tie for smallest f(n) (player must pick one).
   * Stops when the goal is reached or expanded.
   */
  continueAstar() {
    while (!this.priorityQueue.isEmpty() || this.resumedNode !== null) {
      let currentNode;

      if (this.resumedNode !== null) {
        currentNode = this.resumedNode;
        this.priorityQueue.remove(currentNode);
        this.resumedNode = null;
      } else {
        const currentPriority = this.priorityQueue.peekPriority();
        const samePriorityNodes =
          this.priorityQueue.getAllWithPriority(currentPriority);

        const unvisitedSamePriority = samePriorityNodes.filter(
          (n) => !this.visited.has(n),
        );
        if (unvisitedSamePriority.includes(Number(this.goalNode))) {
          currentNode = Number(this.goalNode);
          this.priorityQueue.remove(currentNode);
        } else {
          if (!this.resumedFromAmbiguity && unvisitedSamePriority.length > 1) {
            this.waitingNodes = [...unvisitedSamePriority];
            this.steps.push({
              expectedChests: [...unvisitedSamePriority],
              expectedEdges: null,
              errorMessage:
                "Multiple nodes have the same smallest f(n). Pick any one to continue.",
            });
            this.paused = true;
            return;
          }

          const next = this.priorityQueue.dequeue();
          if (!next) break;
          currentNode = next.element;
        }
      }

      if (this.visited.has(currentNode)) continue;

      if (Number(currentNode) === Number(this.goalNode)) {
        this.steps.push({
          expectedChests: [Number(currentNode)],
          expectedEdges: null,
          errorMessage: "Goal reached!",
        });
        return;
      }

      if (!this.resumedFromAmbiguity) {
        this.steps.push({
          expectedChests: [Number(currentNode)],
          expectedEdges: null,
          errorMessage: "Click the node with smallest f(n).",
        });
      }

      this.visited.add(currentNode);
      this.resumedFromAmbiguity = false;

      const neighbors = this.adjacencyList[currentNode] || [];
      const validEdges = [];

      for (const { node: neighbor, weight } of neighbors) {
        if (this.visited.has(neighbor)) continue;

        let tentativeG = this.gValues[currentNode] + weight;
        let tentativeF = tentativeG + this.heuristic(neighbor);

        tentativeG = Number(tentativeG.toFixed(2));
        tentativeF = Number(tentativeF.toFixed(2));

        if (tentativeG < this.gValues[neighbor]) {
          this.gValues[neighbor] = tentativeG;
          this.fValues[neighbor] = tentativeF;

          this.previous[neighbor] = Number(currentNode);

          this.priorityQueue.enqueue(neighbor, tentativeF);
        }

        validEdges.push({
          edge: [Number(currentNode), Number(neighbor)],
          weight: weight,
          newG: tentativeG,
          newF: tentativeF,
        });
      }

      if (validEdges.length > 0) {
        this.steps.push({
          expectedChests: null,
          expectedEdges: validEdges,
          errorMessage: "Select edges to update f(n) = g(n) + h(n).",
        });
      }
    }
  }

  /**
   * Resumes A* after the player chose one of the tied nodes.
   * @param {number} nodeId - The node chosen to expand next.
   */
  resumeFromNode(nodeId) {
    if (this.visited.has(nodeId)) return;

    this.paused = false;
    this.resumedFromAmbiguity = true;
    this.resumedNode = nodeId;
    this.waitingNodes = [];

    this.continueAstar();
  }

  /**
   * Returns true when all steps are done and the algorithm is not paused.
   * @returns {boolean}
   */
  isComplete() {
    return this.currentStepIndex >= this.steps.length && !this.paused;
  }

  /**
   * Returns true if (a,b) or (b,a) appears in any step's expectedEdges.
   * @param {number} a - Node id
   * @param {number} b - Node id
   * @returns {boolean}
   */
  edgeAlreadyExpected(a, b) {
    return this.steps.some((step) =>
      step.expectedEdges?.some(
        ({ edge: [x, y] }) => (x === a && y === b) || (x === b && y === a),
      ),
    );
  }

  /**
   * If the given edge matches the current step's expected edges, records it and optionally advances.
   * @param {[number, number]} edge - [from, to]
   * @returns {[number, number]} [1, weight] if valid selection, [0, 0] otherwise
   */
  selectEdge(edge) {
    const step = this.steps[this.currentStepIndex];
    if (!step || !step.expectedEdges) return [0, 0];

    const [a, b] = edge;
    const match = step.expectedEdges.find(
      ({ edge: [x, y] }) => (a === x && b === y) || (a === y && b === x),
    );

    if (match) {
      if (!step.selectedEdges) step.selectedEdges = [];

      const alreadyChosen = step.selectedEdges.some(
        ([x, y]) => (a === x && b === y) || (a === y && b === x),
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
}

/**
 * Min-heap by priority. Used for open set in A*.
 */
class MinPriorityQueue {
  constructor() {
    this.values = [];
  }

  /** Adds element with given priority and re-sorts. */
  enqueue(element, priority) {
    this.values.push({ element, priority });
    this.sort();
  }

  /** Removes and returns the element with smallest priority. */
  dequeue() {
    return this.values.shift();
  }

  /** Returns the smallest priority, or Infinity if empty. */
  peekPriority() {
    return this.values.length > 0 ? this.values[0].priority : Infinity;
  }

  /** Returns all elements that have the given priority. */
  getAllWithPriority(priority) {
    return this.values
      .filter((entry) => entry.priority === priority)
      .map((entry) => Number(entry.element));
  }

  /** Removes the first occurrence of the given element. */
  remove(element) {
    this.values = this.values.filter((e) => e.element !== element);
  }

  isEmpty() {
    return this.values.length === 0;
  }

  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }
}
