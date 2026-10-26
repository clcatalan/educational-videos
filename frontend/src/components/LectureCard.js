import React from 'react';
import { useNavigate } from 'react-router-dom';
import { availabilityMessage } from '../utils/lectureAvailability';

function LectureCard({ lecture }) {
  const navigate = useNavigate();
  const lockedMessage = availabilityMessage(lecture);

  const handleClick = () => {
    // Lectures can only be opened on their scheduled day
    if (lockedMessage) return;
    navigate(`/lecture/${lecture.id}`);
  };

  return (
    <div className={`lecture-card ${lockedMessage ? 'locked' : ''}`} onClick={handleClick}>
      <div className="lecture-thumbnail">
        <img src={lecture.thumbnail} alt={lecture.title} />
        <div className="duration-badge">{lecture.duration}</div>
        {lockedMessage && (
          <div className="locked-overlay">🔒 {lockedMessage}</div>
        )}
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
