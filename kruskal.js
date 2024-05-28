class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = Array(size).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX !== rootY) {
      // Union by rank
      if (this.rank[rootX] > this.rank[rootY]) {
        this.parent[rootY] = rootX;
      } else if (this.rank[rootX] < this.rank[rootY]) {
        this.parent[rootX] = rootY;
      } else {
        this.parent[rootY] = rootX;
        this.rank[rootX]++;
      }
      return true; // Union was successful
    }
    return false; // Union was not successful, x and y are already in the same set
  }
}

export class KruskalAlgorithm {
  constructor(graph) {
    this.graph = graph;
    this.remainingEdges = [...graph.edges].sort((a, b) => a[2] - b[2]);
    this.selectedEdges = [];
    this.currentWeight = 0;
    this.uf = new UnionFind(graph.nodes.length);
  }

  // Get the initial edges with the minimum weight
  getInitialEdges() {
    if (this.remainingEdges.length === 0) {
      return [];
    }

    const minWeight = this.remainingEdges[0][2];
    return this.remainingEdges.filter((edge) => edge[2] === minWeight);
  }

  // Get the next valid edges after selecting an edge
  getNextEdges() {
    if (this.remainingEdges.length === 0) {
      return [];
    }

    const minWeight = this.remainingEdges[0][2];
    const nextEdges = this.remainingEdges.filter(
      (edge) => edge[2] === minWeight
    );

    return nextEdges.filter((edge) => {
      // Temporarily apply union to check if it forms a cycle
      const rootX = this.uf.find(edge[0]);
      const rootY = this.uf.find(edge[1]);
      return rootX !== rootY;
    });
  }

  // Select an edge and update the state
  selectEdge(edge) {
    // Check if the edge is in the next edges list and if it forms a cycle
    const nextEdges = this.getNextEdges();
    console.log(nextEdges);
    if (
      !nextEdges.some(
        (e) => e[0] === edge[0] && e[1] === edge[1] && e[2] === edge[2]
      )
    ) {
      return false; // Edge not in next edges list
    }

    if (!this.uf.union(edge[0], edge[1])) {
      return false; // Edge forms a cycle
    }

    // Successfully add the edge
    this.selectedEdges.push(edge);
    this.currentWeight += edge[2];

    // Update remaining edges
    this.remainingEdges = this.remainingEdges.filter((e) => {
      // Exclude the selected edge and any edges that would now form a cycle
      const rootX = this.uf.find(e[0]);
      const rootY = this.uf.find(e[1]);
      return (
        !(e[0] === edge[0] && e[1] === edge[1] && e[2] === edge[2]) &&
        rootX !== rootY
      );
    });
    console.log(this.remainingEdges, "remaining edges");

    return true;
  }

  // Check if the algorithm is complete
  isComplete() {
    return this.selectedEdges.length === this.graph.nodes.length - 1;
  }
}
