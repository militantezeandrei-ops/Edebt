import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import './AdminUsers.css';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formUsername, setFormUsername] = useState('');
    const [formRole, setFormRole] = useState('staff');
    const [formPassword, setFormPassword] = useState('');
    const [expandedDates, setExpandedDates] = useState({});

    const adminRole = localStorage.getItem('userRole');
    const headers = { 'x-user-role': adminRole, 'x-username': localStorage.getItem('username') };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [userRes, logRes] = await Promise.all([
                axios.get(`${API_URL}/api/auth/users`, { headers }),
                axios.get(`${API_URL}/api/activity/logs`, { headers })
            ]);
            setUsers(userRes.data);
            setLogs(logRes.data);

            // Auto-expand the most recent date
            if (logRes.data.length > 0) {
                const latestDate = new Date(logRes.data[0].createdAt).toLocaleDateString();
                setExpandedDates({ [latestDate]: true });
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const toggleDateGroup = (dateStr) => {
        setExpandedDates(prev => ({
            ...prev,
            [dateStr]: !prev[dateStr]
        }));
    };

    const groupLogsByDate = (logs) => {
        return logs.reduce((groups, log) => {
            const date = new Date(log.createdAt).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(log);
            return groups;
        }, {});
    };

    const isToday = (dateStr) => {
        const today = new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        return dateStr === today;
    };

    const openAddModal = () => {
        setEditingUser(null);
        setFormUsername('');
        setFormPassword('');
        setFormRole('staff');
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormUsername(user.username);
        setFormPassword(''); // Don't show old password
        setFormRole(user.role);
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                username: formUsername.toLowerCase(),
                role: formRole
            };
            if (formPassword) payload.password = formPassword;

            if (editingUser) {
                await axios.put(`${API_URL}/api/auth/users/${editingUser._id}`, payload, { headers });
                Swal.fire({ icon: 'success', title: 'User Updated', timer: 1500, showConfirmButton: false });
            } else {
                if (!formPassword) return Swal.fire('Error', 'Password is required for new users', 'error');
                await axios.post(`${API_URL}/api/auth/users`, payload, { headers });
                Swal.fire({ icon: 'success', title: 'User Created', timer: 1500, showConfirmButton: false });
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'Operation failed', 'error');
        }
    };

    const handleDelete = async (user) => {
        if (user.username === localStorage.getItem('username')) {
            return Swal.fire('Error', 'You cannot delete yourself!', 'error');
        }

        const result = await Swal.fire({
            title: 'Delete User?',
            text: `Are you sure you want to delete "${user.username}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_URL}/api/auth/users/${user._id}`, { headers });
                fetchData();
                Swal.fire('Deleted', 'User account removed', 'success');
            } catch (err) {
                Swal.fire('Error', 'Failed to delete user', 'error');
            }
        }
    };

    if (loading) return <div className="admin-loading"><div className="spinner"></div><p>Loading users...</p></div>;

    return (
        <div className="admin-users-container">
            <div className="users-management-grid">
                {/* User List Panel */}
                <div className="users-panel">
                    <div className="panel-header">
                        <h3>👥 Staff Management</h3>
                        <button className="btn-add-user" onClick={openAddModal}>➕ New Staff</button>
                    </div>
                    <div className="users-list">
                        {users.filter(u => u.username !== 'admin').map(u => (
                            <div key={u._id} className="user-card">
                                <div className="user-avatar">{u.username.charAt(0).toUpperCase()}</div>
                                <div className="user-info">
                                    <div className="user-name-line">
                                        <span className="name">{u.username}</span>
                                        <span className={`role-badge ${u.role}`}>{u.role}</span>
                                    </div>
                                    <span className="user-meta">Account Status: {u.is_active ? 'Active' : 'Inactive'}</span>
                                </div>
                                <div className="user-actions">
                                    <button onClick={() => openEditModal(u)} title="Edit">✏️</button>
                                    <button onClick={() => handleDelete(u)} title="Delete">🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Log Panel */}
                <div className="activity-panel">
                    <div className="panel-header">
                        <h3>📋 Recent Activity Feed</h3>
                    </div>
                    <div className="activity-feed">
                        {logs.length > 0 ? Object.entries(groupLogsByDate(logs)).map(([date, dateLogs]) => (
                            <div key={date} className="date-group">
                                <div
                                    className={`date-group-header ${expandedDates[date] ? 'expanded' : ''}`}
                                    onClick={() => toggleDateGroup(date)}
                                >
                                    <span className="date-label">
                                        {isToday(date) ? '📅 Today' : date}
                                    </span>
                                    <div className="date-meta">
                                        <span className="activity-count">{dateLogs.length} activities</span>
                                        <span className="expand-icon">{expandedDates[date] ? '▼' : '▶'}</span>
                                    </div>
                                </div>

                                {expandedDates[date] && (
                                    <div className="date-group-content fade-in">
                                        {dateLogs.map(log => (
                                            <div key={log._id} className="activity-item">
                                                <div className="activity-dot"></div>
                                                <div className="activity-content">
                                                    <div className="activity-header">
                                                        <span className="actor">{log.user?.username || 'Unknown'}</span>
                                                        <span className="time">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                                    </div>
                                                    <div className="action-label">{log.action}</div>
                                                    <div className="details">{log.details}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="empty-logs">No activity recorded yet</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="user-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingUser ? '✏️ Edit User' : '➕ Create New User'}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-field">
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={formUsername}
                                    onChange={e => setFormUsername(e.target.value)}
                                    required
                                    placeholder="e.g. jdoe"
                                />
                            </div>
                            <div className="form-field">
                                <label>{editingUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                                <input
                                    type="password"
                                    value={formPassword}
                                    onChange={e => setFormPassword(e.target.value)}
                                    required={!editingUser}
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="form-field">
                                <label>Role</label>
                                <select value={formRole} onChange={e => setFormRole(e.target.value)}>
                                    <option value="staff">Staff</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-save">{editingUser ? 'Update Account' : 'Create Account'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
