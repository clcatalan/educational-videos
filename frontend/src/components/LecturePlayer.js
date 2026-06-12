import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function LecturePlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLecture();
  }, [id]);

  const fetchLecture = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lectures/${id}`);
      if (!response.ok) {
        throw new Error('Lecture not found');
      }
      const data = await response.json();
      setLecture(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching lecture:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading lecture...</div>;
  }

  if (!lecture) {
    return (
      <div className="error-container">
        <h2>Lecture not found</h2>
        <button onClick={() => navigate('/')}>Back to Lectures</button>
      </div>
    );
  }

  return (
    <div className="lecture-player-container">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Back to Lectures
      </button>
      
      <div className="player-content">
        <div className="video-wrapper">
          <iframe
            src={lecture.videoUrl}
            title={lecture.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        
        <div className="lecture-details">
          <div className="lecture-header">
            <div>
              <span className="category-badge">{lecture.category}</span>
              <h1>{lecture.title}</h1>
            </div>
            <div className="duration-large">⏱️ {lecture.duration}</div>
          </div>
          
          <div className="instructor-info">
            <span className="instructor-icon">👤</span>
            <div>
              <strong>Instructor</strong>
              <p>{lecture.instructor}</p>
            </div>
          </div>
          
          <div className="description-section">
            <h3>About this lecture</h3>
            <p>{lecture.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LecturePlayer;
