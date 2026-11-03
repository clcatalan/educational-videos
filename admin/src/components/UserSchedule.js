import React, { useState, useEffect } from 'react';
import { parseDay, formatDay } from '../utils/dates';

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

// Combines every viewing session of a lecture into one off-task looking
// summary from the webcam tracker, keyed by lecture id
function attentionByLecture(sessions) {
  const totals = {};

  for (const session of sessions) {
    const total = totals[session.lectureId] ?? { secondsTracked: 0, offScreenSeconds: 0, lookAwayEpisodes: 0 };

    total.secondsTracked += session.secondsTracked;
    total.offScreenSeconds += session.offScreenSeconds;
    total.lookAwayEpisodes += session.lookAwayEpisodes;
    totals[session.lectureId] = total;
  }

  for (const total of Object.values(totals)) {
    total.onScreenPct = Math.round(1000 * (1 - total.offScreenSeconds / total.secondsTracked)) / 10;
  }

  return totals;
}

function AttentionScore({ attention }) {
  if (!attention) return <span className="admin-empty">Not tracked</span>;

  const minutes = Math.round(attention.secondsTracked / 60);
  const lookAways = `${attention.lookAwayEpisodes} look-away${attention.lookAwayEpisodes === 1 ? '' : 's'}`;

  return (
    <>
      <span className="attention-score">{attention.onScreenPct}%</span>
      <span className="attention-detail">{lookAways} · {minutes}m tracked</span>
    </>
  );
}

/*
The lectures a participant will watch, in the order they become available.
Mirrors the participant app: an empty preference list means every lecture.
*/
function UserSchedule({ user, onBack }) {
  const [lectures, setLectures] = useState([]);
  const [attention, setAttention] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [lecturesResponse, attentionResponse] = await Promise.all([
          fetch('/api/lectures'),
          fetch(`/api/users/${user.id}/attention`),
        ]);

        const lecturesData = await lecturesResponse.json();
        if (!lecturesResponse.ok) {
          throw new Error(lecturesData.message || 'Failed to fetch lectures');
        }

        setLectures(lecturesData);

        // Scores are optional here; the schedule still shows if they fail
        try {
          if (!attentionResponse.ok) {
            throw new Error(`HTTP ${attentionResponse.status}`);
          }
          setAttention(attentionByLecture(await attentionResponse.json()));
        } catch (err) {
          console.error('Failed to fetch attention scores:', err);
          setAttention(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user.id]);

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
              <th>Lecture</th>
              <th>Scheduled Date</th>
              <th>Status</th>
              <th>Attention Score</th>
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 ? (
              <tr>
                <td colSpan={4}><span className="admin-empty">No lectures scheduled</span></td>
              </tr>
            ) : (
              schedule.map(lecture => {
                const status = scheduleStatus(lecture, watchedAt[lecture.id]);

                return (
                  <tr key={lecture.id}>
                    <td>{lecture.title}</td>
                    <td className="schedule-date">{formatDay(lecture.availableOn)}</td>
                    <td><span className={`schedule-status ${status.className}`}>{status.label}</span></td>
                    <td>
                      {attention === null
                        ? <span className="admin-empty">Unavailable</span>
                        : <AttentionScore attention={attention[lecture.id]} />}
                    </td>
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
