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
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // to parse form data

//step 1 - continued
app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
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
app.get("/debug", async (req, res) => {
  try {
    const posts = await db.getAllPostsWithUsernames();
    res.send(posts);
  } catch (err) {
    res.send(err.message);
  }
});

app.get("/", async (req, res) => {
  try {
    let results;
    //check if user is authenticated
    if (req.isAuthenticated() && req.user.is_member) {
      results = await db.getAllPostsWithUsernames(); //array of objects [{username: '...', message: '...', timestamp: '...'}, {...}]
    } else {
      results = await db.getAllPosts(); // array of objects [{message: '...'}, {...}]
    }

    // console.log(results); // now logs real rows array ✅

    res.render("index", { user: req.user || null, posts: results });
  } catch (err) {
    console.error(err);
    res.status(500).send({ err: err.message });
  }
});
app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res, next) => {
  try {
    const { username, password, confirm_pass } = req.body;

    if (password !== confirm_pass) {
      return res.render("signup", { message: "Passwords do not match" });
    }

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

app.get("/create_message", (req, res) => {
  res.render("create_message", { user: req.user });
});

app.post("/create_message", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.redirect("/login");
  }
  const user = req.user;
  const userId = user.id;
  const { message } = req.body;
  await db.createPost(userId, message);
  res.redirect("/");
});

app.get("/member_form", (req, res) => {
  res.render("member_form");
});

app.post("/member_form", async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const { membership_password } = req.body;

    const user = req.user;
    const userId = user.id;
    if (membership_password === process.env.MEMBERSHIP_PASSWORD) {
      await pool.query("UPDATE users SET is_member = true WHERE users.id=$1", [
        userId,
      ]);
      res.redirect("/");
    } else {
      res.status(401).send("Incorrect membership password");
    }
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

app.get("/search_users", async (req, res) => {
  try {
    const { search_query } = req.query;
    if (!search_query) {
      //if empty or null or undefined
      return res.redirect("/");
    }
    const results = await db.getUserByUsername(search_query);
    if (!results || results.length === 0) {
      return res.render("search_results", { found: false, posts: null });
    }
    const search_results = {
      username: results[0].username,
      posts: results.map((post) => ({
        message: post.message,
        timestamp: post.timestamp,
      })),
    };

    res.render("search_results", { found: true, posts: search_results });

    // console.log(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Server listens for connection

app.listen(PORT, (err) => {
  if (err) {
    throw err;
  }
  console.log(`Server is running on port ${PORT}`);
});
