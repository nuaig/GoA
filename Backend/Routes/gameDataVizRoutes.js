import express from "express";
import {
  getAllVizDataCon,
  getAllVizDataIndiUserCon,
} from "../controllers/gameDataVizController.js";

const router = express.Router();

// Route to fetch all game data visualization metrics
router.route("/").get(getAllVizDataCon);
router.route("/user/:userId").get(getAllVizDataIndiUserCon);

export default router;
