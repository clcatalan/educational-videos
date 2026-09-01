require('dotenv').config();
const db = require('./index');
const lectures = require('../data/lectures');
const { lectureCueAssignments } = require('../data/learningCues');

async function seed() {
  await db.query('TRUNCATE lectures RESTART IDENTITY CASCADE');

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

  for (const assignment of lectureCueAssignments) {
    await db.query(
      `INSERT INTO lecture_playlist (lecture_id, playlist_id)
       VALUES ($1, $2)
       ON CONFLICT (lecture_id) DO UPDATE SET playlist_id = EXCLUDED.playlist_id`,
      [assignment.lectureId, assignment.cueId]
    );
  }

  console.log(`Seed complete: inserted ${lectures.length} lectures and ${lectureCueAssignments.length} cue assignments`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
