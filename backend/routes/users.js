const express = require("express");
const db = require("../db");
const { toUser } = require("../serializers/user");
const { learningCues } = require("../data/learningCues");
const { getAttentionSessions } = require("../db/attention");

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

const CUE_EVENTS = ["selected", "play", "pause", "end"];

/*
Log which learning cue track was selected and played during a lecture.
Every event is kept as its own row so a full playback history is available.
*/
router.post("/:id/cue-logs", async (req, res) => {
  try {
    const { id } = req.params;
    const { lectureId, playlistId, event, videoTime, audioPlaying } = req.body;

    if (!lectureId || !playlistId || !event) {
      return res.status(400).json({ message: "lectureId, playlistId and event are required" });
    }

    if (!CUE_EVENTS.includes(event)) {
      return res.status(400).json({ message: "Unknown cue event" });
    }

    await db.query(
      `INSERT INTO cue_playback_logs
       (user_id, lecture_id, playlist_id, event, video_time, audio_playing)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, lectureId, playlistId, event, videoTime ?? null, audioPlaying ?? null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to record cue playback" });
  }
});

/*
Get a user's cue playback history, most recent first.
*/
router.get("/:id/cue-logs", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         c.id,
         c.lecture_id AS "lectureId",
         l.title,
         c.playlist_id AS "playlistId",
         c.event,
         c.video_time AS "videoTime",
         c.audio_playing AS "audioPlaying",
         c.created_at AS "createdAt"
       FROM cue_playback_logs c
       JOIN lectures l ON l.id = c.lecture_id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch cue playback logs" });
  }
});

const MAX_ATTENTION_BATCH = 120;
// Values per inserted row: user, lecture, session + 8 sample fields
const ATTENTION_COLUMNS = 11;

const isFiniteOrNull = value => value === null || value === undefined || Number.isFinite(value);

const isValidSample = sample =>
  sample &&
  Number.isFinite(sample.onScreenRatio) &&
  sample.onScreenRatio >= 0 &&
  sample.onScreenRatio <= 1 &&
  typeof sample.facePresent === "boolean" &&
  ["videoTime", "yaw", "pitch", "blink", "lookH", "lookV"].every(key => isFiniteOrNull(sample[key]));

/*
Store a batch of 1-second webcam attention samples for one viewing session.
Only derived numbers are sent - no camera frames ever reach the server.
*/
router.post("/:id/attention-samples", async (req, res) => {
  try {
    const { id } = req.params;
    const { lectureId, sessionId, samples } = req.body;

    if (!lectureId || !sessionId || !Array.isArray(samples)) {
      return res.status(400).json({ message: "lectureId, sessionId and samples are required" });
    }

    if (samples.length === 0) {
      return res.json({ success: true });
    }

    if (samples.length > MAX_ATTENTION_BATCH) {
      return res.status(400).json({ message: `At most ${MAX_ATTENTION_BATCH} samples per batch` });
    }

    if (!samples.every(isValidSample)) {
      return res.status(400).json({ message: "Invalid attention sample" });
    }

    const params = [];
    const rows = samples.map((sample, i) => {
      params.push(
        id, lectureId, sessionId,
        sample.videoTime ?? null, sample.onScreenRatio, sample.facePresent,
        sample.yaw ?? null, sample.pitch ?? null, sample.blink ?? null,
        sample.lookH ?? null, sample.lookV ?? null
      );
      const base = i * ATTENTION_COLUMNS;
      return `(${Array.from({ length: ATTENTION_COLUMNS }, (_, j) => `$${base + j + 1}`).join(", ")})`;
    });

    await db.query(
      `INSERT INTO attention_samples
       (user_id, lecture_id, session_id, video_time, on_screen_ratio, face_present, yaw, pitch, blink, look_h, look_v)
       VALUES ${rows.join(", ")}`,
      params
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to record attention samples" });
  }
});

/*
Off-task looking summary for each of a user's viewing sessions, most recent first.
*/
router.get("/:id/attention", async (req, res) => {
  try {
    res.json(await getAttentionSessions({ userId: req.params.id }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch attention summary" });
  }
});

/*
Raw per-second attention samples for one lecture, for export and analysis.
*/
router.get("/:id/attention/:lectureId", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         session_id AS "sessionId",
         video_time AS "videoTime",
         on_screen_ratio AS "onScreenRatio",
         face_present AS "facePresent",
         yaw,
         pitch,
         blink,
         look_h AS "lookH",
         look_v AS "lookV",
         created_at AS "createdAt"
       FROM attention_samples
       WHERE user_id = $1 AND lecture_id = $2
       ORDER BY id`,
      [req.params.id, req.params.lectureId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch attention samples" });
  }
});

module.exports = router;
