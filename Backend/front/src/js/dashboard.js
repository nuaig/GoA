// DOM Elements
const dashTitle = document.querySelector(".dash-title");
const dashCards = document.querySelector(".overview-section");
const charts = document.querySelector(".charts-section");
const usersDataSection = document.querySelector(".users-section");
const indiUserDataSection = document.querySelector(".indi-user-charts-section");
const indiUserTitle = document.querySelector(".indi-title");

const homeLink = document.getElementById("home-link");
const chartsLink = document.getElementById("charts-link");
const usersLink = document.getElementById("users-link");

const search = document.querySelector(".input-group input"),
  table_headings = document.querySelectorAll("thead th");
let table_rows = document.querySelectorAll("tbody tr");
// Function to switch views
function showHome() {
  dashTitle.textContent = "Overview";
  dashCards.style.display = "grid"; // Show dash-cards
  charts.style.display = "none"; // Hide charts
  usersDataSection.style.display = "none";
  indiUserDataSection.style.display = "none";
}

function showCharts() {
  dashTitle.textContent = "Data Visualizations";
  dashCards.style.display = "none"; // Hide dash-cards
  charts.style.display = "grid"; // Show charts
  usersDataSection.style.display = "none";
  indiUserDataSection.style.display = "none";
}

function showUsersData() {
  dashCards.style.display = "none"; // Hide dash-cards
  charts.style.display = "none"; // Show charts
  usersDataSection.style.display = "grid";
  indiUserDataSection.style.display = "none";
}

// Event Listeners
homeLink.addEventListener("click", (e) => {
  e.preventDefault();
  showHome();
});

chartsLink.addEventListener("click", (e) => {
  e.preventDefault();
  showCharts();
});

usersLink.addEventListener("click", (e) => {
  e.preventDefault();
  showUsersData();
});

// Global variables to store fetched data
let completionData = {};
let avgMistakesData = {};
let scoreAnalysisData = {};
let completionTimeData = {};
let avgMistakeReduction = {};

// Fetch Data
async function fetchGameData() {
  try {
    const response = await fetch("/api/gameDataViz");
    const data = await response.json();
    if (data.ok) {
      const gameData = data.data; // Store fetched data
      console.log("Fetched Game Data:", gameData);

      // Destructure fetched data
      ({
        completionData,
        avgMistakesData,
        scoreAnalysisData,
        completionTimeData,
        avgMistakeReduction,
      } = gameData);
      console.log("scoreDistributionData", scoreAnalysisData);
      console.log("Data Loaded Successfully!");

      // **Initialize all charts after data is fetched**
      renderCharts();
    } else {
      throw new Error("Failed to fetch game data visualization");
    }
  } catch (error) {
    console.error("Error fetching game data visualization:", error);
  }
}

// Set default view to Home
showHome();

// Default selected game and level
let selectedGame = "all";
let selectedLevel = "allLevels";

// **Get chart data based on selected game and level**
function getChartData(game, level) {
  return completionData[game]?.[level] || { success: 0, failure: 0 };
}

// **Initialize & Render Charts**
function renderCharts() {
  console.log("Rendering Charts...");

  renderCompletionChart();
  renderAverageMistakesChart(selectedGame);
  renderOverallScoreChart(selectedGame);
  renderCompletionTimeChart(selectedGame);
  renderMistakeReductionChart(selectedGame);
}

// **Completion Rate Chart**
let completionChart = null;
function renderCompletionChart() {
  const initialData = getChartData(selectedGame, selectedLevel);

  const chartOptions = {
    series: [initialData.success, initialData.failure],
    chart: {
      type: "pie",
      height: 380,
    },
    labels: ["Success", "Failure"],
    colors: ["#28a745", "#dc3545"],
    title: {
      text: `Completion Rate: ${capitalize(selectedGame)} - All Levels`,
      align: "center",
    },
    legend: {
      position: "bottom",
    },
  };

  if (completionChart) {
    completionChart.updateOptions(chartOptions);
  } else {
    completionChart = new ApexCharts(
      document.querySelector("#completion-chart"),
      chartOptions
    );
    completionChart.render();
  }
}

// **Average Mistakes per Level Chart**
let averageMistakesChart = null;
function renderAverageMistakesChart(game) {
  const data = avgMistakesData[game] || { 1: 0, 2: 0, 3: 0 };

  const chartOptions = {
    series: [{ name: "Average Mistakes", data: [data[1], data[2], data[3]] }],
    chart: {
      type: "bar",
      height: 380,
    },
    xaxis: {
      categories: ["Level 1", "Level 2", "Level 3"],
    },
    title: {
      text: `Average Mistakes per Level: ${capitalize(game)}`,
      align: "center",
    },
  };

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
let example_score = {
  all: {
    1: [6, 9, 69, 0, 0],
    2: [7, 3, 16, 39, 0],
    3: [3, 3, 2, 25, 38],
    allLevels: [16, 15, 87, 64, 38],
  },
  heapsort: {
    1: [1, 2, 12, 0, 0],
    2: [6, 0, 5, 4, 0],
    3: [0, 0, 0, 4, 2],
    allLevels: [7, 2, 17, 8, 2],
  },
  kruskal: {
    1: [5, 6, 37, 0, 0],
    2: [1, 1, 8, 22, 0],
    3: [1, 3, 1, 17, 26],
    allLevels: [7, 10, 46, 39, 26],
  },
  prim: {
    1: [0, 1, 20, 0, 0],
    2: [0, 2, 3, 13, 0],
    3: [2, 0, 1, 4, 10],
    allLevels: [2, 3, 24, 17, 10],
  },
  dijkstra: {
    1: [0, 1, 20, 0, 0],
    2: [0, 2, 3, 13, 0],
    3: [2, 0, 1, 4, 10],
    allLevels: [2, 3, 24, 17, 10],
  },
};
let scoreAnalysisChart = null;
function renderOverallScoreChart(selectedGame) {
  selectedGame = selectedGame.charAt(0).toUpperCase() + selectedGame.slice(1);
  if (
    !scoreAnalysisData[selectedGame] ||
    Object.keys(scoreAnalysisData[selectedGame]).length === 0
  ) {
    console.warn(`⚠️ No Score Data Available for ${selectedGame}`);
    scoreAnalysisData[selectedGame] = {
      1: { worst: 0, best: 0, mean: 0, median: 0 },
      2: { worst: 0, best: 0, mean: 0, median: 0 },
      3: { worst: 0, best: 0, mean: 0, median: 0 },
    };
  }

  const levels = ["1", "2", "3"];
  const gameData = scoreAnalysisData[selectedGame];

  const worst = levels.map((lvl) => gameData[lvl]?.worst ?? 0);
  const best = levels.map((lvl) => gameData[lvl]?.best ?? 0);
  const mean = levels.map((lvl) => gameData[lvl]?.mean ?? 0);
  const median = levels.map((lvl) => gameData[lvl]?.median ?? 0);

  const chartOptions = {
    chart: { type: "bar", height: 400 },
    series: [
      { name: "Worst", data: worst },
      { name: "Best", data: best },
      { name: "Mean", data: mean },
      { name: "Median", data: median },
    ],
    xaxis: {
      categories: ["Level 1", "Level 2", "Level 3"],
      title: { text: "Levels" },
    },
    yaxis: {
      title: { text: "Scores" },
      min: 0,
      max: 100,
    },
    colors: ["#8e44ad", "#0c8599", "#d35400", "#868e96"],
    dataLabels: {
      enabled: true,
      // style: {
      //   colors: ["#000"], // This sets the label text color to black
      // },
    },
    plotOptions: {
      bar: { columnWidth: "50%", grouped: true },
    },
    title: {
      text: `${selectedGame} Score Summary Across All Users`,
      align: "center",
    },
  };
  if (scoreAnalysisChart) {
    scoreAnalysisChart.updateOptions(chartOptions);
  } else {
    scoreAnalysisChart = new ApexCharts(
      document.querySelector("#score-distribution-chart"),
      chartOptions
    );
    scoreAnalysisChart.render();
  }
}
// **Score Distribution Chart**
// let scoreDistributionChart = null;
// function renderS(game, level) {
//   const scores = scoreAnalysisData[game]?.[level] || [0, 0, 0, 0, 0];

//   const chartOptions = {
//     series: [{ name: "Score Buckets", data: scores }],
//     chart: { type: "bar", height: 380 },
//     xaxis: {
//       categories: ["0-20", "21-40", "41-60", "61-80", "81-100"],
//     },
//     title: {
//       text: `Score Distribution: ${capitalize(game)} - ${
//         level === "allLevels" ? "All Levels" : `Level ${level}`
//       }`,
//       align: "center",
//     },
//   };

//   if (scoreDistributionChart) {
//     scoreDistributionChart.updateOptions(chartOptions);
//   } else {
//     scoreDistributionChart = new ApexCharts(
//       document.querySelector("#score-distribution-chart"),
//       chartOptions
//     );
//     scoreDistributionChart.render();
//   }
// }

// **Completion Time Chart**
let completionTimeChart = null;
function renderCompletionTimeChart(game) {
  const times = completionTimeData[game] || [0, 0, 0];

  const chartOptions = {
    series: [{ name: "Completion Time", data: times }],
    chart: { type: "bar", height: 380 },
    xaxis: { categories: ["Level 1", "Level 2", "Level 3"] },
    title: {
      text: `Completion Time: ${capitalize(game)}`,
      align: "center",
    },
  };

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

// **Mistake Reduction Chart**
let mistakeReductionChart = null;
function renderMistakeReductionChart(game) {
  const chartContainer = document.getElementById(
    "mistake-reduction-chart"
  ).parentElement;

  // 🚫 If "all" is selected, hide the chart and exit the function
  if (game === "all") {
    chartContainer.style.display = "none";
    console.log("Hiding Mistake Reduction Chart for 'All'");
    return;
  }

  // ✅ Otherwise, show the chart container
  chartContainer.style.display = "block";

  const gameData = avgMistakeReduction[game] || { 1: [], 2: [], 3: [] };

  const seriesData = Object.keys(gameData).map((level) => ({
    name: `Level ${level}`,
    data: gameData[level],
  }));

  const chartOptions = {
    series: seriesData,
    chart: { type: "line", height: 380 },
    xaxis: {
      categories: ["Trial 1", "Trial 2", "Trial 3", "Trial 4", "Trial 5"],
    },
    title: { text: `Mistake Reduction: ${capitalize(game)}`, align: "center" },
  };

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

// **Event Listener for Game Selection**
document.getElementById("chart-filter").addEventListener("change", (event) => {
  selectedGame = event.target.value;
  selectedLevel = "allLevels";

  renderCompletionChart();
  renderOverallScoreChart(selectedGame);
  renderAverageMistakesChart(selectedGame);
  renderCompletionTimeChart(selectedGame);
  renderMistakeReductionChart(selectedGame);
});

// **Utility function for capitalization**
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Fetch Data & Render Charts when the page loads
fetchGameData();

// 1. Searching for specific data of HTML table
search.addEventListener("input", searchTable);

function searchTable() {
  console.log("searching");
  table_rows.forEach((row, i) => {
    let table_data = row.textContent.toLowerCase(),
      search_data = search.value.toLowerCase();

    row.classList.toggle("hide", table_data.indexOf(search_data) < 0);
    row.style.setProperty("--delay", i / 25 + "s");
  });

  document.querySelectorAll("tbody tr:not(.hide)").forEach((visible_row, i) => {
    visible_row.style.backgroundColor =
      i % 2 == 0 ? "transparent" : "#0000000b";
  });
}

// 2. Sorting | Ordering data of HTML table

table_headings.forEach((head, i) => {
  let sort_asc = true;
  head.onclick = () => {
    table_headings.forEach((head) => head.classList.remove("active"));
    head.classList.add("active");

    document
      .querySelectorAll("td")
      .forEach((td) => td.classList.remove("active"));
    table_rows.forEach((row) => {
      row.querySelectorAll("td")[i].classList.add("active");
    });

    head.classList.toggle("asc", sort_asc);
    sort_asc = head.classList.contains("asc") ? false : true;

    sortTable(i, sort_asc);
  };
});

function sortTable(column, sort_asc) {
  [...table_rows]
    .sort((a, b) => {
      let first_cell = a.querySelectorAll("td")[column].textContent.trim();
      let second_cell = b.querySelectorAll("td")[column].textContent.trim();

      // 🔹 Convert to numbers if possible
      let first_value = isNaN(first_cell)
        ? first_cell.toLowerCase()
        : parseFloat(first_cell);
      let second_value = isNaN(second_cell)
        ? second_cell.toLowerCase()
        : parseFloat(second_cell);

      return sort_asc
        ? first_value > second_value
          ? 1
          : -1
        : first_value < second_value
        ? 1
        : -1;
    })
    .forEach((sorted_row) =>
      document.querySelector("tbody").appendChild(sorted_row)
    );
}

async function fetchUsersData() {
  try {
    const response = await fetch("/api/status/usersData"); // Adjust based on your API URL
    const data = await response.json();

    if (data.ok) {
      console.log("Fetched Users Data:", data.usersData);
      return data.usersData; // Return the data
    } else {
      throw new Error("Failed to fetch user progress data");
    }
  } catch (error) {
    console.error("Error fetching user progress data:", error);
    return [];
  }
}

async function renderUsersTable() {
  const usersData = await fetchUsersData(); // Fetch data from API
  const tableBody = document.querySelector("table tbody"); // Select the table body

  tableBody.innerHTML = ""; // Clear previous rows

  usersData.forEach((user) => {
    const statusClass = user.status === "Completed" ? "completed" : "onGoing";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.username}</td>
      <td><p class="status ${statusClass}">${user.status}</p></td>
      <td><strong>${user.total_score}</strong></td>
    `;

    // 🛠️ Click event to fetch individual user data & update UI
    row.addEventListener("click", async () => {
      indiUserTitle.textContent = `${capitalize(user.username)}'s Data`;
      usersDataSection.style.display = "none";
      indiUserDataSection.style.display = "grid";

      console.log(`Fetching data for User ID: ${user.user_id}`);
      await fetchIndiUserVizData(user.user_id); // Fetch and update charts dynamically
    });

    tableBody.appendChild(row); // Append row to the table
  });

  // 🛠️ **Reinitialize table_rows after updating the table**
  table_rows = document.querySelectorAll("tbody tr");

  // ✅ Apply search functionality
  search.addEventListener("input", searchTable);

  // ✅ Apply sorting functionality
  table_headings.forEach((head, i) => {
    let sort_asc = true;
    head.onclick = () => {
      table_headings.forEach((head) => head.classList.remove("active"));
      head.classList.add("active");

      document
        .querySelectorAll("td")
        .forEach((td) => td.classList.remove("active"));
      table_rows.forEach((row) => {
        row.querySelectorAll("td")[i].classList.add("active");
      });

      head.classList.toggle("asc", sort_asc);
      sort_asc = head.classList.contains("asc") ? false : true;

      sortTable(i, sort_asc);
    };
  });
}
renderUsersTable();
let indiUserData;
async function fetchIndiUserVizData(userId) {
  try {
    const response = await fetch(`/api/gameDataViz/user/${userId}`);
    const data = await response.json();

    if (data.ok) {
      console.log("✅ Fetched Individual User Data:", data.data);
      indiUserData = data.data;
      updateIndiUserCharts(indiUserData); // Call function to update charts
    } else {
      throw new Error("Failed to fetch individual user data");
    }
  } catch (error) {
    console.error("❌ Error fetching individual user data:", error);
  }
}

function updateIndiUserCharts(userData) {
  console.log("📊 Updating Charts for User Data:", userData);
  console.log(userData.mistakeData);
  renderIndiUserMistakesChart(userData.mistakeData);
  renderIndiUserScoreChart(userData.scoreData);
  renderIndiUserTrialsChart(userData.trialsData);
  renderIndiUserCompletionChart(userData.completionPercentageData);
  renderIndiUserCompletionTimeChart(userData.completionTimeData);
  renderIndiUserMistakeReductionChart(userData.mistakeReductionData);
}

// Default selections
let selectedGame_User = "kruskal"; // Default game
let selectedType = "first"; // Default mistake type

// **Event Listener for Game Selection**
document
  .getElementById("user-chart-filter")
  .addEventListener("change", (event) => {
    selectedGame_User = event.target.value; // Update selected game
    console.log("selectedGame_user", selectedGame_User);
    updateIndiUserCharts(indiUserData);
  });

// **Function to Render the Mistakes Chart**
function renderIndiUserMistakesChart(mistakeData) {
  if (
    !mistakeData[selectedGame_User] ||
    Object.keys(mistakeData[selectedGame_User]).length === 0
  ) {
    console.warn(`⚠️ No Mistake Data Available for ${selectedGame_User}`);
    mistakeData[selectedGame_User] = { first: { 1: 0, 2: 0, 3: 0 } };
  }

  const data = Object.values(
    mistakeData[selectedGame_User][selectedType] || { 1: 0, 2: 0, 3: 0 }
  );

  const chartOptions = {
    series: [{ name: "Mistakes", data: data }],
    chart: { type: "bar", height: 380 },
    xaxis: {
      categories: ["Level 1", "Level 2", "Level 3"],
      title: { text: "Levels" },
    },
    yaxis: {
      title: { text: "Number of Mistakes" },
      min: 0,
      forceNiceScale: true,
    },
    colors: ["#ff6f61"],
    dataLabels: { enabled: true },
    title: {
      text: `${capitalize(selectedGame_User)} (${capitalize(selectedType)})`,
      align: "center",
    },
  };

  if (window.mistakesChart) {
    window.mistakesChart.updateOptions(chartOptions);
  } else {
    window.mistakesChart = new ApexCharts(
      document.querySelector("#mistakes-per-level-chart"),
      chartOptions
    );
    window.mistakesChart.render();
  }
}
function renderIndiUserScoreChart(scoreData) {
  if (
    !scoreData[selectedGame_User] ||
    Object.keys(scoreData[selectedGame_User]).length === 0
  ) {
    console.warn(`⚠️ No Score Data Available for ${selectedGame_User}`);
    scoreData[selectedGame_User] = {
      first: { 1: 0, 2: 0, 3: 0 },
      last: { 1: 0, 2: 0, 3: 0 },
      average: { 1: 0, 2: 0, 3: 0 },
      best: { 1: 0, 2: 0, 3: 0 },
    };
  }
  console.log(scoreData);
  const data = scoreData[selectedGame_User];
  console.log(data);
  const chartOptions = {
    chart: { type: "bar", height: 400 },
    series: [
      { name: "First Attempt", data: Object.values(data.first) },
      { name: "Last Attempt", data: Object.values(data.last) },
      { name: "Average", data: Object.values(data.average) },
      { name: "Best Attempt", data: Object.values(data.best) },
    ],
    xaxis: {
      categories: ["Level 1", "Level 2", "Level 3"], // Levels as X-axis labels
      title: { text: "Levels" },
    },
    yaxis: {
      title: { text: "Scores" },
      min: 0,
    },
    colors: ["#FF5733", "#33FF57", "#337BFF", "#FFD700"],
    dataLabels: {
      enabled: true,
      style: {
        colors: ["#000"], // This sets the label text color to black
      },
    },
    plotOptions: {
      bar: { columnWidth: "50%", grouped: true }, // Ensure proper grouping
    },
    title: {
      text: `${capitalize(selectedGame_User)}`,
      align: "center",
    },
  };

  // If chart exists, update it; otherwise, create a new one
  if (window.scoreChart) {
    window.scoreChart.updateOptions(chartOptions);
  } else {
    window.scoreChart = new ApexCharts(
      document.querySelector("#score-chart"),
      chartOptions
    );
    window.scoreChart.render();
  }
}

// Function to render trials chart
function renderIndiUserTrialsChart(trialsData) {
  if (
    !trialsData[selectedGame_User] ||
    Object.keys(trialsData[selectedGame_User]).length === 0
  ) {
    console.warn(`⚠️ No Trials Data Available for ${selectedGame_User}`);
    trialsData[selectedGame_User] = {
      1: { success: 0, failure: 0 },
      2: { success: 0, failure: 0 },
      3: { success: 0, failure: 0 },
    };
  }
  const data = trialsData[selectedGame_User];

  const levels = Object.keys(data);
  const successData = levels.map((level) => data[level].success);
  const failureData = levels.map((level) => data[level].failure);

  const chartOptions = {
    series: [
      { name: "Success", data: successData },
      { name: "Failure", data: failureData },
    ],
    chart: { type: "bar", height: 380, stacked: true },
    xaxis: {
      categories: levels.map((level) => `Level ${level}`),
      title: { text: "Levels" },
    },
    yaxis: { title: { text: "Number of Trials" }, min: 0 },
    colors: ["#4CAF50", "#FF5733"], // Green for success, red for failure
    dataLabels: { enabled: true },
    title: {
      text: `${capitalize(selectedGame_User)}`,
      align: "center",
    },
  };

  // If chart exists, update it; otherwise, create a new one
  if (window.trialsChart) {
    window.trialsChart.updateOptions(chartOptions);
  } else {
    window.trialsChart = new ApexCharts(
      document.querySelector("#trials-chart"),
      chartOptions
    );
    window.trialsChart.render();
  }
}

// Function to render radial bar chart
function renderIndiUserCompletionChart(completionPercentageData) {
  const percentage = completionPercentageData[selectedGame_User] || 0;

  const chartOptions = {
    series: [percentage],
    chart: {
      type: "radialBar",
      height: 380,
    },
    plotOptions: {
      radialBar: {
        hollow: { size: "70%" },
        dataLabels: {
          name: { show: false },
          value: { fontSize: "22px", fontWeight: "bold", color: "#333" },
        },
      },
    },
    colors: ["#3498db"], // Blue color for completion
    title: {
      text: `${capitalize(selectedGame_User)}`,
      align: "center",
    },
  };

  // If chart exists, update it; otherwise, create a new one
  if (window.completionChart) {
    window.completionChart.updateOptions(chartOptions);
  } else {
    window.completionChart = new ApexCharts(
      document.querySelector("#completion-chart-user"),
      chartOptions
    );
    window.completionChart.render();
  }
}

function renderIndiUserCompletionTimeChart(completionTimeTakenData) {
  if (
    !completionTimeTakenData[selectedGame_User] ||
    Object.keys(completionTimeTakenData[selectedGame_User]).length === 0
  ) {
    console.warn(
      `⚠️ No Completion Time Data Available for ${selectedGame_User}`
    );
    completionTimeTakenData[selectedGame_User] = {
      first: { 1: 0, 2: 0, 3: 0 },
      last: { 1: 0, 2: 0, 3: 0 },
      average: { 1: 0, 2: 0, 3: 0 },
      best: { 1: 0, 2: 0, 3: 0 },
    };
  }
  const gameData = completionTimeTakenData[selectedGame_User];

  const categories = ["Level 1", "Level 2", "Level 3"];

  const series = [
    {
      name: "First Attempt",
      data: Object.values(gameData.first),
    },
    {
      name: "Last Attempt",
      data: Object.values(gameData.last),
    },
    {
      name: "Average",
      data: Object.values(gameData.average),
    },
    {
      name: "Best Attempt",
      data: Object.values(gameData.best),
    },
  ];

  const options = {
    series: series,
    chart: {
      type: "line",
      height: 380,
      toolbar: {
        show: true,
      },
    },
    stroke: {
      width: [2, 3, 4, 2],
      dashArray: [0, 0, 5, 2],
      curve: "smooth",
    },
    dataLabels: {
      enabled: true,
    },
    tooltip: {
      followCursor: true,
      intersect: false,
      shared: true,
    },
    markers: {
      size: 5,
    },
    xaxis: {
      categories: categories,
      title: { text: "Levels" },
    },
    yaxis: {
      title: { text: "Completion Time (seconds)" },
      min: 0,
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
    },
    title: {
      text: `${capitalize(selectedGame_User)}`,
      align: "center",
    },
  };

  // Check if chart already exists, update instead of re-rendering
  if (window.completionTimeChart) {
    window.completionTimeChart.updateOptions(options);
  } else {
    window.completionTimeChart = new ApexCharts(
      document.querySelector("#completion-time-chart-user"),
      options
    );
    window.completionTimeChart.render();
  }
}

function renderIndiUserMistakeReductionChart(mistakeReductionUserData) {
  const gameData = mistakeReductionUserData[selectedGame_User] || {
    1: [],
    2: [],
    3: [],
  };

  // 🔹 Find the longest array length
  const maxTrials = Math.max(
    ...Object.values(gameData).map((arr) => arr.length),
    1
  );

  // 🔹 Generate dynamic trial labels (e.g., Trial 1, Trial 2, ..., Trial maxTrials)
  const trialLabels = Array.from(
    { length: maxTrials },
    (_, i) => `Trial ${i + 1}`
  );

  const seriesData = Object.keys(gameData).map((level) => ({
    name: `Level ${level}`,
    data: gameData[level], // Mistakes per trial
  }));

  const options = {
    series: seriesData,
    chart: {
      type: "line",
      height: 380,
      toolbar: {
        show: true,
      },
    },
    stroke: {
      width: [3, 3, 3], // 🔹 All solid lines
      dashArray: [0, 0, 0], // 🔹 No dashed lines
      curve: "smooth", // 🔹 Smooth curve effect
    },
    dataLabels: {
      enabled: true,
    },
    tooltip: {
      followCursor: true,
      intersect: false,
      shared: true,
    },
    markers: {
      size: 5,
    },
    xaxis: {
      categories: trialLabels, // 🔹 Dynamic categories based on longest sequence
      title: { text: "Trials" },
    },
    yaxis: {
      title: { text: "Number of Mistakes" },
      min: 0,
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
    },
    title: {
      text: `${capitalize(selectedGame_User)}`,
      align: "center",
    },
  };

  // If chart already exists, update instead of re-rendering
  if (window.mistakeReductionChartUser) {
    window.mistakeReductionChartUser.updateOptions(options);
  } else {
    window.mistakeReductionChartUser = new ApexCharts(
      document.querySelector("#mistake-reduction-chart-user"),
      options
    );
    window.mistakeReductionChartUser.render();
  }
}

// **Toggle Button Event Listener for Mistake Type Selection**
document.querySelectorAll(".toggle-btn").forEach((button) => {
  button.addEventListener("click", () => {
    selectedType = button.getAttribute("data-type"); // Update selected mistake type

    // Update active button style
    document
      .querySelectorAll(".toggle-btn")
      .forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Update Chart
    renderIndiUserMistakesChart(indiUserData.mistakeData);
  });
});

document.querySelector(".back-to-table").addEventListener("click", () => {
  usersDataSection.style.display = "grid";
  indiUserDataSection.style.display = "none";
});
