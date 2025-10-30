const bcrypt = require("bcryptjs");
require("dotenv").config();

const express = require("express");
const app = express();
const path = require("path");
const pool = require("./db/pool");
const db = require("./db/queries");
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
//GET
// get / - all messages
// get /login - login form
//get /signup - signup form
//get /create_message - create message form
//get /member_form - membership application form
//get /private - private page for members only
//get /logout - logout user

//POST
//post /signup - process signup form - send data to db
//post /login - process login form data - authenticate user
//post /member_form - process membership application form data
//post /create_message - process create message form data

//PUT - edit ones own message
//DELETE - admin delete any message, users delete their own messages
app.get("/", async (req, res) => {
  // check if the user is authenticated
  if (req.isAuthenticated()) {
    const results = await db.getAllPostsWithUsernames();
    res.render("index", { user: req.user, posts: results });
  }

  const results = await db.getAllPosts();
  res.render("index", { user: null, posts: results });
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (username, password) VALUES ($1,$2)", [
      username,
      hashedPassword,
    ]);
    res.redirect("/login");
  } catch (err) {
    return next(err);
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.listen(PORT, (err) => {
  if (err) {
    throw err;
  }
  console.log(`Server is running on port ${PORT}`);
});
