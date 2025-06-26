// Dummy Data (Replace this with actual user data from the backend)
const mistakeData = {
  prim: {
    first: { 1: 3, 2: 4, 3: 5 },
    last: { 1: 1, 2: 2, 3: 3 },
    average: { 1: 5, 2: 4, 3: 3 },
    best: { 1: 1, 2: 2, 3: 3 },
  },
  kruskal: {
    first: { 1: 5, 2: 8, 3: 6 },
    last: { 1: 3, 2: 6, 3: 4 },
    average: { 1: 4.5, 2: 7, 3: 5 },
    best: { 1: 2, 2: 4, 3: 3 },
  },
  heapsort: {
    first: { 1: 3.5, 2: 2.5, 3: 3.5 },
    last: { 1: 4.5, 2: 6.5, 3: 3 },
    average: { 1: 4, 2: 3, 3: 1 },
    best: { 1: 3, 2: 1, 3: 5 },
  },
  dijkstra: {
    first: { 1: 5, 2: 8, 3: 6 },
    last: { 1: 3, 2: 6, 3: 4 },
    average: { 1: 4.5, 2: 7, 3: 5 },
    best: { 1: 2, 2: 4, 3: 3 },
  },
};

const scoreData = {
  prim: {
    first: { 1: 60, 2: 50, 3: 55 }, // Score on first attempt
    last: { 1: 80, 2: 85, 3: 78 }, // Score on last attempt
    average: { 1: 70, 2: 68, 3: 72 }, // Average score over all attempts
    best: { 1: 95, 2: 90, 3: 98 }, // Best score achieved
  },
  kruskal: {
    first: { 1: 50, 2: 65, 3: 55 },
    last: { 1: 75, 2: 82, 3: 79 },
    average: { 1: 68, 2: 70, 3: 74 },
    best: { 1: 93, 2: 89, 3: 96 },
  },
  heapsort: {
    first: { 1: 55, 2: 60, 3: 58 },
    last: { 1: 78, 2: 83, 3: 80 },
    average: { 1: 65, 2: 67, 3: 70 },
    best: { 1: 92, 2: 88, 3: 97 },
  },
  dijkstra: {
    first: { 1: 55, 2: 60, 3: 58 },
    last: { 1: 78, 2: 83, 3: 80 },
    average: { 1: 65, 2: 67, 3: 70 },
    best: { 1: 92, 2: 88, 3: 97 },
  },
};

const trialsData = {
  prim: {
    1: { total: 5, success: 3, failure: 2 },
    2: { total: 5, success: 4, failure: 1 },
    3: { total: 5, success: 2, failure: 3 },
  },
  kruskal: {
    1: { total: 5, success: 2, failure: 3 },
    2: { total: 5, success: 3, failure: 2 },
    3: { total: 5, success: 4, failure: 1 },
  },
  heapsort: {
    1: { total: 5, success: 1, failure: 4 },
    2: { total: 5, success: 2, failure: 3 },
    3: { total: 5, success: 5, failure: 0 },
  },
  dijkstra: {
    1: { total: 5, success: 2, failure: 3 },
    2: { total: 5, success: 3, failure: 2 },
    3: { total: 5, success: 4, failure: 1 },
  },
};

const completionPercentageData = {
  prim: 75, // 75% completion
  kruskal: 62, // 62% completion
  heapsort: 85, // 85% completion
  dijkstra: 30, // 30% completion
};

const completionTimeTakenData = {
  prim: {
    first: { 1: 120, 2: 140, 3: 160 }, // First attempt times in seconds
    last: { 1: 90, 2: 110, 3: 130 }, // Last attempt times in seconds
    average: { 1: 100, 2: 120, 3: 140 }, // Average time over all attempts
    best: { 1: 80, 2: 95, 3: 115 }, // Best (fastest) time
  },
  kruskal: {
    first: { 1: 130, 2: 150, 3: 170 },
    last: { 1: 100, 2: 120, 3: 140 },
    average: { 1: 110, 2: 130, 3: 150 },
    best: { 1: 90, 2: 105, 3: 125 },
  },
  heapsort: {
    first: { 1: 140, 2: 160, 3: 180 },
    last: { 1: 110, 2: 130, 3: 150 },
    average: { 1: 120, 2: 140, 3: 160 },
    best: { 1: 100, 2: 115, 3: 135 },
  },
  dijkstra: {
    first: { 1: 140, 2: 160, 3: 180 },
    last: { 1: 110, 2: 130, 3: 150 },
    average: { 1: 120, 2: 140, 3: 160 },
    best: { 1: 100, 2: 115, 3: 135 },
  },
};

const mistakeReductionUserData = {
  prim: {
    1: [5, 4, 3, 2, 1], // Level 1 trials
    2: [6, 5, 4], // Level 2 trials (shorter)
    3: [8, 6, 5, 4, 3, 2], // Level 3 trials (longer)
  },
  kruskal: {
    1: [4, 3, 2, 1],
    2: [5, 4, 3, 2],
    3: [7, 6, 5, 4, 3],
  },
  heapsort: {
    1: [3, 2, 1],
    2: [6, 5, 4, 3, 2, 1],
    3: [4, 3, 2],
  },
  dijkstra: {
    1: [4, 3, 2, 1],
    2: [5, 4, 3, 2],
    3: [7, 6, 5, 4, 3],
  },
};
