export function effectForCorrectSelect() {
  const elements = document.querySelectorAll(".correct__select");
  elements.forEach((element) => {
    element.classList.add("highlight__correct");
    setTimeout(() => {
      element.classList.remove("highlight__correct");
    }, 2000); // 500ms matches the animation duration
  });
}

export function shakeForWrongSelect() {
  const elements = document.querySelectorAll(".wrong__select");
  elements.forEach((element) => {
    element.classList.add("highlight__wrong");

    // Remove the class after the animation is done to allow re-triggering
    setTimeout(() => {
      element.classList.remove("highlight__wrong");
    }, 2000); // 500ms matches the animation duration
  });
}
