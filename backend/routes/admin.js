const express = require("express");
const db = require("../db");

const router = express.Router();

/*
Identifies the caller via the x-user-id header and confirms they are
an admin. This app has no session/token auth yet, so this is the same
trust level as the rest of the login system - good enough for this
demo, not for a real deployment.
*/
async function requireAdmin(req, res, next) {
  const userId = req.header("x-user-id");

  if (!userId) {
    return res.status(401).json({ message: "x-user-id header is required" });
  }

  const result = await db.query("SELECT is_admin FROM users WHERE id = $1", [userId]);

  if (result.rows.length === 0 || !result.rows[0].is_admin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
}

/*
Lists every user along with their lecture preferences and watch history,
for the admin portal.
*/
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.id,
        u.username,
        u.is_admin,
        u.preferred_lecture_ids,
        u.preferences_set,
        u.created_at,
        COALESCE(
          json_agg(
            json_build_object('id', l.id, 'title', l.title, 'watchedAt', w.watched_at)
            ORDER BY w.watched_at DESC
          ) FILTER (WHERE l.id IS NOT NULL),
          '[]'
        ) AS watched_lectures
      FROM users u
      LEFT JOIN watched_lectures w ON w.user_id = u.id
      LEFT JOIN lectures l ON l.id = w.lecture_id
      GROUP BY u.id
      ORDER BY u.id
    `);

    res.json(result.rows.map(row => ({
      id: row.id,
      username: row.username,
      isAdmin: row.is_admin,
      preferredLectureIds: row.preferred_lecture_ids,
      preferencesSet: row.preferences_set,
      createdAt: row.created_at,
      watchedLectures: row.watched_lectures,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

module.exports = router;
