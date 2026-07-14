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
  console.log('Migration complete: lectures table ready');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
