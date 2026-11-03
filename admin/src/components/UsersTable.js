import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function UsersTable({ onSelectUser }) {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const usersResponse = await fetch('/api/admin/users', {
          headers: { 'x-user-id': currentUser.id },
        });

        const usersData = await usersResponse.json();
        if (!usersResponse.ok) {
          throw new Error(usersData.message || 'Failed to fetch users');
        }

        setUsers(usersData);
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
      <p className="admin-subtitle">Select a user to see their lecture schedule</p>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr
                key={user.id}
                className="admin-row-clickable"
                tabIndex={0}
                onClick={() => onSelectUser(user)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectUser(user);
                  }
                }}
              >
                <td>
                  <span className="admin-username">{user.username}</span>
                  {user.isAdmin && <span className="admin-tag">admin</span>}
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
