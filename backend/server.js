const express = require('express');
const cors = require('cors');
const lectures = require('./data/lectures');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Educational Lecture Platform API' });
});

// Get all lectures
app.get('/api/lectures', (req, res) => {
  const { category } = req.query;
  
  if (category && category !== 'all') {
    const filteredLectures = lectures.filter(
      lecture => lecture.category.toLowerCase() === category.toLowerCase()
    );
    return res.json(filteredLectures);
  }
  
  res.json(lectures);
});

// Get lecture by ID
app.get('/api/lectures/:id', (req, res) => {
  const lecture = lectures.find(l => l.id === parseInt(req.params.id));
  
  if (!lecture) {
    return res.status(404).json({ message: 'Lecture not found' });
  }
  
  res.json(lecture);
});

// Get all categories
app.get('/api/categories', (req, res) => {
  const categories = [...new Set(lectures.map(lecture => lecture.category))];
  res.json(categories);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
