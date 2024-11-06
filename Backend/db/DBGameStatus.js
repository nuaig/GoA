import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

function MyMongoDB() {
  const myDB = {};

  const uri = process.env.DATABASE.replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD
  );

  async function connect() {
    try {
      const client = new MongoClient(uri);
      await client.connect(); // Try to connect to MongoDB
      console.log("Successfully connected to MongoDB"); // Log on successful connection
      const db = client.db("users");
      return { client, db };
    } catch (e) {
      console.error("Failed to connect to MongoDB", e); // Log any errors during connection
      throw e; // Re-throw the error to handle it in the calling function
    }
  }

  myDB.createGameStatus = async (userId) => {
    const { client, db } = await connect();
    try {
      // Ensure userId is in ObjectId format if it's not already
      let objectId;
      if (ObjectId.isValid(userId) && String(new ObjectId(userId)) === userId) {
        objectId = new ObjectId(userId);
      } else {
        objectId = userId; // Treat as string if not ObjectId
      }

      // Step 2: Set up the initial game status with all three games and their levels
      const initialGameStatus = {
        user_id: objectId,
        games: {
          Heapsort: [
            { level: 1, score: 0, stars: 0, status: "unlocked" },
            { level: 2, score: 0, stars: 0, status: "locked" },
            { level: 3, score: 0, stars: 0, status: "locked" },
          ],
          Prim: [
            { level: 1, score: 0, stars: 0, status: "unlocked" },
            { level: 2, score: 0, stars: 0, status: "locked" },
            { level: 3, score: 0, stars: 0, status: "locked" },
          ],
          Kruskal: [
            { level: 1, score: 0, stars: 0, status: "unlocked" },
            { level: 2, score: 0, stars: 0, status: "locked" },
            { level: 3, score: 0, stars: 0, status: "locked" },
          ],
        },
      };

      // Step 3: Insert the initial game status into the game_status collection
      const response = await db
        .collection("game_status")
        .insertOne(initialGameStatus);
      console.log(`Initial game status created for user ${userId}`);
      return response;
    } catch (err) {
      console.error("Error creating game status", err.message);
      return false;
    } finally {
      await client.close();
    }
  };

  // Function to update status from "completed_first_time" to "completed"
  myDB.updateStatusToCompleted = async (userId, gameName, level) => {
    const { client, db } = await connect();
    try {
      const objectId = new ObjectId(userId);

      // Update status from "completed_first_time" to "completed" for the specific game and level
      const response = await db.collection("game_status").updateOne(
        {
          user_id: objectId,
          [`games.${gameName}.level`]: level, // Match the game and level
          [`games.${gameName}.status`]: "completed_first_time", // Check the current status
        },
        {
          $set: {
            [`games.${gameName}.$.status`]: "completed", // Update to "completed"
          },
        }
      );

      if (response.modifiedCount === 0) {
        console.log(
          `No status update needed for user ${userId}, game ${gameName}, level ${level}`
        );
        return {
          ok: false,
          msg: "No update needed, status was not 'completed_first_time'",
        };
      }

      console.log(
        `Status updated to 'completed' for user ${userId} in game ${gameName}, level ${level}`
      );
      return { ok: true, msg: "Status updated to completed" };
    } catch (err) {
      console.error("Error updating status to completed", err.message);
      return { ok: false, msg: "Error updating status to completed" };
    } finally {
      await client.close();
    }
  };
  // Fetch game status for a user
  myDB.getGameStatus = async (userId) => {
    const { client, db } = await connect();
    try {
      // Convert userId to ObjectId if necessary
      const objectId = new ObjectId(userId);

      // Fetch game status for the user
      const gameStatus = await db
        .collection("game_status")
        .findOne({ user_id: objectId });

      if (!gameStatus) {
        console.log(`No game status found for user ${userId}`);
        return null;
      }

      console.log(`Game status retrieved for user ${userId}`);
      return gameStatus;
    } catch (err) {
      console.error("Error retrieving game status", err.message);
      return false;
    } finally {
      await client.close();
    }
  };

  // Update game status for a specific game and level
  myDB.updateGameStatus = async (userId, gameName, levelData) => {
    const { client, db } = await connect();
    try {
      const objectId = new ObjectId(userId);

      // Use arrayFilters to match the correct element in the games array based on the level
      const response = await db.collection("game_status").updateOne(
        {
          user_id: objectId,
          [`games.${gameName}`]: { $exists: true }, // Ensure the game exists
        },
        {
          $set: {
            [`games.${gameName}.$[elem].score`]: levelData.score,
            [`games.${gameName}.$[elem].stars`]: levelData.stars,
            [`games.${gameName}.$[elem].status`]: levelData.status,
          },
        },
        {
          arrayFilters: [{ "elem.level": levelData.level }], // Match the level in the array
        }
      );

      console.log(
        `Game status updated for user ${userId} in game ${gameName}, level ${levelData.level}`
      );
      return response;
    } catch (err) {
      console.error("Error updating game status", err.message);
      return false;
    } finally {
      await client.close();
    }
  };

  myDB.unlockGameLevel = async (userId, gameName, level) => {
    const { client, db } = await connect();
    try {
      // Convert userId to ObjectId if necessary
      const objectId = new ObjectId(userId);

      // Update the status of the specified game and level to 'unlocked'
      const response = await db.collection("game_status").updateOne(
        {
          user_id: objectId,
          [`games.${gameName}.level`]: level, // Match the specific game and level
        },
        {
          $set: {
            [`games.${gameName}.$.status`]: "unlocked", // Unlock the level
          },
        }
      );

      if (response.modifiedCount === 0) {
        console.log(`Failed to unlock level ${level} for user ${userId}`);
        return { ok: false, msg: "Failed to unlock the game level" };
      }

      console.log(
        `Level ${level} of game ${gameName} unlocked for user ${userId}`
      );
      return { ok: true, msg: `Level ${level} unlocked successfully` };
    } catch (err) {
      console.error("Error unlocking game level", err.message);
      return { ok: false, msg: "Error unlocking game level" };
    } finally {
      await client.close();
    }
  };

  myDB.resetGameStatus = async (userId) => {
    const { client, db } = await connect();
    try {
      const objectId = new ObjectId(userId);

      // Define the reset game status structure
      const resetStatus = {
        "games.Heapsort": [
          { level: 1, score: 0, stars: 0, status: "unlocked" },
          { level: 2, score: 0, stars: 0, status: "locked" },
          { level: 3, score: 0, stars: 0, status: "locked" },
        ],
        "games.Prim": [
          { level: 1, score: 0, stars: 0, status: "unlocked" },
          { level: 2, score: 0, stars: 0, status: "locked" },
          { level: 3, score: 0, stars: 0, status: "locked" },
        ],
        "games.Kruskal": [
          { level: 1, score: 0, stars: 0, status: "unlocked" },
          { level: 2, score: 0, stars: 0, status: "locked" },
          { level: 3, score: 0, stars: 0, status: "locked" },
        ],
      };

      // Update the game status in the database to the reset status
      const response = await db
        .collection("game_status")
        .updateOne({ user_id: objectId }, { $set: resetStatus });

      if (response.modifiedCount === 0) {
        console.log(`Failed to reset game status for user ${userId}`);
        return { ok: false, msg: "Failed to reset game status" };
      }

      console.log(`Game status reset for user ${userId}`);
      return { ok: true, msg: "Game status reset successfully" };
    } catch (err) {
      console.error("Error resetting game status", err.message);
      return { ok: false, msg: "Error resetting game status" };
    } finally {
      await client.close();
    }
  };

  return myDB;
}

// since this is an instance of the function MyMongoDB
const myDBInstance = MyMongoDB();

export default myDBInstance;
