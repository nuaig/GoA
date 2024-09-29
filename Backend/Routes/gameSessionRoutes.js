import express from "express";
import {
  addGameSessionCon,
  getGameSessionsCon,
} from "../controllers/gameSessionController.js";

const router = express.Router();

router.route("/").post(addGameSessionCon);
router.route("/:userId").get(getGameSessionsCon);

export default router;
