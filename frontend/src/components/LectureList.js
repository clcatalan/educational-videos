import React, { useState, useEffect } from 'react';
import LectureCard from './LectureCard';

function LectureList({ preferredIds = [] }) {
  const [lectures, setLectures] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLectures();
    fetchCategories();
  }, [selectedCategory]);

  const fetchLectures = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'all' 
        ? '/api/lectures' 
        : `/api/lectures?category=${selectedCategory}`;
      const response = await fetch(url);
      const data = await response.json();
      setLectures(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching lectures:', error);
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredLectures = lectures
    .filter(lecture => preferredIds.length === 0 || preferredIds.includes(lecture.id))
    .filter(lecture =>
      lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lecture.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lecture.instructor.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="lecture-list-container">
      <div className="filters-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search lectures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* <div className="category-filters">
          <button
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              className={selectedCategory === category ? 'active' : ''}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div> */}
      </div>

      {loading ? (
        <div className="loading">Loading lectures...</div>
      ) : (
        <>
          <div className="lecture-count">
            {filteredLectures.length} lecture{filteredLectures.length !== 1 ? 's' : ''} found
          </div>
          <div className="lecture-grid">
            {filteredLectures.map(lecture => (
              <LectureCard key={lecture.id} lecture={lecture} />
            ))}
          </div>
          {filteredLectures.length === 0 && (
            <div className="no-results">
              No lectures found matching your criteria.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default LectureList;
