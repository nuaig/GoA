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

  myDB.updatePlayAgain = async (userId, playAgain) => {
    const { client, db } = await connect();
    try {
      const objectId = new ObjectId(userId);

      const result = await db.collection("game_status").updateOne(
        { user_id: objectId },
        { $set: { playAgain: playAgain } }, // Add or update this field
        { upsert: true }
      );

      if (result.modifiedCount === 0 && result.matchedCount === 0) {
        console.log(`No document found to update for user ${userId}`);
        return { ok: false, msg: "No document matched for playAgain update." };
      }

      console.log(`playAgain set to ${playAgain} for user ${userId}`);
      return { ok: true };
    } catch (err) {
      console.error("Error updating playAgain:", err.message);
      return { ok: false, msg: "Error updating playAgain" };
    } finally {
      await client.close();
    }
  };

  myDB.createGameStatus = async (userId) => {
    const { client, db } = await connect();
    try {
      let objectId;
      if (ObjectId.isValid(userId) && String(new ObjectId(userId)) === userId) {
        objectId = new ObjectId(userId);
      } else {
        objectId = userId;
      }

      const initialGameStatus = {
        user_id: objectId,
        role: "user",
        games: {
          Heapsort: {
            regular: [
              { level: 1, score: 0, stars: 0, status: "unlocked" },
              { level: 2, score: 0, stars: 0, status: "locked" },
              { level: 3, score: 0, stars: 0, status: "locked" },
            ],
            training: [
              { level: 1, score: 0, stars: 0, status: "unlocked" },
              { level: 2, score: 0, stars: 0, status: "locked" },
              { level: 3, score: 0, stars: 0, status: "locked" },
            ],
          },
          Prim: {
            regular: [
              { level: 1, score: 0, stars: 0, status: "unlocked" },
              { level: 2, score: 0, stars: 0, status: "locked" },
              { level: 3, score: 0, stars: 0, status: "locked" },
            ],
            training: [
              { level: 1, score: 0, stars: 0, status: "unlocked" },
              { level: 2, score: 0, stars: 0, status: "locked" },
              { level: 3, score: 0, stars: 0, status: "locked" },
            ],
          },
          Kruskal: {
            regular: [
              { level: 1, score: 0, stars: 0, status: "unlocked" },
              { level: 2, score: 0, stars: 0, status: "locked" },
              { level: 3, score: 0, stars: 0, status: "locked" },
            ],
            training: [
              { level: 1, score: 0, stars: 0, status: "unlocked" },
              { level: 2, score: 0, stars: 0, status: "locked" },
              { level: 3, score: 0, stars: 0, status: "locked" },
            ],
          },
        },
      };

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
  myDB.updateStatusToCompleted = async (userId, gameName, mode, level) => {
    const { client, db } = await connect();
    try {
      const objectId = new ObjectId(userId);

      // Use arrayFilters to target the correct element in the array
      const response = await db.collection("game_status").updateOne(
        {
          user_id: objectId, // Match the user
          [`games.${gameName}.${mode}`]: { $exists: true }, // Ensure the game and mode exist
        },
        {
          $set: {
            [`games.${gameName}.${mode}.$[elem].status`]: "completed",
          },
        },
        {
          arrayFilters: [
            { "elem.level": level, "elem.status": "completed_first_time" },
          ],
        }
      );

      if (response.modifiedCount === 0) {
        console.log(
          `No status update needed for user ${userId}, game ${gameName}, mode ${mode}, level ${level}`
        );
        return {
          ok: false,
          msg: "No update needed, status was not 'completed_first_time'",
        };
      }

      console.log(
        `Status updated to 'completed' for user ${userId} in game ${gameName}, mode ${mode}, level ${level}`
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
  myDB.updateGameStatus = async (userId, gameName, mode, levelData) => {
    const { client, db } = await connect();
    try {
      const objectId = new ObjectId(userId);
      console.log(levelData);

      const response = await db.collection("game_status").updateOne(
        {
          user_id: objectId,
          [`games.${gameName}.${mode}`]: { $exists: true }, // Ensure the game and mode exist
        },
        {
          $set: {
            [`games.${gameName}.${mode}.$[elem].score`]: levelData.score,
            [`games.${gameName}.${mode}.$[elem].stars`]: levelData.stars,
            [`games.${gameName}.${mode}.$[elem].status`]: levelData.status,
          },
        },
        {
          arrayFilters: [{ "elem.level": levelData.level }],
        }
      );

      console.log(
        `Game status updated for user ${userId} in game ${gameName}, mode ${mode}, level ${levelData.level}`
      );
      return response;
    } catch (err) {
      console.error("Error updating game status", err.message);
      return false;
    } finally {
      await client.close();
    }
  };

  myDB.unlockGameLevel = async (userId, gameName, mode, level) => {
    const { client, db } = await connect();
    try {
      const objectId = new ObjectId(userId);

      // Log the document before update for debugging
      const document = await db
        .collection("game_status")
        .findOne({ user_id: objectId });
      console.log("Document before update:", JSON.stringify(document, null, 2));

      // Update the status of the specified game, mode, and level to 'unlocked'
      const response = await db.collection("game_status").updateOne(
        {
          user_id: objectId,
          [`games.${gameName}.${mode}`]: { $exists: true }, // Ensure the game and mode exist
        },
        {
          $set: {
            [`games.${gameName}.${mode}.$[elem].status`]: "unlocked", // Unlock the level
          },
        },
        {
          arrayFilters: [{ "elem.level": parseInt(level) }], // Match the level in the array
        }
      );

      if (response.modifiedCount === 0) {
        console.log(
          `Failed to unlock level ${level} for user ${userId} in game ${gameName}, mode ${mode}`
        );
        return { ok: false, msg: "Failed to unlock the game level" };
      }

      console.log(
        `Level ${level} of game ${gameName} in mode ${mode} unlocked for user ${userId}`
      );
      return { ok: true, msg: `Level ${level} unlocked successfully` };
    } catch (err) {
      console.error("Error unlocking game level:", err.message);
      return { ok: false, msg: "Error unlocking game level" };
    } finally {
      await client.close();
    }
  };
  myDB.resetGameStatus = async (userId) => {
    const { client, db } = await connect();
    try {
      const objectId = new ObjectId(userId);

      // Define the reset game status structure with both regular and training modes
      const resetStatus = {
        "games.Heapsort": {
          regular: [
            { level: 1, score: 0, stars: 0, status: "unlocked" },
            { level: 2, score: 0, stars: 0, status: "locked" },
            { level: 3, score: 0, stars: 0, status: "locked" },
          ],
          training: [
            { level: 1, score: 0, stars: 0, status: "unlocked" },
            { level: 2, score: 0, stars: 0, status: "locked" },
            { level: 3, score: 0, stars: 0, status: "locked" },
          ],
        },
        "games.Prim": {
          regular: [
            { level: 1, score: 0, stars: 0, status: "unlocked" },
            { level: 2, score: 0, stars: 0, status: "locked" },
            { level: 3, score: 0, stars: 0, status: "locked" },
          ],
          training: [
            { level: 1, score: 0, stars: 0, status: "unlocked" },
            { level: 2, score: 0, stars: 0, status: "locked" },
            { level: 3, score: 0, stars: 0, status: "locked" },
          ],
        },
        "games.Kruskal": {
          regular: [
            { level: 1, score: 0, stars: 0, status: "unlocked" },
            { level: 2, score: 0, stars: 0, status: "locked" },
            { level: 3, score: 0, stars: 0, status: "locked" },
          ],
          training: [
            { level: 1, score: 0, stars: 0, status: "unlocked" },
            { level: 2, score: 0, stars: 0, status: "locked" },
            { level: 3, score: 0, stars: 0, status: "locked" },
          ],
        },
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

  myDB.getLeaderboard = async () => {
    const { client, db } = await connect();
    try {
      const pipeline = [
        {
          $lookup: {
            from: "useraccounts",
            localField: "user_id",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $match: {
            "userDetails.role": { $ne: "admin" }, // Exclude admin users
          },
        },
        {
          $project: {
            username: "$userDetails.username",
            scores: {
              $concatArrays: [
                "$games.Heapsort.regular",
                "$games.Prim.regular",
                "$games.Kruskal.regular",
              ],
            },
          },
        },
        { $unwind: "$scores" },
        {
          $group: {
            _id: "$username",
            totalScore: { $sum: "$scores.score" },
          },
        },
        { $sort: { totalScore: -1 } },
        {
          $setWindowFields: {
            sortBy: { totalScore: -1 },
            output: {
              rank: { $rank: {} },
            },
          },
        },
        {
          $project: {
            _id: 0,
            rank: 1,
            username: "$_id",
            totalScore: 1,
          },
        },
      ];

      const leaderboard = await db
        .collection("game_status")
        .aggregate(pipeline)
        .toArray();
      console.log("Leaderboard generated:", leaderboard);
      return leaderboard;
    } catch (err) {
      console.error("Error generating leaderboard", err.message);
      return false;
    } finally {
      await client.close();
    }
  };

  myDB.getUsersProgress = async () => {
    const { client, db } = await connect();
    try {
      const pipeline = [
        {
          $lookup: {
            from: "useraccounts",
            localField: "user_id",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        {
          $project: {
            user_id: 1,
            username: "$userDetails.username",
            gameProgress: {
              Heapsort: { $ifNull: ["$games.Heapsort.regular", []] },
              Prim: { $ifNull: ["$games.Prim.regular", []] },
              Kruskal: { $ifNull: ["$games.Kruskal.regular", []] },
            },
          },
        },
        {
          $project: {
            user_id: 1,
            username: 1,
            total_score: {
              $sum: [
                { $sum: "$gameProgress.Heapsort.score" },
                { $sum: "$gameProgress.Prim.score" },
                { $sum: "$gameProgress.Kruskal.score" },
              ],
            },
            completed_games: {
              $add: [
                {
                  $cond: {
                    if: {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: "$gameProgress.Heapsort",
                              as: "level",
                              cond: {
                                $and: [
                                  { $eq: ["$$level.level", 3] },
                                  {
                                    $in: [
                                      "$$level.status",
                                      ["completed", "completed_first_time"],
                                    ],
                                  },
                                ],
                              },
                            },
                          },
                        },
                        0,
                      ],
                    },
                    then: 1,
                    else: 0,
                  },
                },
                {
                  $cond: {
                    if: {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: "$gameProgress.Prim",
                              as: "level",
                              cond: {
                                $and: [
                                  { $eq: ["$$level.level", 3] },
                                  {
                                    $in: [
                                      "$$level.status",
                                      ["completed", "completed_first_time"],
                                    ],
                                  },
                                ],
                              },
                            },
                          },
                        },
                        0,
                      ],
                    },
                    then: 1,
                    else: 0,
                  },
                },
                {
                  $cond: {
                    if: {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: "$gameProgress.Kruskal",
                              as: "level",
                              cond: {
                                $and: [
                                  { $eq: ["$$level.level", 3] },
                                  {
                                    $in: [
                                      "$$level.status",
                                      ["completed", "completed_first_time"],
                                    ],
                                  },
                                ],
                              },
                            },
                          },
                        },
                        0,
                      ],
                    },
                    then: 1,
                    else: 0,
                  },
                },
              ],
            },
          },
        },
        {
          $project: {
            user_id: 1,
            username: 1,
            total_score: 1,
            status: {
              $cond: {
                if: { $eq: ["$completed_games", 3] },
                then: "Completed",
                else: "Ongoing",
              },
            },
          },
        },
      ];

      const userProgress = await db
        .collection("game_status")
        .aggregate(pipeline)
        .toArray();
      console.log("User Progress Data:", userProgress);
      return userProgress;
    } catch (err) {
      console.error("Error fetching user progress data:", err.message);
      return false;
    } finally {
      await client.close();
    }
  };

  myDB.addRoleToGameStatus = async () => {
    const { client, db } = await connect();
    try {
      console.log("Connected to MongoDB for updating game status roles");
      const result = await db.collection("game_status").updateMany(
        { role: { $exists: false } }, // Filter documents without a 'role' field
        { $set: { role: "user" } } // Add 'role' with the value 'user'
      );
      console.log(
        `${result.matchedCount} game status documents matched the filter, ${result.modifiedCount} were updated.`
      );
      return result;
    } catch (error) {
      console.error("Error updating game status roles:", error.message);
      return false;
    } finally {
      await client.close();
    }
  };

  return myDB;
}

// since this is an instance of the function MyMongoDB
const myDBInstance = MyMongoDB();

export default myDBInstance;
// async function testCompletionData() {
//   try {
//     // const data = await myDBInstance.getCompletionData();
//     // const data = await myDBInstance.getAverageMistakesData();
//     // const data = await myDBInstance.getCompletionTimeData();
//     // myDBInstance.findNullLevels();
//     // const data = await myDBInstance.getScoreDistributionData();

//     // const data = await myDBInstance.getMistakeReductionDataForSingleUser("2");
//     const data = await myDBInstance.getUsersProgress();
//     // myDBInstance.resetGameSessions("66f94ed538cbdcb6fd0ea6e7");
//     // console.log(data);
//   } catch (error) {
//     console.error("Failed to fetch or process data:", error);
//   }
// }

// testCompletionData();
