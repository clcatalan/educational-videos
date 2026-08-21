import React from 'react';

function QuizConfirmDialog({ quizLink, onConfirm, onDecline }) {
  return (
    <div className="dialog-overlay" onClick={onDecline}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Take the quiz</h2>
          <button className="dialog-close" onClick={onDecline}>✕</button>
        </div>
        <p className="dialog-subtitle">
          {quizLink && (
            <a href={quizLink} target="_blank" rel="noopener noreferrer">Click on this link</a>
          )}
        </p>
        {/* <div className="dialog-actions">
          <button className="dialog-cancel" onClick={onDecline}>No Thanks</button>
          <button className="dialog-save" onClick={onConfirm}>Yes, Let's Go</button>
        </div> */}
      </div>
    </div>
  );
}

export default QuizConfirmDialog;
