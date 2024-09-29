import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import logger from "morgan";
import cookieParser from "cookie-parser";
import session from "express-session";
import userRouter from "./Routes/userRoutes.js";
import gameSessionRouter from "./Routes/gameSessionRoutes.js";
import gameStatusRouter from "./Routes/gameStatusRoutes.js";
import passport from "passport";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger("dev"));
app.use(morgan("dev"));
app.use(cookieParser());

app.use(
  session({
    secret: "hla hla hla",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.authenticate("session"));

app.use("/api/users", userRouter);
app.use("/api/gamesessions", gameSessionRouter); // Use game session routes
app.use("/api/status", gameStatusRouter);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Server Error");
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
