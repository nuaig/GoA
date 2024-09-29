import express from "express";
import {
  getGameStatusCon,
  updateGameStatusCon,
  unlockGameLevelCon,
} from "../controllers/gameStatusController.js";

const router = express.Router();

// Route to get game status
router.get("/:userId", getGameStatusCon);

// Route to update game status
router.post("/:userId/:gameName", updateGameStatusCon);

// Route to unlock game level
router.post("/unlock/:userId/:gameName/:level", unlockGameLevelCon);

export default router;
