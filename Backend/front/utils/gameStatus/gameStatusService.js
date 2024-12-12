import { update } from "three/examples/jsm/libs/tween.module.js";

export class GameStatusService {
  constructor(userId) {
    this.userId = userId;
    this.gameStatus = null; // Initially null
  }

  // Initialize the game status
  async init() {
    try {
      await this.getGameStatus();
    } catch (error) {
      console.error("Failed to initialize game status:", error);
    }
  }

  // Fetch game status and store it locally
  async getGameStatus() {
    try {
      const response = await fetch(`/api/status/${this.userId}`);
      if (!response.ok) throw new Error("Failed to fetch game status.");

      const data = await response.json();
      this.gameStatus = data.gameStatus;
      console.log("Game status fetched:", this.gameStatus);
    } catch (error) {
      console.error("Error in getGameStatus:", error);
    }
  }

  // Update game status in the class and database
  async updateGameStatus(gameName, level, mode, score, stars, status) {
    try {
      const currentGameData =
        this.gameStatus?.games[gameName]?.[mode]?.[level - 1];

      // Validate if update is necessary
      if (currentGameData?.score >= score) {
        console.log(
          `No update: Current score (${currentGameData.score}) is higher or equal to new score (${score}).`
        );
        return;
      }

      if (level === 3 && currentGameData?.status === "completed") {
        status = "completed";
      }

      const updateData = { level, score, stars, status };
      console.log("Update data:", updateData);

      const response = await fetch(
        `/api/status/${this.userId}/${gameName}/${mode}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) throw new Error("Failed to update game status.");

      const data = await response.json();
      this.gameStatus.games[gameName][mode][level - 1] = updateData;
      console.log("Game status updated successfully:", data.msg);
    } catch (error) {
      console.error("Error in updateGameStatus:", error);
    }
  }

  // Update status from "completed_first_time" to "completed"
  async updateStatusToCompleted(gameName, level, mode) {
    try {
      const currentStatus =
        this.gameStatus?.games[gameName]?.[mode]?.[level - 1]?.status;
      if (currentStatus === "completed") {
        console.log(`Level ${level} in mode ${mode} is already completed.`);
        return;
      }

      const response = await fetch(
        `/api/status/updateToCompleted/${this.userId}/${gameName}/${mode}/${level}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );

      if (!response.ok)
        throw new Error("Failed to update status to completed.");

      const data = await response.json();
      this.gameStatus.games[gameName][mode][level - 1].status = "completed";
      console.log("Status updated to 'completed':", data.msg);
    } catch (error) {
      console.error("Error in updateStatusToCompleted:", error);
    }
  }

  // Unlock a game level
  async unlockGameLevel(gameName, level, mode) {
    try {
      if (level > 3) {
        console.warn(`Invalid level: ${level}. Levels range from 1 to 3.`);
        return;
      }

      const currentStatus =
        this.gameStatus?.games[gameName]?.[mode]?.[level - 1]?.status;

      if (
        ["unlocked", "completed", "completed_first_time"].includes(
          currentStatus
        )
      ) {
        console.log(
          `Level ${level} in mode ${mode} is already unlocked or completed.`
        );
        return;
      }

      const response = await fetch(
        `/api/status/unlock/${this.userId}/${gameName}/${mode}/${level}`,
        { method: "POST" }
      );

      if (!response.ok) throw new Error("Failed to unlock game level.");

      const data = await response.json();
      this.gameStatus.games[gameName][mode][level - 1].status = "unlocked";
      console.log(
        `Level ${level} in mode ${mode} unlocked successfully:`,
        data.msg
      );
    } catch (error) {
      console.error("Error in unlockGameLevel:", error);
    }
  }

  // Fetch the current game status from the class
  getLocalGameStatus() {
    return this.gameStatus;
  }

  // Get the user ID
  getUserId() {
    return this.userId;
  }
}
