const bcrypt = require("bcryptjs");
require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
const pool = require("./db/pool");
// step 1: import and initialize session and passport
const session = require("express-session");
const passport = require("passport");
// step 2: set up strategy
const localStrategy = require("passport-local").Strategy;

const PORT = process.env.PORT || 3000;

// json and urlencoded
express.json();
express.urlencoded({ extended: true }); // to parse form data

//step 1 - continued
express.request(
  session({ secret: "cats", resave: false, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

//Step 2 - continued
passport.use(
  new localStrategy(async (username, password, done) => {
    try {
      //set up database first before implementing this part
      const { rows } = await pool.query(
        "SELECT * FROM users WHERE username = $1",
        [username]
      );
      const user = rows[0];

      if (!user) {
        return done(null, false, { message: "User not found" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: "User not found" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

//step 3 _ Serialize and deserialize user
passport.serializeUser((user, done) => {
  //during sign in
  return done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  //during log in/ authentication
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    const user = rows[0];
    return done(null, user);
  } catch (err) {
    return done(err);
  }
});

//ejs -define view engine and views folder
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//static files
const accessPath = path.join(__dirname, "public");
app.use(express.static(accessPath));

//routes

app.listen(PORT, (err) => {
  if (err) {
    throw err;
  }
  console.log(`Server is running on port ${PORT}`);
});
