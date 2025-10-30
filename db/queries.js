const pool = require("./pool");

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

//GET QUERIES
const getAllPosts = async () => {
  const { rows } = await pool.query(
    "SELECT message FROM posts ORDER BY timestamp DESC"
  );
  return rows;
};

const getUserById = async (userId) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
    userId,
  ]);
  return rows[0];
};

const getAllPostsByUserId = async (userId) => {
  //posts.message, users.username, posts.timestamp - if membership is added later, we can join that too
  const { rows } = await pool.query(
    "SELECT users.username, posts.message FROM posts Join users On posts.user_id = $1",
    [userId]
  );
  return rows;
};
// for members only
const getUserByUsername = async (username) => {
  //users.username, posts.message, posts.timestamp
  const { rows } = await pool.query(
    "SELECT users.username, posts.message posts.timestamp FROM users Join posts On users.username=$1",
    [username]
  );
  return rows;
};
//for members only - all posts with usernames and timestamps
const getAllPostsWithUsernames = async () => {
  //users.username, posts.message, posts.timestamp
  const { rows } = await pool.query(
    "SELECT users.username, posts.message, posts.created_at FROM users Join posts On users.id=posts.user_id ORDER BY posts.timestamp DESC"
  );
  return rows;
};

//POST QUERIES

module.exports = {
  getAllPosts,
  getUserById,
  getAllPostsByUserId,
  getUserByUsername,
  getAllPostsWithUsernames,
};
