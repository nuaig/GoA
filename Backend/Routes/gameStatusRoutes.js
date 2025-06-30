import express from "express";
import {
  getGameStatusCon,
  updateGameStatusCon,
  unlockGameLevelCon,
  resetGameStatusCon,
  updateStatusToCompletedCon,
  getLeaderboardCon,
  getUsersDataCon,
  updatePlayAgainCon,
} from "../controllers/gameStatusController.js";

const router = express.Router();

router.get("/leaderboard", getLeaderboardCon);

router.get("/usersData", getUsersDataCon);
// Route to get game status for a user
router.get("/:userId", getGameStatusCon);

router.post("/:userId/playAgain", updatePlayAgainCon);

// Route to update game status for a specific game and mode
router.post("/:userId/:gameName/:mode", updateGameStatusCon);

// Route to unlock a game level for a specific mode
router.post("/unlock/:userId/:gameName/:mode/:level", unlockGameLevelCon);

// Route to reset all game statuses (both modes) for a user
router.put("/reset/:userId", resetGameStatusCon);

// Route to update status from "completed_first_time" to "completed" for a specific mode
router.post(
  "/updateToCompleted/:userId/:gameName/:mode/:level",
  updateStatusToCompletedCon
);

export default router;
