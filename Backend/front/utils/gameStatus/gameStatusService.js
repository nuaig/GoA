import { update } from "three/examples/jsm/libs/tween.module.js";

export class GameStatusService {
  constructor(userId) {
    this.userId = userId;
    this.gameStatus = null; // Initially null
  }

  // Initialize the game status
  async init() {
    await this.getGameStatus(); // Fetch game status and store it
  }

  // Fetch game status and assign it to this.gameStatus
  async getGameStatus() {
    try {
      const response = await fetch(`/api/status/${this.userId}`);
      const data = await response.json();
      if (response.ok) {
        this.gameStatus = data.gameStatus;
        console.log("Game status fetched:", this.gameStatus);
      } else {
        console.error("Error fetching game status:", data.msg);
      }
    } catch (error) {
      console.error("Error in getGameStatus:", error);
    }
  }

  // Update game status both in the class and the database
  async updateGameStatus(gameName, level, score, stars, status) {
    const updateData = {
      level,
      score,
      stars,
      status,
    };
    console.log(updateData);
    try {
      const response = await fetch(`/api/status/${this.userId}/${gameName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      console.log(data);
      if (response.ok) {
        // Update the gameStatus property in the class
        this.gameStatus.games[gameName][level - 1] = updateData;
        console.log("Game status updated successfully:", data.msg);
      } else {
        console.error("Error updating game status:", data.msg);
      }
    } catch (error) {
      console.error("Error in updateGameStatus:", error);
    }
  }

  // Unlock game level both in the class and the database
  async unlockGameLevel(gameName, level) {
    try {
      const currentLevelStatus = this.gameStatus.games[gameName][level - 1];

      // Check if the level is already unlocked
      if (level > 3 || currentLevelStatus.status === "unlocked") {
        console.log(`Level ${level} is already unlocked. No changes made.`);
        return; // Exit the function since the level is already unlocked
      }
      const response = await fetch(
        `/api/status/unlock/${this.userId}/${gameName}/${level}`,
        {
          method: "POST",
        }
      );
      const data = await response.json();
      if (response.ok) {
        // Update gameStatus in the class
        this.gameStatus.games[gameName][level - 1].status = "unlocked";
        console.log(`Level ${level} unlocked successfully:`, data.msg);
      } else {
        console.error("Error unlocking game level:", data.msg);
      }
    } catch (error) {
      console.error("Error in unlockGameLevel:", error);
    }
  }

  // Get current game status from the class (no API call)
  getLocalGameStatus() {
    return this.gameStatus;
  }

  getUserId() {
    return this.userId;
  }
}
