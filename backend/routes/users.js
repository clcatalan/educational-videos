const express = require("express");
const db = require("../db");
const { toUser } = require("../serializers/user");
const { learningCues } = require("../data/learningCues");
const { getAttentionSessions } = require("../db/attention");
const { qualityFromScore, nextReview, INITIAL_STATE } = require("../utils/sm2");

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
// Values per inserted row: user, lecture, session + 10 sample fields
const ATTENTION_COLUMNS = 13;

const isFiniteOrNull = value => value === null || value === undefined || Number.isFinite(value);

const isValidSample = sample =>
  sample &&
  Number.isFinite(sample.onScreenRatio) &&
  sample.onScreenRatio >= 0 &&
  sample.onScreenRatio <= 1 &&
  typeof sample.facePresent === "boolean" &&
  ["videoTime", "yaw", "pitch", "blink", "lookH", "lookV"].every(key => isFiniteOrNull(sample[key])) &&
  ["videoVolume", "audioVolume"].every(key =>
    sample[key] === null || sample[key] === undefined || (Number.isFinite(sample[key]) && sample[key] >= 0 && sample[key] <= 100)
  );

// Returns an error message for a bad batch, or null if it's fine
function validateSampleBatch(samples) {
  if (!Array.isArray(samples)) return "samples must be an array";
  if (samples.length > MAX_ATTENTION_BATCH) return `At most ${MAX_ATTENTION_BATCH} samples per batch`;
  if (!samples.every(isValidSample)) return "Invalid attention sample";
  return null;
}

async function insertAttentionSamples(userId, lectureId, sessionId, samples) {
  if (samples.length === 0) return;

  const params = [];
  const rows = samples.map((sample, i) => {
    params.push(
      userId, lectureId, sessionId,
      sample.videoTime ?? null, sample.onScreenRatio, sample.facePresent,
      sample.yaw ?? null, sample.pitch ?? null, sample.blink ?? null,
      sample.lookH ?? null, sample.lookV ?? null,
      sample.videoVolume ?? null, sample.audioVolume ?? null
    );
    const base = i * ATTENTION_COLUMNS;
    return `(${Array.from({ length: ATTENTION_COLUMNS }, (_, j) => `$${base + j + 1}`).join(", ")})`;
  });

  await db.query(
    `INSERT INTO attention_samples
     (user_id, lecture_id, session_id, video_time, on_screen_ratio, face_present, yaw, pitch, blink, look_h, look_v,
      video_volume, audio_volume)
     VALUES ${rows.join(", ")}`,
    params
  );
}

/*
Store a batch of 1-second webcam attention samples for one viewing session.
Only derived numbers are sent - no camera frames ever reach the server.
*/
router.post("/:id/attention-samples", async (req, res) => {
  try {
    const { id } = req.params;
    const { lectureId, sessionId, samples } = req.body;

    if (!lectureId || !sessionId) {
      return res.status(400).json({ message: "lectureId, sessionId and samples are required" });
    }

    const invalid = validateSampleBatch(samples);
    if (invalid) {
      return res.status(400).json({ message: invalid });
    }

    await insertAttentionSamples(id, lectureId, sessionId, samples);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to record attention samples" });
  }
});

/*
Called when the video finishes. Stores the session's last samples (sent
with this request so they can't arrive after the score is computed), then
records the session's final attention score. Re-sending replaces the score.
*/
router.post("/:id/attention-score", async (req, res) => {
  try {
    const { id } = req.params;
    const { lectureId, sessionId, samples = [] } = req.body;

    if (!lectureId || !sessionId) {
      return res.status(400).json({ message: "lectureId and sessionId are required" });
    }

    const invalid = validateSampleBatch(samples);
    if (invalid) {
      return res.status(400).json({ message: invalid });
    }

    await insertAttentionSamples(id, lectureId, sessionId, samples);

    const [session] = await getAttentionSessions({ userId: id, lectureId, sessionId });
    if (!session) {
      return res.status(404).json({ message: "No attention samples recorded for this session" });
    }

    await db.query(
      `INSERT INTO attention_scores
       (session_id, user_id, lecture_id, on_screen_pct, seconds_tracked, off_screen_seconds,
        look_away_episodes, mean_episode_seconds, longest_episode_seconds, avg_video_volume, avg_audio_volume)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (session_id) DO UPDATE SET
         on_screen_pct = EXCLUDED.on_screen_pct,
         seconds_tracked = EXCLUDED.seconds_tracked,
         off_screen_seconds = EXCLUDED.off_screen_seconds,
         look_away_episodes = EXCLUDED.look_away_episodes,
         mean_episode_seconds = EXCLUDED.mean_episode_seconds,
         longest_episode_seconds = EXCLUDED.longest_episode_seconds,
         avg_video_volume = EXCLUDED.avg_video_volume,
         avg_audio_volume = EXCLUDED.avg_audio_volume,
         completed_at = NOW()`,
      [
        sessionId, id, lectureId, session.onScreenPct, session.secondsTracked, session.offScreenSeconds,
        session.lookAwayEpisodes, session.meanEpisodeSeconds, session.longestEpisodeSeconds,
        session.avgVideoVolume, session.avgAudioVolume,
      ]
    );

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to record attention score" });
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

/*
Grade a quiz submission. answers maps questionId -> optionId and must cover
every question. phase is "pre_sleep" (default) or "post_sleep".
- pre_sleep: schedules the participant's next review with SM-2. Rejected with
  403 unless they finished the lecture (POST /:id/watched) after their
  previous pre-sleep submission for it.
- post_sleep: graded and recorded only, no SM-2. Rejected with 403 unless
  there's a pre-sleep submission newer than their last post-sleep one.
Everything is saved together, so a failed request changes nothing.
*/
router.post("/:id/quiz-attempts", async (req, res) => {
  const { id } = req.params;
  const { lectureId, answers, phase = "pre_sleep" } = req.body;

  if (!lectureId || !answers || typeof answers !== "object" || Array.isArray(answers)) {
    return res.status(400).json({ message: "lectureId and answers are required" });
  }
  if (phase !== "pre_sleep" && phase !== "post_sleep") {
    return res.status(400).json({ message: 'phase must be "pre_sleep" or "post_sleep"' });
  }

  const client = await db.getClient();
  try {
    // Correct option and all valid options for each question
    const keyResult = await client.query(
      `SELECT
         qq.id AS question_id,
         array_agg(o.id) AS option_ids,
         (array_agg(o.id) FILTER (WHERE o.is_correct))[1] AS correct_option_id
       FROM quizzes q
       JOIN quiz_questions qq ON qq.quiz_id = q.id
       JOIN quiz_question_options o ON o.question_id = qq.id
       WHERE q.lecture_id = $1
       GROUP BY qq.id`,
      [lectureId]
    );

    if (keyResult.rows.length === 0) {
      return res.status(404).json({ message: "This lecture has no quiz questions" });
    }

    const chosen = keyResult.rows.map(row => ({ ...row, optionId: Number(answers[row.question_id]) }));
    if (chosen.some(row => !row.option_ids.includes(row.optionId))) {
      return res.status(400).json({ message: "Every question needs one of its own options as an answer" });
    }

    const total = chosen.length;
    const correct = chosen.filter(row => row.optionId === row.correct_option_id).length;
    const scorePct = Math.round((1000 * correct) / total) / 10;
    const quality = qualityFromScore(scorePct);

    await client.query("BEGIN");

    // Pre-sleep: allowed once per finished viewing of the lecture.
    // Post-sleep: allowed once per pre-sleep submission.
    // Locking the watched row makes concurrent submissions wait, so the
    // second one sees the first one's attempt and is rejected.
    const gate = await client.query(
      `SELECT
         w.watched_at > COALESCE(pre.last, '-infinity') AS can_pre_sleep,
         pre.last IS NOT NULL AND pre.last > COALESCE(post.last, '-infinity') AS can_post_sleep
       FROM watched_lectures w
       CROSS JOIN LATERAL (
         SELECT MAX(submitted_at) AS last FROM quiz_attempts
         WHERE user_id = w.user_id AND lecture_id = w.lecture_id AND phase = 'pre_sleep'
       ) pre
       CROSS JOIN LATERAL (
         SELECT MAX(submitted_at) AS last FROM quiz_attempts
         WHERE user_id = w.user_id AND lecture_id = w.lecture_id AND phase = 'post_sleep'
       ) post
       WHERE w.user_id = $1 AND w.lecture_id = $2
       FOR UPDATE OF w`,
      [id, lectureId]
    );
    const allowed = gate.rows[0]?.[phase === "post_sleep" ? "can_post_sleep" : "can_pre_sleep"];
    if (!allowed) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: phase === "post_sleep"
          ? "Take the pre-sleep quiz for this lecture before the post-sleep quiz"
          : "Finish watching this lecture before taking its quiz",
      });
    }

    // Post-sleep results are recorded only; they don't touch SM-2
    if (phase === "post_sleep") {
      const attempt = await client.query(
        `INSERT INTO quiz_attempts (user_id, lecture_id, phase, correct, total, score_pct)
         VALUES ($1, $2, 'post_sleep', $3, $4, $5)
         RETURNING id`,
        [id, lectureId, correct, total, scorePct]
      );
      await client.query(
        `INSERT INTO quiz_attempt_answers (attempt_id, question_id, option_id)
         SELECT $1, unnest($2::int[]), unnest($3::int[])`,
        [attempt.rows[0].id, chosen.map(row => row.question_id), chosen.map(row => row.optionId)]
      );
      await client.query("COMMIT");
      return res.json({ phase, correct, total, scorePct });
    }

    // Locked so two submissions at once can't both start from the same state
    const previous = await client.query(
      `SELECT repetition, interval_days AS "intervalDays", easiness
       FROM lecture_reviews WHERE user_id = $1 AND lecture_id = $2 FOR UPDATE`,
      [id, lectureId]
    );
    const next = nextReview(previous.rows[0] ?? INITIAL_STATE, quality);

    const review = await client.query(
      `INSERT INTO lecture_reviews
         (user_id, lecture_id, repetition, interval_days, easiness, next_review_on, review_count, last_reviewed_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + $4::int, 1, NOW())
       ON CONFLICT (user_id, lecture_id) DO UPDATE SET
         repetition = EXCLUDED.repetition,
         interval_days = EXCLUDED.interval_days,
         easiness = EXCLUDED.easiness,
         next_review_on = EXCLUDED.next_review_on,
         review_count = lecture_reviews.review_count + 1,
         last_reviewed_at = NOW()
       RETURNING to_char(next_review_on, 'YYYY-MM-DD') AS next_review_on, review_count`,
      [id, lectureId, next.repetition, next.intervalDays, next.easiness]
    );
    const nextReviewOn = review.rows[0].next_review_on;

    const attempt = await client.query(
      `INSERT INTO quiz_attempts (user_id, lecture_id, phase, correct, total, score_pct, quality, next_review_on)
       VALUES ($1, $2, 'pre_sleep', $3, $4, $5, $6, $7::date)
       RETURNING id`,
      [id, lectureId, correct, total, scorePct, quality, nextReviewOn]
    );

    await client.query(
      `INSERT INTO quiz_attempt_answers (attempt_id, question_id, option_id)
       SELECT $1, unnest($2::int[]), unnest($3::int[])`,
      [attempt.rows[0].id, chosen.map(row => row.question_id), chosen.map(row => row.optionId)]
    );

    await client.query("COMMIT");

    res.json({
      phase,
      correct,
      total,
      scorePct,
      quality,
      nextReviewOn,
      reviewCount: review.rows[0].review_count,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    // 23503 = foreign key violation, i.e. unknown user or lecture
    if (err.code === "23503") {
      return res.status(404).json({ message: "User or lecture not found" });
    }
    res.status(500).json({ message: "Failed to record quiz attempt" });
  } finally {
    client.release();
  }
});

/*
SM-2 review state and latest quiz result for each lecture this user has
taken a quiz on, for the admin portal.
*/
router.get("/:id/reviews", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         r.lecture_id AS "lectureId",
         r.repetition,
         r.interval_days AS "intervalDays",
         r.easiness,
         to_char(r.next_review_on, 'YYYY-MM-DD') AS "nextReviewOn",
         r.review_count AS "reviewCount",
         r.last_reviewed_at AS "lastReviewedAt",
         a.correct AS "lastCorrect",
         a.total AS "lastTotal",
         a.score_pct AS "lastScorePct",
         a.quality AS "lastQuality"
       FROM lecture_reviews r
       LEFT JOIN LATERAL (
         SELECT correct, total, score_pct, quality
         FROM quiz_attempts
         WHERE user_id = r.user_id AND lecture_id = r.lecture_id AND phase = 'pre_sleep'
         ORDER BY submitted_at DESC, id DESC
         LIMIT 1
       ) a ON true
       WHERE r.user_id = $1
       ORDER BY r.lecture_id`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch lecture reviews" });
  }
});

module.exports = router;
