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

  // Add a game session to a user
  myDB.addGameSession = async (userId, gameSession) => {
    console.log(userId, gameSession);
    const { client, db } = await connect();
    try {
      // Convert userId to ObjectId
      const objectId = new ObjectId(userId);
      console.log(
        "Checking for existing user document with user_id:",
        objectId
      );

      // Step 1: Check if a document with the user_id exists
      const userDoc = await db
        .collection("game_sessions")
        .findOne({ user_id: objectId });

      if (!userDoc) {
        // Step 2a: If no document exists for this user_id, create a new one
        console.log(
          "No document found for this user. Creating a new document."
        );
        const newDoc = {
          user_id: objectId,
          game_sessions: [gameSession], // Initialize the game_sessions array with the new session
        };

        const response = await db.collection("game_sessions").insertOne(newDoc);
        console.log(`New document created for user ${objectId}`);
        console.log(response);
        return response;
      } else {
        // Step 2b: If a document exists, update it by pushing the new game session
        console.log("Document found for this user. Adding the game session.");
        const response = await db.collection("game_sessions").updateOne(
          { user_id: objectId }, // Find the document by user_id
          { $push: { game_sessions: gameSession } } // Push the new session into the game_sessions array
        );
        console.log(`Game session added for user ${objectId}`);
        return response;
      }
    } catch (err) {
      console.error("Error adding game session", err.message);
      return false;
    } finally {
      await client.close();
    }
  };
  // Get game sessions for a user
  myDB.getGameSessions = async (userId) => {
    const { client, db } = await connect();
    try {
      const response = await db.collection("game_sessions").findOne(
        { user_id: userId },
        { projection: { game_sessions: 1 } } // Only return game_sessions field
      );
      return response?.game_sessions || [];
    } catch (err) {
      console.error("Error retrieving game sessions", err.message);
      return [];
    } finally {
      await client.close();
    }
  };
  return myDB;
}

// since this is an instance of the function MyMongoDB
const myDBInstance = MyMongoDB();

export default myDBInstance;
