const bcrypt = require("bcryptjs");
require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
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
passport.initialize();
passport.session();

//Step 2 - continued
passport.use(
  new localStrategy(async (username, password, done) => {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      //set up database first before implementing this part
    } catch (err) {
      console.error(err);
    }
  })
);

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
