import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// "YYYY-MM-DD" as a local date (new Date("YYYY-MM-DD") would be UTC)
function formatDay(day) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Shuffle with a fixed seed, so every participant gets the same order
function seededShuffle(items, seed) {
  let state = seed >>> 0 || 1;
  const random = () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const PHASES = {
  pre_sleep: { title: 'Pre-sleep quiz' },
  post_sleep: { title: 'Post-sleep quiz' },
};

/*
A lecture's quiz, in one of two phases:
- pre_sleep (/lecture/:id/pre-sleep-quiz): reached from the dialog shown when
  the lecture ends. The backend uses SM-2 to schedule the next review.
- post_sleep (/lecture/:id/post-sleep-quiz): the same questions in a different
  (fixed per lecture) order. Graded and recorded only.
*/
function QuizPage({ phase }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [loadError, setLoadError] = useState('');
  // questionId -> chosen optionId
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [blocked, setBlocked] = useState('');

  useEffect(() => {
    setQuiz(null);
    setLoadError('');
    fetch(`/api/lectures/${id}/quiz`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('No quiz for this lecture'))))
      .then(setQuiz)
      .catch(err => setLoadError(err.message));
  }, [id]);

  const questions = useMemo(() => {
    const original = quiz?.questions ?? [];
    return phase === 'post_sleep' ? seededShuffle(original, Number(id)) : original;
  }, [quiz, phase, id]);
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/users/${currentUser.id}/quiz-attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId: Number(id), phase, answers }),
      });
      const data = await response.json();
      // Not finished the lecture since the last submission: retrying won't help
      if (response.status === 403) {
        setBlocked(data.message);
        return;
      }
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit the quiz');
      }
      setResult(data);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(`${err.message}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="error-container">
        <h2>{loadError}</h2>
        <button onClick={() => navigate('/')}>Back to Lectures</button>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="error-container">
        <h2>{blocked}</h2>
        {phase === 'post_sleep' ? (
          <button onClick={() => navigate('/')}>Back to Lectures</button>
        ) : (
          <button onClick={() => navigate(`/lecture/${id}`)}>Go to the lecture</button>
        )}
      </div>
    );
  }

  if (!quiz) {
    return <div className="loading">Loading quiz...</div>;
  }

  if (result) {
    return (
      <div className="quiz-page">
        <h2>{PHASES[phase].title} submitted</h2>
        <div className="quiz-result">
          <p className="quiz-result-score">{result.correct} / {result.total} correct</p>
          {result.nextReviewOn && (
            <p>Your next review of this lecture is on <strong>{formatDay(result.nextReviewOn)}</strong>.</p>
          )}
        </div>
        <button className="dialog-save" onClick={() => navigate('/')} autoFocus>Done</button>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <h2>{PHASES[phase].title}</h2>
      {quiz.link && (
        <p className="dialog-subtitle">
          <a href={quiz.link} target="_blank" rel="noopener noreferrer">Click on this link</a>
        </p>
      )}

      <ol className="quiz-question-list">
        {questions.map(question => (
          <li key={question.id} className="quiz-question">
            <fieldset disabled={submitting}>
              <legend>{question.prompt}</legend>
              {question.options.map(option => (
                <label key={option.id} className="quiz-choice">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    checked={answers[question.id] === option.id}
                    onChange={() => setAnswers(prev => ({ ...prev, [question.id]: option.id }))}
                  />
                  {option.text}
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ol>

      {error && <p className="quiz-error">{error}</p>}

      <div className="dialog-actions quiz-submit-row">
        <span className="quiz-progress">{answeredCount} of {questions.length} answered</span>
        <button className="dialog-save" onClick={submit} disabled={!allAnswered || submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

export default QuizPage;
