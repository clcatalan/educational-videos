import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function UsersTable() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [lectureTitles, setLectureTitles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [usersResponse, lecturesResponse] = await Promise.all([
          fetch('/api/admin/users', {
            headers: { 'x-user-id': currentUser.id },
          }),
          fetch('/api/lectures'),
        ]);

        const usersData = await usersResponse.json();
        if (!usersResponse.ok) {
          throw new Error(usersData.message || 'Failed to fetch users');
        }

        const lecturesData = await lecturesResponse.json();
        const titleMap = {};
        lecturesData.forEach(lecture => { titleMap[lecture.id] = lecture.title; });

        setUsers(usersData);
        setLectureTitles(titleMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser.id]);

  if (loading) {
    return <div className="loading">Loading admin data...</div>;
  }

  if (error) {
    return <div className="error-container"><h2>{error}</h2></div>;
  }

  return (
    <div className="admin-portal-container">
      <h2>Participant Data</h2>
      <p className="admin-subtitle">Preferences and watch history for every user</p>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Preferences</th>
              <th>Watched Videos</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <span className="admin-username">{user.username}</span>
                  {user.isAdmin && <span className="admin-tag">admin</span>}
                </td>
                <td>
                  {!user.preferencesSet ? (
                    <span className="admin-empty">Not set yet</span>
                  ) : user.preferredLectureIds.length === 0 ? (
                    <span className="admin-empty">No preference (sees all)</span>
                  ) : (
                    <ul className="admin-list">
                      {user.preferredLectureIds.map(id => (
                        <li key={id}>{lectureTitles[id] || `Lecture #${id}`}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td>
                  {user.watchedLectures.length === 0 ? (
                    <span className="admin-empty">No videos watched</span>
                  ) : (
                    <ul className="admin-list">
                      {user.watchedLectures.map(watched => (
                        <li key={watched.id}>
                          {watched.title}
                          <span className="admin-watched-at">
                            {new Date(watched.watchedAt).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UsersTable;
