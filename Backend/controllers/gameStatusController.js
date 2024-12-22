import myDB from "../db/DBGameStatus.js";

// Controller to get game status for a user
export const getGameStatusCon = async (req, res) => {
  const { userId } = req.params;
  try {
    const gameStatus = await myDB.getGameStatus(userId);
    if (!gameStatus) {
      return res
        .status(404)
        .json({ ok: false, msg: "Game status not found for user" });
    }
    return res.status(200).json({ ok: true, gameStatus });
  } catch (e) {
    console.error("Error in getGameStatusCon", e.message);
    return res
      .status(500)
      .json({ ok: false, msg: "Error retrieving game status" });
  }
};

export const updateGameStatusCon = async (req, res) => {
  const { userId, gameName, mode } = req.params;
  const { level, score, stars, status } = req.body;

  console.log("Params:", req.params); // Log the params
  console.log("Body:", req.body); // Log the body

  try {
    const levelData = { level, score, stars, status };
    console.log("Level Data:", levelData); // Log the level data before sending it
    const updateResponse = await myDB.updateGameStatus(
      userId,
      gameName,
      mode,
      levelData
    );

    if (updateResponse.modifiedCount === 0) {
      return res
        .status(404)
        .json({ ok: false, msg: "No updates made. Record not found." });
    }

    return res
      .status(200)
      .json({ ok: true, msg: "Game status updated successfully" });
  } catch (e) {
    console.error("Error in updateGameStatusCon", e.message);
    return res
      .status(500)
      .json({ ok: false, msg: "Error updating game status" });
  }
};

// Controller to update status from "completed_first_time" to "completed" for a specific mode
export const updateStatusToCompletedCon = async (req, res) => {
  const { userId, gameName, mode, level } = req.params;

  try {
    const updateResponse = await myDB.updateStatusToCompleted(
      userId,
      gameName,
      mode, // Specify the mode
      parseInt(level)
    );

    if (!updateResponse.ok) {
      return res.status(400).json({ ok: false, msg: updateResponse.msg });
    }

    return res.status(200).json({ ok: true, msg: updateResponse.msg });
  } catch (e) {
    console.error("Error in updateStatusToCompletedCon", e.message);
    return res
      .status(500)
      .json({ ok: false, msg: "Error updating status to completed" });
  }
};

// Controller to unlock a game level for a user in a specific mode
export const unlockGameLevelCon = async (req, res) => {
  const { userId, gameName, mode, level } = req.params;

  try {
    const unlockResponse = await myDB.unlockGameLevel(
      userId,
      gameName,
      mode,
      parseInt(level)
    );

    if (!unlockResponse.ok) {
      return res.status(400).json({ ok: false, msg: unlockResponse.msg });
    }

    return res.status(200).json({ ok: true, msg: unlockResponse.msg });
  } catch (e) {
    console.error("Error in unlockGameLevelCon", e.message);
    return res
      .status(500)
      .json({ ok: false, msg: "Error unlocking game level" });
  }
};

// Controller to reset all game statuses (both modes) for a user
export const resetGameStatusCon = async (req, res) => {
  const { userId } = req.params;

  try {
    const resetResponse = await myDB.resetGameStatus(userId);

    if (!resetResponse.ok) {
      return res.status(400).json({ ok: false, msg: resetResponse.msg });
    }

    return res.status(200).json({ ok: true, msg: resetResponse.msg });
  } catch (e) {
    console.error("Error in resetGameStatusCon", e.message);
    return res
      .status(500)
      .json({ ok: false, msg: "Error resetting game status" });
  }
};

// Controller to fetch the leaderboard
export const getLeaderboardCon = async (req, res) => {
  try {
    // Fetch the leaderboard from the database
    const leaderboard = await myDB.getLeaderboard();
    console.log("leaderboard controller");

    if (!leaderboard || leaderboard.length === 0) {
      return res
        .status(404)
        .json({ ok: false, msg: "No leaderboard data found." });
    }

    return res.status(200).json({ ok: true, leaderboard });
  } catch (e) {
    console.error("Error in getLeaderboardCon", e.message);
    return res
      .status(500)
      .json({ ok: false, msg: "Error fetching leaderboard data" });
  }
};
