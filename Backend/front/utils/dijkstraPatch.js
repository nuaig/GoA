import myDB from "../../db/DBGameStatus.js";

(async () => {
  try {
    const result = await myDB.addMissingDijkstra();
    console.log("Patch completed:", result);
  } catch (err) {
    console.error("Patch failed:", err);
  } finally {
    process.exit();
  }
})();
