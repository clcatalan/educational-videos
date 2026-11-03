import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatDay } from '../utils/dates';

function ScheduleModal({ lecture, onClose, onSaved }) {
  const { currentUser } = useAuth();
  const [date, setDate] = useState(lecture.availableOn || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // availableOn: "YYYY-MM-DD", or null to make the lecture watchable any day
  const save = async (availableOn) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/lectures/${lecture.id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ availableOn }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save schedule');
      }
      onSaved(data.availableOn);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!date) {
      setError('Pick a date, or use "Any day" to remove the schedule');
      return;
    }
    save(date);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Schedule Lecture</h2>
          <button className="dialog-close" onClick={onClose}>✕</button>
        </div>
        <p className="dialog-subtitle">
          Participants can only watch "{lecture.title}" on this day
        </p>

        <input
          type="date"
          className="quiz-link-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          autoFocus
        />

        {error && <p className="quiz-validation-error">{error}</p>}

        <div className="dialog-actions">
          {lecture.availableOn && (
            <button className="dialog-cancel schedule-clear-button" onClick={() => save(null)} disabled={saving}>
              Any day
            </button>
          )}
          <button className="dialog-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="dialog-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/*
Sets the one day each lecture can be watched. The date is shared by every
participant; the backend withholds the video on any other day.
*/
function LectureScheduleManager() {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingLecture, setEditingLecture] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const response = await fetch('/api/lectures');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch lectures');
        }

        setLectures(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <div className="loading">Loading lectures...</div>;
  }

  if (error) {
    return <div className="error-container"><h2>{error}</h2></div>;
  }

  return (
    <div className="admin-portal-container">
      <h2>Lecture Schedule</h2>
      <p className="admin-subtitle">Set the day each lecture can be watched, for all participants</p>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Lecture</th>
              <th>Scheduled Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lectures.map(lecture => (
              <tr key={lecture.id}>
                <td>{lecture.title}</td>
                <td className="schedule-date">
                  {lecture.availableOn
                    ? formatDay(lecture.availableOn)
                    : <span className="admin-empty">Any day</span>}
                </td>
                <td>
                  <button className="quiz-edit-button" onClick={() => setEditingLecture(lecture)}>
                    {lecture.availableOn ? 'Change Date' : 'Set Date'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingLecture && (
        <ScheduleModal
          lecture={editingLecture}
          onClose={() => setEditingLecture(null)}
          onSaved={(availableOn) => {
            setLectures(prev => prev.map(l => (l.id === editingLecture.id ? { ...l, availableOn } : l)));
            setEditingLecture(null);
          }}
        />
      )}
    </div>
  );
}

export default LectureScheduleManager;
