import express from "express";
import myDB from "../db/DBUsers.js";
import LocalStrategy from "passport-local";
import crypto from "crypto";

import { insertUserCon } from "../controllers/userRouteController.js";
import passport from "passport";

const myStrategy = new LocalStrategy(async function verify(
  username,
  password,
  cb
) {
  try {
    const user = await myDB.getUserbyUsername(username);
    console.log("mystrategy", username, user);

    if (!user) {
      // User not found
      cb(null, false, { message: "Incorrect username or password" });
      return false;
    }

    console.log("found user", user);

    // Computes the hash password from the user input
    crypto.pbkdf2(
      password,
      Buffer.from(user.salt, "hex"),
      310000,
      32,
      "sha256",
      function (err, hashedPassword) {
        if (err) {
          return cb(err);
        }
        if (
          !crypto.timingSafeEqual(
            Buffer.from(user.hashedPassword, "hex"),
            hashedPassword
          )
        ) {
          console.log("passwords don't match");
          // User found but password incorrect
          cb(null, false, { message: "Incorrect username or password" });
          return false;
        }

        console.log("passwords match");
        // User found and authenticated
        cb(
          null, // error
          { id: 1, username: username }, // user object
          { message: "Hello" } // extra info
        );
      }
    );
  } catch (err) {
    cb(err);
  }
});
passport.use(myStrategy);

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

const router = express.Router();
router.route("/").post(insertUserCon);

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // Respond with a JSON message on failure
      return res.status(401).json({ error: info.message });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      // Respond with a success message or redirect on success
      return res.status(200).json({ message: "Logged in successfully" });
    });
  })(req, res, next);
});

router.get("/getUser", function (req, res) {
  console.log("getUser", req.user);
  res.status(200).json({ username: req.user?.username });
});

router.post("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.status(200).json({ username: null, msg: "Logged out", ok: true });
  });
});

export default router;
