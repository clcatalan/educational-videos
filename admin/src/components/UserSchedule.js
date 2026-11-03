import React, { useState, useEffect } from 'react';

// availableOn is a plain "YYYY-MM-DD" day; parse it as a local date so it
// isn't shifted a day by timezone the way new Date("YYYY-MM-DD") (UTC) is.
function parseDay(availableOn) {
  const [year, month, day] = availableOn.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDay(availableOn) {
  if (!availableOn) return 'Any day';

  return parseDay(availableOn).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function scheduleStatus(lecture, watchedAt) {
  if (watchedAt) return { label: 'Watched', className: 'schedule-watched' };
  if (!lecture.availableOn) return { label: 'Open', className: 'schedule-upcoming' };
  if (lecture.available) return { label: 'Today', className: 'schedule-today' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return parseDay(lecture.availableOn) > today
    ? { label: 'Upcoming', className: 'schedule-upcoming' }
    : { label: 'Missed', className: 'schedule-missed' };
}

/*
The lectures a participant will watch, in the order they become available.
Mirrors the participant app: an empty preference list means every lecture.
*/
function UserSchedule({ user, onBack }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    return <div className="loading">Loading schedule...</div>;
  }

  if (error) {
    return <div className="error-container"><h2>{error}</h2></div>;
  }

  const preferredIds = user.preferredLectureIds;
  const watchedAt = Object.fromEntries(user.watchedLectures.map(watched => [watched.id, watched.watchedAt]));

  // Dated lectures first, earliest day first; undated ones go last
  const schedule = lectures
    .filter(lecture => preferredIds.length === 0 || preferredIds.includes(lecture.id))
    .sort((a, b) => {
      if (!a.availableOn || !b.availableOn) return a.availableOn ? -1 : b.availableOn ? 1 : a.id - b.id;
      return a.availableOn.localeCompare(b.availableOn);
    });

  return (
    <div className="admin-portal-container">
      <button className="schedule-back-button" onClick={onBack}>← Back to Users</button>

      <h2>{user.username}'s Schedule</h2>
      <p className="admin-subtitle">
        {!user.preferencesSet
          ? 'Preferences not set yet, so every lecture is shown'
          : preferredIds.length === 0
            ? 'No preference, so every lecture is shown'
            : 'Lectures this participant selected, in viewing order'}
      </p>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Lecture</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 ? (
              <tr>
                <td colSpan={3}><span className="admin-empty">No lectures scheduled</span></td>
              </tr>
            ) : (
              schedule.map(lecture => {
                const status = scheduleStatus(lecture, watchedAt[lecture.id]);

                return (
                  <tr key={lecture.id}>
                    <td className="schedule-date">{formatDay(lecture.availableOn)}</td>
                    <td>{lecture.title}</td>
                    <td><span className={`schedule-status ${status.className}`}>{status.label}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserSchedule;
