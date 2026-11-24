import React, { useState, useEffect } from 'react';
import { parseDay, formatDay } from '../utils/dates';

function scheduleStatus(lecture, watchedAt) {
  // After the first quiz, availableOn is the participant's SM-2 review day
  if (lecture.reviewCount > 0) {
    return lecture.available
      ? { label: 'Review due', className: 'schedule-today' }
      : { label: 'Review scheduled', className: 'schedule-upcoming' };
  }
  if (watchedAt) return { label: 'Watched', className: 'schedule-watched' };
  if (!lecture.availableOn) return { label: 'Open', className: 'schedule-upcoming' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lecture.available) {
    // Available on a day other than its scheduled one means all lectures are unlocked
    return parseDay(lecture.availableOn).getTime() === today.getTime()
      ? { label: 'Today', className: 'schedule-today' }
      : { label: 'Unlocked', className: 'schedule-upcoming' };
  }

  return parseDay(lecture.availableOn) > today
    ? { label: 'Upcoming', className: 'schedule-upcoming' }
    : { label: 'Missed', className: 'schedule-missed' };
}

// Most recent viewing session per lecture, keyed by lecture id.
// Sessions arrive newest first, so the first one seen for a lecture is its latest.
function latestSessionByLecture(sessions) {
  const latest = {};

  for (const session of sessions) {
    latest[session.lectureId] ??= session;
  }

  return latest;
}

const formatTimestamp = (timestamp) =>
  new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function NextDate({ lecture }) {
  if (!lecture.availableOn) return <span className="admin-empty">Any day</span>;

  return (
    <>
      <span className="attention-score">{formatDay(lecture.availableOn)}</span>
      <span className="attention-detail">
        {lecture.reviewCount > 0 ? `Review ${lecture.reviewCount + 1}` : 'First viewing'}
      </span>
    </>
  );
}

function LastQuiz({ review }) {
  if (!review) return <span className="admin-empty">Not taken yet</span>;

  return (
    <>
      <span className="attention-score">
        {review.lastCorrect}/{review.lastTotal} ({review.lastScorePct}%)
      </span>
      <span className="attention-detail">
        Grade {review.lastQuality} of 5 · {formatTimestamp(review.lastReviewedAt)}
      </span>
    </>
  );
}

function LastAttention({ session }) {
  if (!session) return <span className="admin-empty">Not tracked yet</span>;

  const minutes = Math.round(session.secondsTracked / 60);
  const lookAways = `${session.lookAwayEpisodes} look-away${session.lookAwayEpisodes === 1 ? '' : 's'}`;

  return (
    <>
      <span className="attention-score">{session.onScreenPct}% on screen</span>
      <span className="attention-detail">
        {lookAways} · {minutes}m tracked · {formatTimestamp(session.startedAt)}
      </span>
    </>
  );
}

// Average volume (0-100) heard during the last session
function AverageVolume({ session, field, muteLabel }) {
  if (!session) return <span className="admin-empty">Not tracked yet</span>;

  const volume = session[field];
  if (volume === null || volume === undefined) return <span className="admin-empty">Not recorded</span>;

  return (
    <>
      <span className="attention-score">{volume}%</span>
      <span className="attention-detail">{muteLabel}</span>
    </>
  );
}

// Shows "Unavailable" when that part of the data failed to load
const orUnavailable = (data, render) =>
  data === null ? <span className="admin-empty">Unavailable</span> : render(data);

/*
The lectures a participant will watch, in the order they become available.
Mirrors the participant app: an empty preference list means every lecture.
*/
function UserSchedule({ user, onBack }) {
  const [lectures, setLectures] = useState([]);
  const [attention, setAttention] = useState({});
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [lecturesResponse, attentionResponse, reviewsResponse] = await Promise.all([
          // As this participant, so dates include their SM-2 review days
          fetch('/api/lectures', { headers: { 'x-user-id': user.id } }),
          fetch(`/api/users/${user.id}/attention`),
          fetch(`/api/users/${user.id}/reviews`),
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
          setAttention(latestSessionByLecture(await attentionResponse.json()));
        } catch (err) {
          console.error('Failed to fetch attention scores:', err);
          setAttention(null);
        }

        try {
          if (!reviewsResponse.ok) {
            throw new Error(`HTTP ${reviewsResponse.status}`);
          }
          const reviewsData = await reviewsResponse.json();
          setReviews(Object.fromEntries(reviewsData.map(review => [review.lectureId, review])));
        } catch (err) {
          console.error('Failed to fetch quiz reviews:', err);
          setReviews(null);
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

      {schedule.length === 0 ? (
        <div className="admin-table-wrapper">
          <span className="admin-empty">No lectures scheduled</span>
        </div>
      ) : (
        <div className="lecture-schedule-list">
          {schedule.map(lecture => {
            const status = scheduleStatus(lecture, watchedAt[lecture.id]);

            return (
              <section key={lecture.id} className="admin-table-wrapper lecture-schedule-card">
                <div className="lecture-schedule-header">
                  <h3>{lecture.title}</h3>
                  <span className={`schedule-status ${status.className}`}>{status.label}</span>
                </div>

                <table className="admin-table lecture-schedule-table">
                  <thead>
                    <tr>
                      <th>Next Scheduled Date</th>
                      <th>Most Recent Quiz</th>
                      <th>Attention (Last Session)</th>
                      <th>Avg Video Volume</th>
                      <th>Avg Audio Track Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><NextDate lecture={lecture} /></td>
                      <td>{orUnavailable(reviews, data => <LastQuiz review={data[lecture.id]} />)}</td>
                      <td>{orUnavailable(attention, data => <LastAttention session={data[lecture.id]} />)}</td>
                      <td>
                        {orUnavailable(attention, data => (
                          <AverageVolume session={data[lecture.id]} field="avgVideoVolume" muteLabel="Last session · muted = 0" />
                        ))}
                      </td>
                      <td>
                        {orUnavailable(attention, data => (
                          <AverageVolume session={data[lecture.id]} field="avgAudioVolume" muteLabel="Last session · paused = 0" />
                        ))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default UserSchedule;
