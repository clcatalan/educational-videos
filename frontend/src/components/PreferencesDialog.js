import React, { useState, useEffect } from 'react';

function PreferencesDialog({ onClose, onSave, initialSelectedIds = [], forced = false }) {
  const [lectures, setLectures] = useState([]);
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedIds);
    } finally {
      setSaving(false);
    }
  };

  const dismiss = forced ? undefined : onClose;

  return (
    <div className="dialog-overlay" onClick={dismiss}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Set Preferences</h2>
          {!forced && <button className="dialog-close" onClick={onClose}>✕</button>}
        </div>
        <p className="dialog-subtitle">
          {forced
            ? 'Welcome! select the following topics you are not familiar in to help us recommend lectures for you.'
            : 'Which of the following topics are you not familiar in?'}
        </p>

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
          {!forced && <button className="dialog-cancel" onClick={onClose}>Cancel</button>}
          <button className="dialog-save" onClick={handleSave} disabled={saving || (forced && selectedIds.length === 0)}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreferencesDialog;
