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

const toLecture = row => ({
  id: row.id,
  title: row.title,
  description: row.description,
  instructor: row.instructor,
  duration: row.duration,
  category: row.category,
  thumbnail: row.thumbnail,
  videoUrl: row.video_url,
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
      ? await db.query('SELECT * FROM lectures WHERE category ILIKE $1 ORDER BY id', [category])
      : await db.query('SELECT * FROM lectures ORDER BY id');

    res.json(result.rows.map(toLecture));
  } catch (error) {
    console.error('Error fetching lectures:', error);
    res.status(500).json({ message: 'Failed to fetch lectures' });
  }
});

// Get lecture by ID
app.get('/api/lectures/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM lectures WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    res.json(toLecture(result.rows[0]));
  } catch (error) {
    console.error('Error fetching lecture:', error);
    res.status(500).json({ message: 'Failed to fetch lecture' });
  }
});

// Check whether a lecture has an associated quiz
app.get('/api/lectures/:id/quiz', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM quizzes WHERE lecture_id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No quiz for this lecture' });
    }

    res.json({ id: result.rows[0].id, lectureId: result.rows[0].lecture_id, link: result.rows[0].link });
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



