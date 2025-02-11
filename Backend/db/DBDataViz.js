import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
const formatScoreDistribution = (data) => {
  const predefinedBuckets = ["0-20", "21-40", "41-60", "61-80", "81-100"];

  // Ensure all buckets are represented
  const ensureBucketsArray = (bucketData) => {
    return predefinedBuckets.map((bucket) => bucketData[bucket] || 0);
  };

  // Process the input data
  const formattedData = Object.entries(data).reduce((result, [key, value]) => {
    result[key] = Object.entries(value).reduce(
      (levelResult, [levelKey, levelValue]) => {
        // Check if the key is 'allLevels' or a level number
        if (levelKey === "allLevels") {
          levelResult[levelKey] = ensureBucketsArray(levelValue);
        } else {
          levelResult[levelKey] = ensureBucketsArray(levelValue);
        }
        return levelResult;
      },
      {}
    );
    return result;
  }, {});

  return formattedData;
};

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
  // Aggregation function to get data for visualization
  myDB.getCompletionData = async () => {
    const { client, db } = await connect();
    const collection = db.collection("game_sessions");
    try {
      const pipeline = [
        {
          $match: {
            user_id: { $in: ["1", "2", "3", "4", "5"] }, // Filter specific user IDs
          },
        },
        {
          $unwind: "$game_sessions", // Unwind the game_sessions array
        },
        {
          $replaceRoot: { newRoot: "$game_sessions" }, // Make game_sessions objects the root
        },
        {
          $group: {
            // Group by game_name, level, and success
            _id: {
              game_name: "$game_name",
              level: "$level",
              success: "$success",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            // Group by game_name and level, calculate success and failure counts
            _id: { game_name: "$_id.game_name", level: "$_id.level" },
            successCount: {
              $sum: { $cond: [{ $eq: ["$_id.success", true] }, "$count", 0] },
            },
            failureCount: {
              $sum: { $cond: [{ $eq: ["$_id.success", false] }, "$count", 0] },
            },
            totalCount: { $sum: "$count" },
          },
        },
        {
          $group: {
            // Group by game_name and calculate overall stats
            _id: "$_id.game_name",
            allLevelsSuccess: { $sum: "$successCount" },
            allLevelsFailure: { $sum: "$failureCount" },
            allLevelsTotal: { $sum: "$totalCount" },
            levels: {
              $push: {
                level: "$_id.level",
                success: {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ["$successCount", "$totalCount"] },
                        100,
                      ],
                    },
                    2,
                  ],
                },
                failure: {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ["$failureCount", "$totalCount"] },
                        100,
                      ],
                    },
                    2,
                  ],
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            game_name: "$_id",
            allLevels: {
              success: {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$allLevelsSuccess", "$allLevelsTotal"] },
                      100,
                    ],
                  },
                  2,
                ],
              },
              failure: {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$allLevelsFailure", "$allLevelsTotal"] },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
            levels: 1,
          },
        },
      ];

      const gameSessions = await collection.aggregate(pipeline).toArray();

      // Process data for the "all" section
      const allData = gameSessions.reduce(
        (acc, game) => {
          // Aggregate allLevels stats
          acc.allLevels.success += game.allLevels.success;
          acc.allLevels.failure += game.allLevels.failure;

          // Aggregate stats for each level
          game.levels.forEach((level) => {
            if (!acc[level.level]) {
              acc[level.level] = { success: 0, failure: 0 };
            }
            acc[level.level].success += level.success;
            acc[level.level].failure += level.failure;
          });

          return acc;
        },
        { allLevels: { success: 0, failure: 0 } }
      );

      // Normalize percentages for "all"
      const totalAll = allData.allLevels.success + allData.allLevels.failure;
      allData.allLevels.success = parseFloat(
        ((allData.allLevels.success / totalAll) * 100).toFixed(2)
      );
      allData.allLevels.failure = parseFloat(
        ((allData.allLevels.failure / totalAll) * 100).toFixed(2)
      );

      for (const level in allData) {
        if (level !== "allLevels") {
          const totalLevel = allData[level].success + allData[level].failure;
          allData[level].success = parseFloat(
            ((allData[level].success / totalLevel) * 100).toFixed(2)
          );
          allData[level].failure = parseFloat(
            ((allData[level].failure / totalLevel) * 100).toFixed(2)
          );
        }
      }

      // Transform data into the desired format
      const result = gameSessions.reduce(
        (acc, game) => ({
          ...acc,
          [game.game_name.toLowerCase()]: {
            allLevels: game.allLevels,
            ...Object.fromEntries(
              game.levels.map((level) => [
                level.level,
                { success: level.success, failure: level.failure },
              ])
            ),
          },
        }),
        { all: allData }
      );

      console.log(result);
      return result;
    } catch (e) {
      console.error("Error during fetching and unwinding game sessions: ", e);
    } finally {
      await client.close();
    }
  };

  myDB.getAverageMistakesData = async () => {
    const { client, db } = await connect();
    const collection = db.collection("game_sessions");
    try {
      const pipeline = [
        {
          $match: {
            user_id: { $in: ["1", "2", "3", "4", "5"] }, // Filter for specific user IDs
          },
        },
        {
          $unwind: "$game_sessions", // Unwind the game_sessions array
        },
        {
          $replaceRoot: { newRoot: "$game_sessions" }, // Make game_sessions objects the root
        },
        {
          $group: {
            // Group by game_name and level to calculate total mistakes and counts
            _id: { game_name: "$game_name", level: "$level" },
            totalMistakes: { $sum: "$total_mistakes" }, // Sum mistakes
            count: { $sum: 1 }, // Count occurrences
          },
        },
        {
          $group: {
            // Group by game_name to calculate average mistakes for all levels
            _id: "$_id.game_name",
            levels: {
              $push: {
                level: "$_id.level",
                avgMistakes: {
                  $round: [{ $divide: ["$totalMistakes", "$count"] }, 2],
                },
                count: "$count", // Include count for calculating "all" later
                totalMistakes: "$totalMistakes",
              },
            },
          },
        },
      ];

      const gameSessions = await collection.aggregate(pipeline).toArray();

      // Calculate "all" section
      const allData = {};
      let allCounts = {};
      gameSessions.forEach((game) => {
        game.levels.forEach((level) => {
          if (!allData[level.level]) {
            allData[level.level] = { totalMistakes: 0, count: 0 };
          }
          allData[level.level].totalMistakes += level.totalMistakes;
          allData[level.level].count += level.count;
        });
      });

      const allAverages = Object.fromEntries(
        Object.entries(allData).map(([level, data]) => [
          level,
          data.count > 0
            ? parseFloat((data.totalMistakes / data.count).toFixed(2))
            : 0,
        ])
      );

      // Transform gameSessions data into desired format
      const result = gameSessions.reduce(
        (acc, game) => ({
          ...acc,
          [game._id.toLowerCase()]: Object.fromEntries(
            game.levels.map((level) => [level.level, level.avgMistakes])
          ),
        }),
        { all: allAverages }
      );

      console.log(result);
      return result;
    } catch (e) {
      console.error("Error during fetching average mistakes data: ", e);
    } finally {
      await client.close();
    }
  };

  myDB.getCompletionTimeData = async () => {
    const { client, db } = await connect();
    const collection = db.collection("game_sessions");
    try {
      // Define the aggregation pipeline
      const pipeline = [
        {
          $unwind: "$game_sessions", // Unwind the game_sessions array
        },
        {
          $replaceRoot: { newRoot: "$game_sessions" }, // Flatten the game_sessions array
        },
        {
          $group: {
            // Group by game_name and level
            _id: { game_name: "$game_name", level: "$level" },
            totalDuration: { $sum: "$duration" }, // Sum the durations
            count: { $sum: 1 }, // Count the number of sessions
          },
        },
        {
          $group: {
            // Group by game_name and calculate average duration per level
            _id: "$_id.game_name",
            levels: {
              $push: {
                level: "$_id.level",
                avgDuration: {
                  $round: [{ $divide: ["$totalDuration", "$count"] }, 2],
                },
              },
            },
            totalDuration: { $sum: "$totalDuration" },
            totalCount: { $sum: "$count" },
          },
        },
        {
          $project: {
            _id: 0,
            game_name: "$_id",
            levels: {
              $arrayToObject: {
                $map: {
                  input: "$levels",
                  as: "level",
                  in: {
                    k: { $toString: "$$level.level" },
                    v: "$$level.avgDuration",
                  },
                },
              },
            },
          },
        },
      ];

      const gameSessions = await collection.aggregate(pipeline).toArray();

      // Transform into the desired format
      const result = gameSessions.reduce(
        (acc, game) => {
          acc[game.game_name.toLowerCase()] = Object.values(game.levels);
          acc.all = acc.all.map((val, idx) => val + game.levels[idx + 1] || 0);
          return acc;
        },
        { all: [0, 0, 0] } // Initialize "all" with 0 for levels 1, 2, 3
      );

      // Average out "all" levels
      result.all = result.all.map(
        (val) => +(val / gameSessions.length).toFixed(2)
      );

      console.log(result);
      return result;
    } catch (e) {
      console.error(
        "Error during fetching and calculating completion times: ",
        e
      );
    } finally {
      await client.close();
    }
  };

  myDB.getScoreDistributionData = async () => {
    const { client, db } = await connect();
    const collection = db.collection("game_sessions");
    try {
      const pipeline = [
        {
          $match: {
            user_id: { $in: ["1", "2", "3", "4", "5"] }, // Filter for specific user IDs
          },
        },
        {
          $unwind: "$game_sessions", // Unwind the game_sessions array
        },
        {
          $replaceRoot: { newRoot: "$game_sessions" }, // Make game_sessions objects the root of the output
        },
        {
          $project: {
            game_name: 1,
            level: 1,
            final_score: 1,
            scoreBucket: {
              $switch: {
                branches: [
                  { case: { $lte: ["$final_score", 20] }, then: "0-20" },
                  {
                    case: {
                      $and: [
                        { $gt: ["$final_score", 20] },
                        { $lte: ["$final_score", 40] },
                      ],
                    },
                    then: "21-40",
                  },
                  {
                    case: {
                      $and: [
                        { $gt: ["$final_score", 40] },
                        { $lte: ["$final_score", 60] },
                      ],
                    },
                    then: "41-60",
                  },
                  {
                    case: {
                      $and: [
                        { $gt: ["$final_score", 60] },
                        { $lte: ["$final_score", 80] },
                      ],
                    },
                    then: "61-80",
                  },
                  { case: { $gt: ["$final_score", 80] }, then: "81-100" },
                ],
                default: "Unknown",
              },
            },
          },
        },
        {
          $group: {
            _id: {
              game_name: "$game_name",
              level: "$level",
              bucket: "$scoreBucket",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: { game_name: "$_id.game_name", level: "$_id.level" },
            buckets: {
              $push: {
                bucket: "$_id.bucket",
                count: "$count",
              },
            },
          },
        },
        {
          $group: {
            _id: "$_id.game_name",
            allLevelsBuckets: {
              $push: { level: "$_id.level", buckets: "$buckets" },
            },
          },
        },
        {
          $project: {
            _id: 0,
            game_name: "$_id",
            allLevelsBuckets: 1,
          },
        },
      ];

      const gameSessions = await collection.aggregate(pipeline).toArray();

      // Transform the aggregated data into the desired format
      const result = gameSessions.reduce(
        (acc, game) => {
          const levelsData = game.allLevelsBuckets.reduce(
            (levelsAcc, levelData) => {
              levelsAcc[levelData.level] = levelData.buckets.reduce(
                (bucketAcc, bucket) => {
                  bucketAcc[bucket.bucket] = bucket.count;
                  return bucketAcc;
                },
                {}
              );
              return levelsAcc;
            },
            {}
          );

          acc[game.game_name.toLowerCase()] = levelsData;

          // Calculate allLevels for each game
          const allLevelsBuckets = Object.values(levelsData).reduce(
            (acc, levelBuckets) => {
              for (const [bucket, count] of Object.entries(levelBuckets)) {
                acc[bucket] = (acc[bucket] || 0) + count;
              }
              return acc;
            },
            {}
          );

          acc[game.game_name.toLowerCase()].allLevels = allLevelsBuckets;
          return acc;
        },
        { all: {} }
      );

      // Calculate overall "all" levels and breakdown
      const allData = Object.entries(result)
        .filter(([key]) => key !== "all")
        .reduce(
          (acc, [_, gameData]) => {
            // Sum the counts for all levels
            for (const level of Object.keys(gameData)) {
              if (level === "allLevels") continue;

              if (!acc[level]) acc[level] = {};

              for (const [bucket, count] of Object.entries(gameData[level])) {
                acc[level][bucket] = (acc[level][bucket] || 0) + count;
              }
            }

            // Sum the counts for allLevels
            for (const [bucket, count] of Object.entries(gameData.allLevels)) {
              acc.allLevels[bucket] = (acc.allLevels[bucket] || 0) + count;
            }

            return acc;
          },
          { allLevels: {} }
        );

      result.all = allData;

      console.log(result);
      return formatScoreDistribution(result);
    } catch (e) {
      console.error(
        "Error during fetching and calculating score distribution: ",
        e
      );
    } finally {
      await client.close();
    }
  };

  return myDB;
}

// since this is an instance of the function MyMongoDB
const myDBInstance = MyMongoDB();

export default myDBInstance;

async function testCompletionData() {
  try {
    const data = await myDBInstance.getCompletionData();
    // const data = await myDBInstance.getAverageMistakesData();
    // const data = await myDBInstance.getCompletionTimeData();
    // const data = await myDBInstance.getScoreDistributionData();
    console.log(data);
  } catch (error) {
    console.error("Failed to fetch or process data:", error);
  }
}
const completionData = {
  all: {
    allLevels: { success: 75, failure: 25 },
    1: { success: 80, failure: 20 },
    2: { success: 70, failure: 30 },
    3: { success: 65, failure: 35 },
  },
  prim: {
    allLevels: { success: 78, failure: 22 },
    1: { success: 85, failure: 15 },
    2: { success: 75, failure: 25 },
    3: { success: 60, failure: 40 },
  },
  kruskal: {
    allLevels: { success: 82, failure: 18 },
    1: { success: 90, failure: 10 },
    2: { success: 80, failure: 20 },
    3: { success: 76, failure: 24 },
  },
  heapsort: {
    allLevels: { success: 70, failure: 30 },
    1: { success: 78, failure: 22 },
    2: { success: 68, failure: 32 },
    3: { success: 65, failure: 35 },
  },
};
// console.log(completionData);
testCompletionData();
