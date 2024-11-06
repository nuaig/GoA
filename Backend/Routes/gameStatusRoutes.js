import express from "express";
import {
  getGameStatusCon,
  updateGameStatusCon,
  unlockGameLevelCon,
  resetGameStatusCon,
  updateStatusToCompletedCon,
} from "../controllers/gameStatusController.js";

const router = express.Router();

// Route to get game status
router.get("/:userId", getGameStatusCon);

// Route to update game status
router.post("/:userId/:gameName", updateGameStatusCon);

// Route to unlock game level
router.post("/unlock/:userId/:gameName/:level", unlockGameLevelCon);

// Route to reset all levels for a user
router.put("/reset/:userId", resetGameStatusCon);

// Route to update status from "completed_first_time" to "completed"
router.post(
  "/updateToCompleted/:userId/:gameName/:level",
  updateStatusToCompletedCon
);

export default router;
