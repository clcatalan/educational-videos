import React from 'react';
import { useNavigate } from 'react-router-dom';

function LectureCard({ lecture }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/lecture/${lecture.id}`);
  };

  return (
    <div className="lecture-card" onClick={handleClick}>
      <div className="lecture-thumbnail">
        <img src={lecture.thumbnail} alt={lecture.title} />
        <div className="duration-badge">{lecture.duration}</div>
      </div>
      <div className="lecture-info">
        <span className="category-badge">{lecture.category}</span>
        <h3>{lecture.title}</h3>
        <p className="description">{lecture.description}</p>
        <div className="instructor">
          <span className="instructor-icon">👤</span>
          <span>{lecture.instructor}</span>
        </div>
      </div>
    </div>
  );
}

export default LectureCard;
