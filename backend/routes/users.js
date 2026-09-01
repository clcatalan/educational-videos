const express = require("express");
const db = require("../db");
const { toUser } = require("../serializers/user");
const { learningCues } = require("../data/learningCues");

const router = express.Router();

router.get("/:id/latest-study", async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await db.query(
      "SELECT id, study_group FROM users WHERE id = $1",
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await db.query(
      `SELECT
         w.lecture_id AS "lectureId",
         l.title,
         q.link AS "quizUrl",
         w.watched_at AS "watchedAt",
         lp.playlist_id AS "cueId"
       FROM watched_lectures w
       JOIN lectures l ON l.id = w.lecture_id
       LEFT JOIN quizzes q ON q.lecture_id = l.id
       LEFT JOIN lecture_playlist lp ON lp.lecture_id = l.id
       WHERE w.user_id = $1
       ORDER BY w.watched_at DESC
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No watched lectures found" });
    }

    const latestStudy = result.rows[0];
    const cue = learningCues[latestStudy.cueId] ?? null;
    const cueUrl = cue
      ? `${req.protocol}://${req.get("host")}/study-audio/${encodeURIComponent(cue.filename)}`
      : null;

    res.json({
      ...latestStudy,
      cueId: cue ? latestStudy.cueId : null,
      cueUrl,
      studyGroup: userResult.rows[0].study_group,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch latest study" });
  }
});

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
