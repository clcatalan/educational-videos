const express = require("express");
const db = require("../db");
const { toUser } = require("../serializers/user");

const router = express.Router();

/*
Log in with a username. No password check yet - this platform only
supports username-based login for now.
*/
router.post("/login", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "username is required" });
    }

    const result = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid username" });
    }

    res.json({ user: toUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to log in" });
  }
});

/*
Register a new username.
*/
router.post("/register", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "username is required" });
    }

    const existing = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Username is already taken" });
    }

    const result = await db.query(
      "INSERT INTO users (username) VALUES ($1) RETURNING *",
      [username]
    );

    res.status(201).json({ user: toUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to register" });
  }
});

module.exports = router;
