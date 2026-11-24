const db = require('./index');

// A second counts as on-screen when at least half its frames were on-screen
const ON_SCREEN_THRESHOLD = 0.5;
// Consecutive off-screen seconds needed to count as a look-away episode
const MIN_EPISODE_SECONDS = 2;

/*
Off-task looking summary per viewing session. Each sample is one second,
so counts double as seconds. Look-away episodes are runs of consecutive
off-screen samples (gaps-and-islands over the sample order within a session).
Average video / cue-track volume (0-100) is over the samples that have it,
so it's null for sessions recorded before volume was tracked.
Pass null for userId, lectureId or sessionId to leave that filter off.
*/
async function getAttentionSessions({ userId = null, lectureId = null, sessionId = null } = {}) {
  const result = await db.query(
    `WITH s AS (
       SELECT
         user_id, lecture_id, session_id, created_at, video_volume, audio_volume,
         on_screen_ratio >= $3 AS on_screen,
         row_number() OVER (PARTITION BY session_id ORDER BY id)
           - row_number() OVER (PARTITION BY session_id, on_screen_ratio >= $3 ORDER BY id) AS run
       FROM attention_samples
       WHERE ($1::int IS NULL OR user_id = $1)
         AND ($2::int IS NULL OR lecture_id = $2)
         AND ($5::text IS NULL OR session_id = $5)
     ),
     episodes AS (
       SELECT session_id, COUNT(*) AS seconds
       FROM s
       WHERE NOT on_screen
       GROUP BY session_id, run
       HAVING COUNT(*) >= $4
     ),
     episode_stats AS (
       SELECT session_id, COUNT(*) AS episodes, AVG(seconds) AS mean_seconds, MAX(seconds) AS longest_seconds
       FROM episodes
       GROUP BY session_id
     )
     SELECT
       s.user_id AS "userId",
       s.lecture_id AS "lectureId",
       s.session_id AS "sessionId",
       COUNT(*)::int AS "secondsTracked",
       COUNT(*) FILTER (WHERE NOT s.on_screen)::int AS "offScreenSeconds",
       ROUND(100.0 * COUNT(*) FILTER (WHERE s.on_screen) / COUNT(*), 1)::float AS "onScreenPct",
       COALESCE(MAX(e.episodes), 0)::int AS "lookAwayEpisodes",
       COALESCE(ROUND(MAX(e.mean_seconds), 1), 0)::float AS "meanEpisodeSeconds",
       COALESCE(MAX(e.longest_seconds), 0)::int AS "longestEpisodeSeconds",
       ROUND(AVG(s.video_volume)::numeric, 1)::float AS "avgVideoVolume",
       ROUND(AVG(s.audio_volume)::numeric, 1)::float AS "avgAudioVolume",
       MIN(s.created_at) AS "startedAt",
       MAX(s.created_at) AS "endedAt"
     FROM s
     LEFT JOIN episode_stats e ON e.session_id = s.session_id
     GROUP BY s.user_id, s.lecture_id, s.session_id
     ORDER BY MIN(s.created_at) DESC`,
    [userId, lectureId, ON_SCREEN_THRESHOLD, MIN_EPISODE_SECONDS, sessionId]
  );

  return result.rows;
}

module.exports = { getAttentionSessions, ON_SCREEN_THRESHOLD, MIN_EPISODE_SECONDS };
