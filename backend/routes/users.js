const express = require("express");
const db = require("../db");
const { toUser } = require("../serializers/user");

const router = express.Router();

/*
Save which lectures a user is interested in. Marks the user's
preferences as set, so they won't be forced into this dialog again.
*/
router.put("/:id/preferences", async (req, res) => {
  try {
    const { id } = req.params;
    const { preferredIds } = req.body;

    if (!Array.isArray(preferredIds)) {
      return res.status(400).json({ message: "preferredIds must be an array" });
    }

    const result = await db.query(
      `UPDATE users
       SET preferred_lecture_ids = $1, preferences_set = true
       WHERE id = $2
       RETURNING *`,
      [preferredIds, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: toUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save preferences" });
  }
});

/*
Record that a user watched a lecture. Re-watching just bumps the
watched_at timestamp rather than creating duplicate entries.
*/
router.post("/:id/watched", async (req, res) => {
  try {
    const { id } = req.params;
    const { lectureId } = req.body;

    if (!lectureId) {
      return res.status(400).json({ message: "lectureId is required" });
    }

    await db.query(
      `INSERT INTO watched_lectures (user_id, lecture_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, lecture_id) DO UPDATE SET watched_at = NOW()`,
      [id, lectureId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to record watched lecture" });
  }
});

module.exports = router;
