const express = require("express");
const db = require("../db");

const router = express.Router();

/*
Assign a playlist to a lecture
*/
router.post("/", async (req, res) => {
  try {
    const { lectureId, playlistId } = req.body;

    if (!lectureId || !playlistId) {
      return res.status(400).json({
        message: "lectureId and playlistId are required",
      });
    }

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
      message: "Failed to assign playlist",
    });
  }
});

module.exports = router;


