import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'lecturePreferences';

function PreferencesDialog({ onClose, onSave }) {
  const [lectures, setLectures] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setSelectedIds(stored ? JSON.parse(stored) : []);

    fetch('/api/lectures')
      .then(response => response.json())
      .then(data => {
        setLectures(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching lectures:', error);
        setLoading(false);
      });
  }, []);

  const toggleLecture = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(existingId => existingId !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
    onSave(selectedIds);
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Set Preferences</h2>
          <button className="dialog-close" onClick={onClose}>✕</button>
        </div>
        <p className="dialog-subtitle">Which of the following topics are you not familiar in?</p>

        {loading ? (
          <div className="loading">Loading lectures...</div>
        ) : (
          <ul className="dialog-lecture-list">
            {lectures.map(lecture => (
              <li key={lecture.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(lecture.id)}
                    onChange={() => toggleLecture(lecture.id)}
                  />
                  <span>{lecture.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="dialog-actions">
          <button className="dialog-cancel" onClick={onClose}>Cancel</button>
          <button className="dialog-save" onClick={handleSave}>Save Preferences</button>
        </div>
      </div>
    </div>
  );
}

export default PreferencesDialog;
