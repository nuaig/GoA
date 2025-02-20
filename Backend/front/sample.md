# GameRoomUI Documentation

## Overview

The `GameRoomUI` class is responsible for managing the user interface (UI) of the game, handling modals, event listeners, and game status updates. It integrates Swiper.js for instructional slides and GSAP for animations.

## Features

- **Game Mode Selection:** Training and regular modes with health indicators.
- **Level Selection and Management:** Tracks user progress and updates UI dynamically.
- **Instructional Modals:** Includes game feature and algorithm instruction modals.
- **Swiper Integration:** Provides a slideshow for step-by-step instructions.
- **Event Listeners:** Handles UI interactions for settings, levels, and modals.
- **Camera Animation:** Uses GSAP for smooth transitions in `Kruskal` and `Prim` games.

## Constructor

### `GameRoomUI(gameName, initialLevel, camera, callbacks = {})`

- Initializes the game UI, event listeners, and Swiper.js.
- Takes `gameName`, `initialLevel`, `camera`, and optional `callbacks`.
- Initializes properties like `health`, `currentScore`, and `isModalOpen`.

## Methods

### `setGameStatusService(gameStatusService)`

- Assigns the `gameStatusService` to fetch and update game progress.
- This is important if you want to sync current player's status with game UI.

### `setGameSession(curGameSession)`

- Stores the current game session data.

### `initializeUIElements()`

- Selects UI elements including modals, buttons, and overlays.

### `addEventListeners()`

- Registers event listeners for buttons, modals, and Swiper.js.

### `toggleMode(mode)`

- Switches between training and regular game modes.
- Updates UI elements and calls `initializeLevelStatus(mode)`.

### `initializeLevelStatus(mode)`

- Loads level statuses based on user progress.
- Unlocks completed levels and updates UI dynamically.

### `updateScore(newScore)`

- Updates the displayed score in the UI.

### `hideStars()` / `showStars()`

- Hides or shows stars in level selection.

### `toggleHeader(showHealth)`

- Toggles between headers with or without health display.

### `finalizeLevelEventListener()`

- Adds event listeners to level selection buttons.
- Resets game session and triggers camera animations if needed.

### `openModal(modal)` / `closeModal(modal)`

- Opens or closes a given modal and updates UI states.

### `enableMouseEventListeners_K_P()` / `disableMouseEventListeners_K_P()`

- Enables or disables mouse event listeners for `Kruskal` and `Prim`.

## Swiper.js Integration

The class integrates Swiper.js to display instructional images in a modal.

```javascript
this.swiper = new Swiper(".mySwiper", {
  modules: [Navigation, Pagination],
  slidesPerView: 1,
  grabCursor: true,
  loop: true,
  pagination: { el: ".swiper-pagination", clickable: true },
  navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
});
```

## Event Handling

The game UI listens for multiple events:

- **Game Mode Selection**
- **Level Selection**
- **All Modals**
- **Settings and Restart Options**

## Conclusion

The `GameRoomUI` class provides an interactive interface for players, ensuring smooth gameplay transitions, instructional guidance, and dynamic UI updates.
