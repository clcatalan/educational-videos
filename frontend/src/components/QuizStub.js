import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function QuizStub() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="lecture-player-container">
      <button className="back-button" onClick={() => navigate(`/lecture/${id}`)}>
        ← Back to Lecture
      </button>
      <h2>Quiz coming soon</h2>
      <p>The 10-question quiz for this lecture is under construction.</p>
    </div>
  );
}

export default QuizStub;
