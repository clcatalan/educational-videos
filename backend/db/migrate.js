require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('./index');
const { lectureCueAssignments } = require('../data/learningCues');
const lectures = require('../data/lectures');
const quizzes = require('../data/quizzes');

async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS lectures (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      instructor TEXT,
      duration TEXT,
      category TEXT,
      thumbnail TEXT,
      video_url TEXT
    )
  `);

  await db.query(`ALTER TABLE lectures ADD COLUMN IF NOT EXISTS available_on DATE`);

  // Fill in each lecture's watchable day from data/lectures.js without reseeding.
  // Only unscheduled lectures are touched, so dates set in the admin portal are kept.
  for (const lecture of lectures) {
    await db.query(
      `UPDATE lectures SET available_on = $1 WHERE id = $2 AND available_on IS NULL`,
      [lecture.availableOn ?? null, lecture.id]
    );
  }

  // Single-row table of study-wide settings. all_lectures_unlocked lets the
  // admin open every lecture regardless of its available_on date.
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      all_lectures_unlocked BOOLEAN NOT NULL DEFAULT false
    )
  `);
  await db.query(`INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      preferred_lecture_ids INTEGER[] NOT NULL DEFAULT '{}',
      preferences_set BOOLEAN NOT NULL DEFAULT false,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      study_group TEXT CHECK (study_group IN ('TMR', 'CONTROL')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_lecture_ids INTEGER[] NOT NULL DEFAULT '{}'`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences_set BOOLEAN NOT NULL DEFAULT false`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS study_group TEXT`);
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_study_group_check'
          AND conrelid = 'users'::regclass
      ) THEN
        ALTER TABLE users
          ADD CONSTRAINT users_study_group_check
          CHECK (study_group IN ('TMR', 'CONTROL'));
      END IF;
    END
    $$
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS watched_lectures (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, lecture_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cue_playback_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      playlist_id TEXT NOT NULL,
      event TEXT NOT NULL CHECK (event IN ('selected', 'play', 'pause', 'end')),
      video_time REAL,
      audio_playing BOOLEAN,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // One row per second of playback from the webcam off-task looking tracker.
  // Raw head pose / blendshape values are kept so the on-screen rule can be re-thresholded later.
  await db.query(`
    CREATE TABLE IF NOT EXISTS attention_samples (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      video_time REAL,
      on_screen_ratio REAL NOT NULL CHECK (on_screen_ratio BETWEEN 0 AND 1),
      face_present BOOLEAN NOT NULL,
      yaw REAL,
      pitch REAL,
      blink REAL,
      look_h REAL,
      look_v REAL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS attention_samples_user_lecture_idx ON attention_samples (user_id, lecture_id)`);

  // Volume the participant actually heard during that second, 0-100.
  // 0 when muted (or, for the cue track, paused). Null on older samples.
  await db.query(`ALTER TABLE attention_samples ADD COLUMN IF NOT EXISTS video_volume REAL CHECK (video_volume BETWEEN 0 AND 100)`);
  await db.query(`ALTER TABLE attention_samples ADD COLUMN IF NOT EXISTS audio_volume REAL CHECK (audio_volume BETWEEN 0 AND 100)`);

  // Final attention score for a viewing session, recorded when the video finishes.
  // Computed from attention_samples at that moment, so the samples stay the source of truth.
  await db.query(`
    CREATE TABLE IF NOT EXISTS attention_scores (
      session_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      on_screen_pct REAL NOT NULL,
      seconds_tracked INTEGER NOT NULL,
      off_screen_seconds INTEGER NOT NULL,
      look_away_episodes INTEGER NOT NULL,
      mean_episode_seconds REAL NOT NULL,
      longest_episode_seconds INTEGER NOT NULL,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`ALTER TABLE attention_scores ADD COLUMN IF NOT EXISTS avg_video_volume REAL`);
  await db.query(`ALTER TABLE attention_scores ADD COLUMN IF NOT EXISTS avg_audio_volume REAL`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS lecture_playlist (
      lecture_id INTEGER PRIMARY KEY REFERENCES lectures(id) ON DELETE CASCADE,
      playlist_id TEXT NOT NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`ALTER TABLE lecture_playlist ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW()`);
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'lecture_playlist_lecture_id_fkey'
          AND conrelid = 'lecture_playlist'::regclass
      ) THEN
        ALTER TABLE lecture_playlist
          ADD CONSTRAINT lecture_playlist_lecture_id_fkey
          FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
          NOT VALID;
      END IF;
    END
    $$
  `);

  for (const assignment of lectureCueAssignments) {
    await db.query(
      `INSERT INTO lecture_playlist (lecture_id, playlist_id)
       SELECT id, $2 FROM lectures WHERE id = $1
       ON CONFLICT (lecture_id) DO UPDATE SET playlist_id = EXCLUDED.playlist_id`,
      [assignment.lectureId, assignment.cueId]
    );
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id SERIAL PRIMARY KEY,
      lecture_id INTEGER NOT NULL UNIQUE REFERENCES lectures(id) ON DELETE CASCADE,
      link TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS link TEXT`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id SERIAL PRIMARY KEY,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS quiz_question_options (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
      option_text TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL DEFAULT false,
      position INTEGER NOT NULL
    )
  `);

  // Quiz questions for each lecture, from data/quizzes.js (keyed by lecture id).
  // A lecture whose quiz is empty or still holds the old "Question N" / "Choice N"
  // placeholders gets the real questions; a quiz with real questions is left alone.
  // Lectures without an entry in data/quizzes.js get placeholders so they can still be graded.
  const PLACEHOLDER_QUESTIONS = 20;
  const PLACEHOLDER_CHOICES = 4;
  const placeholderQuiz = Array.from({ length: PLACEHOLDER_QUESTIONS }, (_, i) => ({
    prompt: `Question ${i + 1}`,
    options: Array.from({ length: PLACEHOLDER_CHOICES }, (_, c) => `Choice ${c + 1}`),
    answer: i % PLACEHOLDER_CHOICES,
  }));
  const lectureIds = (await db.query(`SELECT id FROM lectures ORDER BY id`)).rows.map(row => row.id);

  for (const lectureId of lectureIds) {
    const quiz = await db.query(
      `INSERT INTO quizzes (lecture_id) VALUES ($1)
       ON CONFLICT (lecture_id) DO UPDATE SET lecture_id = EXCLUDED.lecture_id
       RETURNING id`,
      [lectureId]
    );
    const quizId = quiz.rows[0].id;
    const questions = quizzes[lectureId];

    const existing = await db.query(`SELECT prompt FROM quiz_questions WHERE quiz_id = $1`, [quizId]);
    const onlyPlaceholders = existing.rows.every(row => /^Question \d+$/.test(row.prompt));
    if (existing.rows.length > 0 && !(questions && onlyPlaceholders)) continue;

    // Replacing placeholders also drops answers recorded against them (cascade)
    await db.query(`DELETE FROM quiz_questions WHERE quiz_id = $1`, [quizId]);

    const source = questions || placeholderQuiz;
    for (const [i, q] of source.entries()) {
      const question = await db.query(
        `INSERT INTO quiz_questions (quiz_id, prompt, position) VALUES ($1, $2, $3) RETURNING id`,
        [quizId, q.prompt, i + 1]
      );

      for (const [c, optionText] of q.options.entries()) {
        await db.query(
          `INSERT INTO quiz_question_options (question_id, option_text, is_correct, position)
           VALUES ($1, $2, $3, $4)`,
          [question.rows[0].id, optionText, c === q.answer, c + 1]
        );
      }
    }
  }

  // SM-2 spaced repetition state per participant + lecture (see utils/sm2.js).
  // next_review_on is the next day this participant can watch the lecture.
  await db.query(`
    CREATE TABLE IF NOT EXISTS lecture_reviews (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      repetition INTEGER NOT NULL DEFAULT 0,
      interval_days INTEGER NOT NULL DEFAULT 0,
      easiness REAL NOT NULL DEFAULT 2.5,
      next_review_on DATE NOT NULL,
      review_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, lecture_id)
    )
  `);

  // Every quiz submission, with the grade and the review date it produced
  await db.query(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      correct INTEGER NOT NULL,
      total INTEGER NOT NULL,
      score_pct REAL NOT NULL,
      quality INTEGER NOT NULL CHECK (quality BETWEEN 0 AND 5),
      next_review_on DATE NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Which quiz an attempt was: the pre-sleep quiz (right after the lecture,
  // drives SM-2) or the post-sleep quiz (same questions, reordered; recorded
  // only, so it has no quality or review date). Older rows are all pre-sleep.
  await db.query(`ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'pre_sleep'`);
  await db.query(`ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_phase_check`);
  await db.query(`ALTER TABLE quiz_attempts ADD CONSTRAINT quiz_attempts_phase_check CHECK (phase IN ('pre_sleep', 'post_sleep'))`);
  await db.query(`ALTER TABLE quiz_attempts ALTER COLUMN quality DROP NOT NULL`);
  await db.query(`ALTER TABLE quiz_attempts ALTER COLUMN next_review_on DROP NOT NULL`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
      attempt_id INTEGER NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
      option_id INTEGER NOT NULL REFERENCES quiz_question_options(id) ON DELETE CASCADE,
      PRIMARY KEY (attempt_id, question_id)
    )
  `);

  await db.query(`
    INSERT INTO users (username) VALUES ('P01')
    ON CONFLICT (username) DO NOTHING
  `);

  await db.query(`
    INSERT INTO users (username, is_admin) VALUES ('admin', true)
    ON CONFLICT (username) DO UPDATE SET is_admin = true
  `);

  console.log('Migration complete: lectures, users, watched_lectures and attention_samples tables ready (test user "P01", admin user "admin" seeded)');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
