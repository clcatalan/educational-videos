require('dotenv').config();
const playlistRoutes = require("./routes/playlists");
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const sleepStageRoutes = require("./routes/sleepStage");

const app = express();
const PORT = process.env.PORT || 5001;
const assignmentRoutes = require("./routes/assignments");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");

// Middleware
app.use(cors());
app.use(express.json());
app.use('/study-audio', express.static(
  path.resolve(__dirname, '../frontend/public/audio'),
  { dotfiles: 'deny', fallthrough: false, index: false }
));
app.use("/api/sleep-stage", sleepStageRoutes);

/*
When is a lecture watchable?
- Everything is, while the admin has unlocked all lectures (app_settings).
- Once a participant has taken its quiz, from their SM-2 next_review_on day
  onward (lecture_reviews; overdue reviews stay open).
- Before that, only on the admin's available_on day (no date = always).
$1 is the participant's id, or null (e.g. the admin portal) for the admin dates only.
Dates are formatted in SQL so they aren't shifted by JS timezone handling.
*/
const LECTURE_SELECT = `
  SELECT
    l.*,
    to_char(COALESCE(r.next_review_on, l.available_on), 'YYYY-MM-DD') AS available_on_text,
    COALESCE(r.review_count, 0) AS review_count,
    (
      COALESCE((SELECT all_lectures_unlocked FROM app_settings WHERE id = 1), false)
      OR CASE
        WHEN r.next_review_on IS NOT NULL THEN r.next_review_on <= CURRENT_DATE
        ELSE l.available_on IS NULL OR l.available_on = CURRENT_DATE
      END
    ) AS available
  FROM lectures l
  LEFT JOIN lecture_reviews r ON r.lecture_id = l.id AND r.user_id = $1::int
`;

// The participant viewing the lectures, from the optional x-user-id header
const viewerId = req => {
  const id = req.header('x-user-id');
  return /^\d+$/.test(id ?? '') ? Number(id) : null;
};

const toLecture = row => ({
  id: row.id,
  title: row.title,
  description: row.description,
  instructor: row.instructor,
  duration: row.duration,
  category: row.category,
  thumbnail: row.thumbnail,
  // Withheld outside the lecture's day so it can't be played early or late
  videoUrl: row.available ? row.video_url : null,
  // The participant's next review day once they've taken the quiz, else the admin's date
  availableOn: row.available_on_text,
  available: row.available,
  reviewCount: row.review_count,
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Educational Lecture Platform API' });
});

// Get all lectures
app.get('/api/lectures', async (req, res) => {
  try {
    const { category } = req.query;

    const result = category && category !== 'all'
      ? await db.query(`${LECTURE_SELECT} WHERE l.category ILIKE $2 ORDER BY l.id`, [viewerId(req), category])
      : await db.query(`${LECTURE_SELECT} ORDER BY l.id`, [viewerId(req)]);

    res.json(result.rows.map(toLecture));
  } catch (error) {
    console.error('Error fetching lectures:', error);
    res.status(500).json({ message: 'Failed to fetch lectures' });
  }
});

// Get lecture by ID
app.get('/api/lectures/:id', async (req, res) => {
  try {
    const result = await db.query(`${LECTURE_SELECT} WHERE l.id = $2`, [viewerId(req), req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    res.json(toLecture(result.rows[0]));
  } catch (error) {
    console.error('Error fetching lecture:', error);
    res.status(500).json({ message: 'Failed to fetch lecture' });
  }
});

// A lecture's quiz: its link and questions. Correct answers are never sent;
// grading happens in POST /api/users/:id/quiz-attempts.
app.get('/api/lectures/:id/quiz', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM quizzes WHERE lecture_id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No quiz for this lecture' });
    }

    const quiz = result.rows[0];
    const questions = await db.query(
      `SELECT
         qq.id,
         qq.prompt,
         json_agg(json_build_object('id', o.id, 'text', o.option_text) ORDER BY o.position) AS options
       FROM quiz_questions qq
       JOIN quiz_question_options o ON o.question_id = qq.id
       WHERE qq.quiz_id = $1
       GROUP BY qq.id
       ORDER BY qq.position`,
      [quiz.id]
    );

    res.json({ id: quiz.id, lectureId: quiz.lecture_id, link: quiz.link, questions: questions.rows });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ message: 'Failed to fetch quiz' });
  }
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT category FROM lectures ORDER BY category');
    res.json(result.rows.map(row => row.category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

app.use("/api/playlists", playlistRoutes);
app.use("/api/assignments", assignmentRoutes);
console.log("Assignments route loaded");
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});



