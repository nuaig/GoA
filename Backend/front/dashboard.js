// DOM Elements
const dashTitle = document.querySelector(".dash-title");
const dashCards = document.querySelector(".overview-section");
const charts = document.querySelector(".charts-section");

const homeLink = document.getElementById("home-link");
const chartsLink = document.getElementById("charts-link");

// const

// Function to switch views
function showHome() {
  dashTitle.textContent = "Overview";
  dashCards.style.display = "grid"; // Show dash-cards
  charts.style.display = "none"; // Hide charts
}

function showCharts() {
  dashTitle.textContent = "Data Visualizations";
  dashCards.style.display = "none"; // Hide dash-cards
  charts.style.display = "grid"; // Show charts
}

// Event Listeners
homeLink.addEventListener("click", (e) => {
  e.preventDefault(); // Prevent default link behavior
  showHome();
});

chartsLink.addEventListener("click", (e) => {
  e.preventDefault(); // Prevent default link behavior
  showCharts();
});

// Set default view to Home
showHome();

const completionData = {
  all: {
    allLevels: { success: 75, failure: 25 },
    1: { success: 80, failure: 20 },
    2: { success: 70, failure: 30 },
    3: { success: 65, failure: 35 },
  },
  prim: {
    allLevels: { success: 78, failure: 22 },
    1: { success: 85, failure: 15 },
    2: { success: 75, failure: 25 },
    3: { success: 60, failure: 40 },
  },
  kruskal: {
    allLevels: { success: 82, failure: 18 },
    1: { success: 90, failure: 10 },
    2: { success: 80, failure: 20 },
    3: { success: 76, failure: 24 },
  },
  heapsort: {
    allLevels: { success: 70, failure: 30 },
    1: { success: 78, failure: 22 },
    2: { success: 68, failure: 32 },
    3: { success: 65, failure: 35 },
  },
};

const averageMistakesData = {
  all: {
    1: 3.5,
    2: 2.8,
    3: 4.0,
  },
  prim: {
    1: 3.2,
    2: 2.5,
    3: 4.5,
  },
  kruskal: {
    1: 3.8,
    2: 3.0,
    3: 4.2,
  },
  heapsort: {
    1: 3.0,
    2: 2.7,
    3: 3.8,
  },
};

const scoreDistributionData = {
  all: {
    allLevels: [5, 15, 25, 35, 20], // Representing score buckets for all levels
    1: [10, 20, 30, 25, 15],
    2: [15, 25, 35, 20, 5],
    3: [20, 30, 25, 15, 10],
  },
  prim: {
    allLevels: [8, 18, 28, 30, 16],
    1: [12, 22, 32, 24, 10],
    2: [18, 26, 30, 20, 6],
    3: [22, 28, 20, 16, 14],
  },
  kruskal: {
    allLevels: [10, 15, 30, 30, 15],
    1: [15, 25, 35, 20, 5],
    2: [20, 30, 25, 15, 10],
    3: [10, 20, 30, 25, 15],
  },
  heapsort: {
    allLevels: [12, 18, 28, 26, 16],
    1: [10, 18, 30, 22, 20],
    2: [14, 24, 28, 26, 8],
    3: [12, 20, 28, 18, 22],
  },
};

const completionTimeData = {
  all: [45, 50, 55], // Average times for Level 1, Level 2, Level 3 across all games
  prim: [35, 45, 60],
  kruskal: [50, 55, 60],
  heapsort: [40, 50, 70],
};

const mistakeReductionData = {
  all: {
    1: [10, 8, 6, 5, 3], // Level 1
    2: [12, 9, 7, 6, 4], // Level 2
    3: [15, 12, 9, 7, 5], // Level 3
  },
  prim: {
    1: [12, 10, 8, 6, 4],
    2: [14, 12, 9, 7, 5],
    3: [16, 13, 10, 8, 6],
  },
  kruskal: {
    1: [15, 12, 10, 8, 5],
    2: [17, 14, 11, 9, 6],
    3: [18, 15, 12, 10, 7],
  },
  heapsort: {
    1: [8, 7, 6, 5, 3],
    2: [9, 8, 7, 6, 4],
    3: [10, 9, 8, 7, 5],
  },
};

// Initial selected game and level
let selectedGame = "all";
let selectedLevel = "allLevels";

// Function to get chart data based on selected game and level
function getChartData(game, level) {
  return completionData[game][level];
}

// Get initial data for the chart
const initialData = getChartData(selectedGame, selectedLevel);

// Function to render the chart
function renderCompletionChart() {
  const chartOptions = {
    series: [initialData.success, initialData.failure],
    chart: {
      type: "pie",
      height: 380,
      toolbar: {
        show: true,
        tools: {
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
          customIcons: [
            {
              icon: `<span class="custom-icon">Level</span>`,
              title: "Select Level",
              class: "custom-toolbar-icon",
              click: () => {
                // Define level options and determine the next level
                const levelOptions = ["allLevels", "1", "2", "3"];
                const currentLevelIndex = levelOptions.indexOf(selectedLevel);
                const nextLevel =
                  levelOptions[(currentLevelIndex + 1) % levelOptions.length];

                // Update the selected level
                selectedLevel = nextLevel;

                // Get updated data based on selected game and level
                const updatedData = getChartData(selectedGame, selectedLevel);

                // Update the chart with new data
                completionChart.updateOptions({
                  title: {
                    text: ` Level ${
                      nextLevel === "allLevels" ? "All" : nextLevel
                    }`,
                  },
                });
                completionChart.updateSeries([
                  updatedData.success,
                  updatedData.failure,
                ]);
              },
            },
          ],
        },
      },
    },
    labels: ["Success", "Failure"],
    colors: ["#28a745", "#dc3545"],
    title: {
      text: `All Levels`,
      align: "center",
    },
    legend: {
      position: "bottom",
    },
  };

  completionChart = new ApexCharts(
    document.querySelector("#completion-chart"),
    chartOptions
  );
  completionChart.render();
}

// Utility function for capitalization
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize the chart
let completionChart = null;
renderCompletionChart();

let averageMistakesChart = null;

function renderAverageMistakesChart(game) {
  // Get the data for the selected game
  const data = averageMistakesData[game];

  const chartOptions = {
    series: [
      {
        name: "Average Mistakes",
        data: [data[1], data[2], data[3]], // Data for levels 1, 2, and 3
      },
    ],
    chart: {
      type: "bar",
      height: 380,
    },
    xaxis: {
      categories: ["Level 1", "Level 2", "Level 3"],
      title: {
        text: "Levels",
      },
    },
    yaxis: {
      title: {
        text: "Average Mistakes",
      },
    },
    colors: ["#f39c12"],
    dataLabels: {
      enabled: true,
    },
    title: {
      text: `Average Mistakes per Level: ${capitalize(game)}`,
      align: "center",
    },
  };

  // If chart already exists, update it; otherwise, create it
  if (averageMistakesChart) {
    averageMistakesChart.updateOptions(chartOptions);
  } else {
    averageMistakesChart = new ApexCharts(
      document.querySelector("#average-mistakes-chart"),
      chartOptions
    );
    averageMistakesChart.render();
  }
}
// Initialize the "Average Mistakes per Level" chart
renderAverageMistakesChart(selectedGame);

let scoreDistributionChart = null;

function renderScoreDistributionChart(game, level) {
  // Get the score distribution data for the selected game and level
  const scores = scoreDistributionData[game][level];

  const chartOptions = {
    series: [
      {
        name: "Score Buckets",
        data: scores, // Array of scores for the level
      },
    ],
    chart: {
      type: "bar",
      height: 380,
      toolbar: {
        show: true,
        tools: {
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
          customIcons: [
            {
              icon: `<span class="custom-icon">Level</span>`,
              title: "Select Level",
              class: "custom-toolbar-icon",
              click: () => {
                // Define level options and determine the next level
                const levelOptions = ["allLevels", "1", "2", "3"];
                const currentLevelIndex = levelOptions.indexOf(selectedLevel);
                const nextLevel =
                  levelOptions[(currentLevelIndex + 1) % levelOptions.length];

                // Update the selected level
                selectedLevel = nextLevel;

                // Get updated data based on selected game and level
                const updatedScores =
                  scoreDistributionData[selectedGame][selectedLevel];

                // Update the chart with new data
                scoreDistributionChart.updateOptions({
                  title: {
                    text: `Score Distribution: ${capitalize(
                      selectedGame
                    )} - Level ${
                      nextLevel === "allLevels" ? "All" : nextLevel
                    }`,
                  },
                });
                scoreDistributionChart.updateSeries([
                  {
                    name: "Score Buckets",
                    data: updatedScores,
                  },
                ]);
              },
            },
          ],
        },
      },
    },
    xaxis: {
      categories: ["0-20", "21-40", "41-60", "61-80", "81-100"], // Score ranges
      title: {
        text: "Score Ranges",
      },
    },
    yaxis: {
      title: {
        text: "Number of Players",
      },
    },
    colors: ["#007bff"],
    dataLabels: {
      enabled: true,
    },
    title: {
      text: `Score Distribution: ${capitalize(game)} - ${
        level === "allLevels" ? "All Levels" : `Level ${level}`
      }`,
      align: "center",
    },
  };

  // If the chart exists, update it; otherwise, render a new one
  if (scoreDistributionChart) {
    scoreDistributionChart.updateOptions(chartOptions);
  } else {
    scoreDistributionChart = new ApexCharts(
      document.querySelector("#score-distribution-chart"),
      chartOptions
    );
    scoreDistributionChart.render();
  }
}

// Initialize the "Score Distribution" chart
renderScoreDistributionChart(selectedGame, selectedLevel);

let completionTimeChart = null;

function renderCompletionTimeChart(game) {
  // Get completion time data for the selected game
  const times = completionTimeData[game];

  const chartOptions = {
    series: [
      {
        name: "Completion Time",
        data: times,
      },
    ],
    chart: {
      type: "bar",
      height: 380,
    },
    xaxis: {
      categories: ["Level 1", "Level 2", "Level 3"], // Always show all levels
      title: {
        text: "Levels",
      },
    },
    yaxis: {
      title: {
        text: "Average Time (Seconds)",
      },
    },
    colors: ["#ff9800"],
    dataLabels: {
      enabled: true,
    },
    title: {
      text: `Completion Time: ${capitalize(game)}`,
      align: "center",
    },
  };

  // If the chart exists, update it; otherwise, render a new one
  if (completionTimeChart) {
    completionTimeChart.updateOptions(chartOptions);
  } else {
    completionTimeChart = new ApexCharts(
      document.querySelector("#completion-time-chart"),
      chartOptions
    );
    completionTimeChart.render();
  }
}

// Initialize the "Level Completion Time" chart
renderCompletionTimeChart(selectedGame, selectedLevel);

let mistakeReductionChart = null;

function renderMistakeReductionChart(game) {
  // Get the data for the selected game
  const gameData = mistakeReductionData[game];

  // Prepare series data for each level
  const seriesData = Object.keys(gameData).map((level) => ({
    name: `Level ${level}`,
    data: gameData[level],
  }));

  const chartOptions = {
    series: seriesData,
    chart: {
      type: "line",
      height: 380,
    },
    xaxis: {
      categories: ["Trial 1", "Trial 2", "Trial 3", "Trial 4", "Trial 5"],
      title: {
        text: "Trials",
      },
    },
    yaxis: {
      title: {
        text: "Average Mistakes",
      },
      min: 0,
    },
    stroke: {
      curve: "smooth",
    },
    markers: {
      size: 5,
    },
    colors: ["#246dec", "#f5b74f", "#cc3c43"], // Colors for each level
    title: {
      text: `Mistake Reduction: ${capitalize(game)}`,
      align: "center",
    },
    legend: {
      position: "bottom",
    },
  };

  // Update the chart if it already exists, otherwise render a new one
  if (mistakeReductionChart) {
    mistakeReductionChart.updateOptions(chartOptions);
  } else {
    mistakeReductionChart = new ApexCharts(
      document.querySelector("#mistake-reduction-chart"),
      chartOptions
    );
    mistakeReductionChart.render();
  }
}
renderMistakeReductionChart(selectedGame);
// Add event listener for the main game dropdown
document.getElementById("chart-filter").addEventListener("change", (event) => {
  selectedGame = event.target.value; // Update the selected game
  selectedLevel = "allLevels"; // Reset level to allLevels

  // Update "Completion Rate" chart
  const data = getChartData(selectedGame, selectedLevel);
  completionChart.updateOptions({
    title: {
      text: `Completion Rate: ${capitalize(selectedGame)} - All Levels`,
    },
  });
  completionChart.updateSeries([data.success, data.failure]);

  // Update "Score Distribution" chart
  renderScoreDistributionChart(selectedGame, selectedLevel);
  renderAverageMistakesChart(selectedGame);
  // Update "Level Completion Time" chart
  renderCompletionTimeChart(selectedGame);

  renderMistakeReductionChart(selectedGame);
});
