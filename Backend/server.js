import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import userRouter from "./Routes/userRoutes.js";
import gameSessionRouter from "./Routes/gameSessionRoutes.js";
import gameStatusRouter from "./Routes/gameStatusRoutes.js";
import passport from "passport";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(cookieParser());

app.use(
  session({
    secret: "hla hla hla",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      sameSite: "lax", // 'lax' or 'strict' since no CORS is used
    },
  })
);

// Serve static files from 'front' directory
app.use(express.static(path.join(__dirname, "front/dist")));
app.use(passport.authenticate("session"));

// API routes
app.use("/api/users", userRouter);
app.use("/api/gamesessions", gameSessionRouter);
app.use("/api/status", gameStatusRouter);

// Default route for serving index.html at root
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "front/dist", "index.html"));
});

// Optional: Custom 404 handling
app.use((req, res, next) => {
  res.status(404).send("Page Not Found");
});

// Optional: Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Server Error");
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
