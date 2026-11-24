import React from 'react';
import { Link } from 'react-router-dom';

/*
Shown as soon as the lecture ends. It can't be dismissed: the only way out
is the link to the lecture's pre-sleep quiz (/lecture/:id/pre-sleep-quiz).
*/
function QuizConfirmDialog({ lectureId }) {
  return (
    <div className="dialog-overlay">
      <div className="dialog-box" role="dialog" aria-modal="true" aria-labelledby="quiz-dialog-title">
        <div className="dialog-header">
          <h2 id="quiz-dialog-title">Take the quiz</h2>
        </div>
        <p className="dialog-subtitle">
          You've finished the lecture. Answer a short quiz to schedule your next review.
        </p>
        <div className="dialog-actions">
          <Link className="dialog-save quiz-start-link" to={`/lecture/${lectureId}/pre-sleep-quiz`} autoFocus>
            Start the quiz
          </Link>
        </div>
      </div>
    </div>
  );
}

export default QuizConfirmDialog;
