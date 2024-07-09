const uiText = document.getElementById("UI-Text");
export function toggleInstructions(currentAlgorithm) {
  const kruskalInstructions = document.querySelector(".kruskal-instruction");
  const primInstructions = document.querySelector(".prim-instruction");

  if (currentAlgorithm === "kruskal") {
    kruskalInstructions.classList.toggle("hidden");
    primInstructions.classList.add("hidden");
  } else if (currentAlgorithm === "prim") {
    primInstructions.classList.toggle("hidden");
    kruskalInstructions.classList.add("hidden");
  }
}

export function closePseudocode() {
  const kruskalInstructions = document.querySelector(".kruskal-instruction");
  const primInstructions = document.querySelector(".prim-instruction");
  primInstructions.classList.add("hidden");
  kruskalInstructions.classList.add("hidden");
}

export function updateHealth(health) {
  const healthIcons = document.querySelectorAll(".health-icon");
  console.log(health);
  if (health >= 0 && health <= 4) {
    healthIcons[health].style.fill = "white";
    health--;
    console.log(health);
  } else {
    uiText.innerHTML = `Game Over. Better luck next time!`;
  }
  return health;
}

export function resetHealth() {
  let health = 4;
  const healthIcons = document.querySelectorAll(".health-icon");
  for (let i = 0; i <= health; i++) {
    healthIcons[i].style.fill = "red";
  }
  return health;
}

export function setStars(health) {
  const stars = document.querySelectorAll(".star path:last-child");
  let numStars;
  if (health === 4) {
    numStars = 2;
  } else if (health >= 2 && health < 4) {
    // Updated the condition to prevent overlap
    numStars = 1;
  } else if (health >= 0 && health < 2) {
    numStars = 0;
  } else {
    numStars = -1;
  }
  console.log(numStars);

  for (let i = 0; i <= numStars; i++) {
    stars[i].style.fill = "#fab005"; // Ensure the color is a string
  }
}

export function resetStars() {
  const stars = document.querySelectorAll(".star path:last-child");
  for (let i = 0; i <= 2; i++) {
    stars[i].style.fill = "#e9ecef"; // Ensure the color is a string
  }
}

export function updateHintIcons(listItem, result) {
  const wrongIcon = listItem.querySelector("svg:first-child");
  const correctIcon = listItem.querySelector("svg:nth-child(2)");
  if (result === 0) {
    wrongIcon.classList.remove("hidden");
    correctIcon.classList.add("hidden");
  } else {
    wrongIcon.classList.add("hidden");
    correctIcon.classList.remove("hidden");
  }
}
