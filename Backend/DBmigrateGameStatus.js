import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

async function migrateSchema() {
  const uri = process.env.DATABASE.replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD
  );

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("users"); // Replace with your actual database name
    const collection = db.collection("game_status");

    const cursor = collection.find(); // Fetch all documents

    while (await cursor.hasNext()) {
      const doc = await cursor.next();

      // Transform the document to include 'training' and 'regular' modes
      const updatedGames = {};
      for (const game in doc.games) {
        const levels = doc.games[game];
        updatedGames[game] = {
          regular: levels, // Existing levels become part of 'regular' mode
          training: levels.map((level) => ({
            ...level,
            status: "unlocked", // Unlock all levels for training mode
            score: 0,
            stars: 0,
          })),
        };
      }

      // Update the document in the database
      await collection.updateOne(
        { _id: doc._id },
        {
          $set: { games: updatedGames },
        }
      );

      console.log(`Document with _id ${doc._id} updated.`);
    }

    console.log("Schema migration completed.");
  } catch (err) {
    console.error("Error migrating schema:", err);
  } finally {
    await client.close();
  }
}

migrateSchema();
