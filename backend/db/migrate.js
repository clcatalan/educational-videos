require('dotenv').config();
const db = require('./index');

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

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      preferred_lecture_ids INTEGER[] NOT NULL DEFAULT '{}',
      preferences_set BOOLEAN NOT NULL DEFAULT false,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_lecture_ids INTEGER[] NOT NULL DEFAULT '{}'`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences_set BOOLEAN NOT NULL DEFAULT false`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS watched_lectures (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, lecture_id)
    )
  `);

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

  await db.query(`
    INSERT INTO users (username) VALUES ('P01')
    ON CONFLICT (username) DO NOTHING
  `);

  await db.query(`
    INSERT INTO users (username, is_admin) VALUES ('admin', true)
    ON CONFLICT (username) DO UPDATE SET is_admin = true
  `);

  console.log('Migration complete: lectures, users, and watched_lectures tables ready (test user "P01", admin user "admin" seeded)');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
