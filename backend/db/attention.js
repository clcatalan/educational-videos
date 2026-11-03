const db = require('./index');

// A second counts as on-screen when at least half its frames were on-screen
const ON_SCREEN_THRESHOLD = 0.5;
// Consecutive off-screen seconds needed to count as a look-away episode
const MIN_EPISODE_SECONDS = 2;

/*
Off-task looking summary per viewing session. Each sample is one second,
so counts double as seconds. Look-away episodes are runs of consecutive
off-screen samples (gaps-and-islands over the sample order within a session).
Pass null for userId or lectureId to leave that filter off.
*/
async function getAttentionSessions({ userId = null, lectureId = null } = {}) {
  const result = await db.query(
    `WITH s AS (
       SELECT
         user_id, lecture_id, session_id, created_at,
         on_screen_ratio >= $3 AS on_screen,
         row_number() OVER (PARTITION BY session_id ORDER BY id)
           - row_number() OVER (PARTITION BY session_id, on_screen_ratio >= $3 ORDER BY id) AS run
       FROM attention_samples
       WHERE ($1::int IS NULL OR user_id = $1)
         AND ($2::int IS NULL OR lecture_id = $2)
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
       MIN(s.created_at) AS "startedAt",
       MAX(s.created_at) AS "endedAt"
     FROM s
     LEFT JOIN episode_stats e ON e.session_id = s.session_id
     GROUP BY s.user_id, s.lecture_id, s.session_id
     ORDER BY MIN(s.created_at) DESC`,
    [userId, lectureId, ON_SCREEN_THRESHOLD, MIN_EPISODE_SECONDS]
  );

  return result.rows;
}

module.exports = { getAttentionSessions, ON_SCREEN_THRESHOLD, MIN_EPISODE_SECONDS };
