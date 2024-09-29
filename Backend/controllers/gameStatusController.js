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

// Controller to update game status for a user
export const updateGameStatusCon = async (req, res) => {
  const { userId, gameName } = req.params;
  const { level, score, stars, status } = req.body;

  try {
    const levelData = { level, score, stars, status };
    const updateResponse = await myDB.updateGameStatus(
      userId,
      gameName,
      levelData
    );

    if (updateResponse.modifiedCount === 0) {
      return res
        .status(404)
        .json({ ok: false, msg: "Failed to update game status" });
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

// Controller to unlock game level for a user
export const unlockGameLevelCon = async (req, res) => {
  const { userId, gameName, level } = req.params;

  try {
    const unlockResponse = await myDB.unlockGameLevel(
      userId,
      gameName,
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
