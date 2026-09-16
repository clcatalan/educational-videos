const express = require("express");
const db = require("../db");
const { learningCues } = require("../data/learningCues");

const router = express.Router();

/*
Assign a playlist to a lecture
*/
router.post("/", async (req, res) => {
  try {
    const { lectureId, playlistId } = req.body;

    if (!lectureId || !playlistId) {
      return res.status(400).json({
        success: false,
        message: "lectureId and playlistId are required",
      });
    }

    if (!learningCues[playlistId]) {
      return res.status(400).json({
        success: false,
        message: "Unknown learning cue",
      });
    }

    // Insert or update assignment
    await db.query(
      `
      INSERT INTO lecture_playlist
      (lecture_id, playlist_id)
      VALUES ($1,$2)
      ON CONFLICT (lecture_id)
      DO UPDATE
      SET playlist_id = EXCLUDED.playlist_id
      `,
      [lectureId, playlistId]
    );

    res.json({
      success: true,
      message: "Playlist assigned successfully",
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to assign playlist",
    });
  }
});

/*
Get all playlist assignments
*/
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT lecture_id, playlist_id
      FROM lecture_playlist
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch assignments",
    });
  }
});

module.exports = router;
