import myDB from "../db/DBGameSessions.js";

// Add a new game session
export const addGameSessionCon = async (req, res) => {
  const { userId, gameSession } = req.body;

  try {
    const response = await myDB.addGameSession(userId, gameSession);
    if (response) {
      res
        .status(200)
        .json({ ok: true, msg: "Game session recorded successfully" });
    } else {
      res.status(500).json({ ok: false, msg: "Failed to record game session" });
    }
  } catch (e) {
    console.error("Error from addGameSessionCon", e.message);
    res.status(500).json({ ok: false, msg: "Error adding game session" });
  }
};

// Get all game sessions for a user
export const getGameSessionsCon = async (req, res) => {
  const userId = req.params.userId;

  try {
    const gameSessions = await myDB.getGameSessions(userId);
    res.status(200).json({ ok: true, gameSessions });
  } catch (e) {
    console.error("Error from getGameSessionsCon", e.message);
    res.status(500).json({ ok: false, msg: "Error fetching game sessions" });
  }
};
