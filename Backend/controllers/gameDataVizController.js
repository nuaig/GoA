import myDB from "../db/DBDataViz.js";

export const getAllVizDataCon = async (req, res) => {
  try {
    // Fetch all data concurrently
    const [
      completionData,
      avgMistakesData,
      completionTimeData,
      scoreDistributionData,
      avgMistakeReduction,
    ] = await Promise.all([
      myDB.getCompletionData(),
      myDB.getAverageMistakesData(),
      myDB.getCompletionTimeData(),
      myDB.getScoreDistributionData(),
      myDB.getAverageMistakeReduction(),
    ]);

    // Combine all results into one response
    const combinedData = {
      completionData,
      avgMistakesData,
      completionTimeData,
      scoreDistributionData,
      avgMistakeReduction,
    };

    res.status(200).json({ ok: true, data: combinedData });
  } catch (e) {
    console.error("Error from getAllVizDataCon:", e.message);
    res
      .status(500)
      .json({ ok: false, msg: "Error fetching visualization data" });
  }
};

export const getAllVizDataIndiUserCon = async (req, res) => {
  try {
    const userId = req.params.userId; // Get user ID from request params

    if (!userId) {
      return res.status(400).json({ ok: false, msg: "User ID is required" });
    }

    // 🔄 Fetch all user-specific visualization data concurrently
    const [
      mistakeData,
      scoreData,
      completionTimeData,
      trialsData,
      mistakeReductionData,
      completionPercentageData,
    ] = await Promise.all([
      myDB.getMistakeDataForUser(userId),
      myDB.getScoreDataForUser(userId),
      myDB.getCompletionTimeDataForUser(userId),
      myDB.getTrialsDataForUser(userId),
      myDB.getMistakeReductionDataForUser(userId),
      myDB.getCompletionPercentageDataUser(userId),
    ]);

    // 🎯 Combine all results into a structured response
    const combinedData = {
      mistakeData,
      scoreData,
      completionTimeData,
      trialsData,
      mistakeReductionData,
      completionPercentageData,
    };

    console.log(
      `✅ Retrieved Individual Viz Data for User (${userId}):`,
      combinedData
    );

    res.status(200).json({ ok: true, data: combinedData });
  } catch (e) {
    console.error(
      `❌ Error fetching individual visualization data for User (${req.params.userId}):`,
      e.message
    );
    res
      .status(500)
      .json({ ok: false, msg: "Error fetching user visualization data" });
  }
};
