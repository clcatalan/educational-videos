require('dotenv').config();
const db = require('./index');
const lectures = require('../data/lectures');

async function seed() {
  await db.query('TRUNCATE lectures RESTART IDENTITY');

  for (const lecture of lectures) {
    await db.query(
      `INSERT INTO lectures (id, title, description, instructor, duration, category, thumbnail, video_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        lecture.id,
        lecture.title,
        lecture.description,
        lecture.instructor,
        lecture.duration,
        lecture.category,
        lecture.thumbnail,
        lecture.videoUrl,
      ]
    );
  }

  await db.query(`SELECT setval('lectures_id_seq', (SELECT MAX(id) FROM lectures))`);

  console.log(`Seed complete: inserted ${lectures.length} lectures`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
