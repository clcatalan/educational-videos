import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function QuizLinkModal({ lectureId, initialLink, onClose, onSaved }) {
  const { currentUser } = useAuth();
  const [link, setLink] = useState(initialLink || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!link.trim()) {
      setError('A quiz link is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/quizzes/${lectureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ link: link.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save quiz link');
      }
      onSaved(data.link);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Add Quiz Link</h2>
          <button className="dialog-close" onClick={onClose}>✕</button>
        </div>
        <p className="dialog-subtitle">Paste the link to the quiz for this lecture</p>

        <input
          type="url"
          className="quiz-link-input"
          placeholder="https://..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
          autoFocus
        />

        {error && <p className="quiz-validation-error">{error}</p>}

        <div className="dialog-actions">
          <button className="dialog-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="dialog-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizManager() {
  const { currentUser } = useAuth();
  const [lectures, setLectures] = useState([]);
  const [links, setLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalLectureId, setModalLectureId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [lecturesResponse, quizzesResponse] = await Promise.all([
          fetch('/api/lectures'),
          fetch('/api/admin/quizzes', { headers: { 'x-user-id': currentUser.id } }),
        ]);

        const lecturesData = await lecturesResponse.json();

        const quizzesData = await quizzesResponse.json();
        if (!quizzesResponse.ok) {
          throw new Error(quizzesData.message || 'Failed to fetch quizzes');
        }

        const linkMap = {};
        quizzesData.forEach(quiz => { linkMap[quiz.lectureId] = quiz.link; });

        setLectures(lecturesData);
        setLinks(linkMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser.id]);

  if (loading) {
    return <div className="loading">Loading quizzes...</div>;
  }

  if (error) {
    return <div className="error-container"><h2>{error}</h2></div>;
  }

  return (
    <div className="admin-portal-container">
      <h2>Quiz Questions</h2>
      <p className="admin-subtitle">Attach a quiz link for each lecture</p>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Lecture</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lectures.map(lecture => {
              const link = links[lecture.id];
              return (
                <tr key={lecture.id}>
                  <td>{lecture.title}</td>
                  <td>
                    {link ? (
                      <span className="admin-tag">Link added</span>
                    ) : (
                      <span className="admin-empty">No link</span>
                    )}
                  </td>
                  <td>
                    <button className="quiz-edit-button" onClick={() => setModalLectureId(lecture.id)}>
                      {link ? 'Edit Quiz Link' : 'Add Quiz Link'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalLectureId !== null && (
        <QuizLinkModal
          lectureId={modalLectureId}
          initialLink={links[modalLectureId]}
          onClose={() => setModalLectureId(null)}
          onSaved={(link) => {
            setLinks(prev => ({ ...prev, [modalLectureId]: link }));
            setModalLectureId(null);
          }}
        />
      )}
    </div>
  );
}

export default QuizManager;
