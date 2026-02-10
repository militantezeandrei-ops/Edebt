import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import './Login.css';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(false);
    const [serverStatus, setServerStatus] = useState('checking'); // 'checking', 'online', 'offline'

    // On mount: Check localStorage for existing lockout
    useEffect(() => {
        const lockoutEnd = localStorage.getItem('loginLockoutEnd');
        if (lockoutEnd) {
            const remaining = Math.ceil((parseInt(lockoutEnd) - Date.now()) / 1000);
            if (remaining > 0) {
                setTimeLeft(remaining);
                setAttempts(3);
            } else {
                localStorage.removeItem('loginLockoutEnd');
            }
        }
    }, []);

    // Countdown Timer + persist to localStorage
    useEffect(() => {
        let timer;
        if (timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        localStorage.removeItem('loginLockoutEnd');
                        setAttempts(0);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [timeLeft]);

    // Server Health Check
    useEffect(() => {
        const checkServer = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
                if (res.data.status === 'OK') {
                    setServerStatus('online');
                } else {
                    setServerStatus('offline');
                }
            } catch (err) {
                setServerStatus('offline');
            }
        };

        checkServer();
        const interval = setInterval(checkServer, 10000); // Check every 10s
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (timeLeft > 0) return; // Prevent submission while locked

        // Validate: Don't count empty fields as an attempt
        if (!username.trim() || !password.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Fields',
                text: 'Please enter both username and password.',
                confirmButtonColor: '#4f46e5',
                timer: 2000
            });
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, {
                username: username.trim(),
                password: password.trim()
            });

            if (response.data.success) {
                const { role, username: uname } = response.data.user;
                localStorage.setItem('userRole', role);
                localStorage.setItem('username', uname);
                onLogin(role);
                Swal.fire({
                    icon: 'success',
                    title: role === 'admin' ? 'Welcome, Admin!' : 'Welcome, Staff!',
                    text: `Logged in as ${uname}`,
                    timer: 1500,
                    showConfirmButton: false
                });
                setAttempts(0);
                setUsername('');
                setPassword('');
                localStorage.removeItem('loginLockoutEnd');
            }
        } catch (err) {
            console.error('Login Error:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Connection failed';

            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setUsername('');
            setPassword('');

            if (newAttempts >= 3) {
                const lockoutEnd = Date.now() + 30000;
                localStorage.setItem('loginLockoutEnd', lockoutEnd.toString());
                setTimeLeft(30);
                Swal.fire({
                    icon: 'error',
                    title: 'Locked Out',
                    text: 'Too many failed attempts. Please wait 30 seconds.',
                    confirmButtonColor: '#ef4444'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: `${errorMessage}. ${3 - newAttempts} attempts remaining.`,
                    confirmButtonColor: '#ef4444',
                    footer: `<small>Backend: ${API_URL}</small>`
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const isLocked = timeLeft > 0;

    return (
        <div className="login-container">
            <div className="login-card glass-panel">
                <div className="login-header">
                    <div className="status-indicator-container">
                        <div className={`status-dot ${serverStatus}`}></div>
                        <span className="status-text">
                            {serverStatus === 'checking' ? 'Checking connection...' :
                                serverStatus === 'online' ? 'System Online' : 'System Offline (Render waking up...)'}
                        </span>
                    </div>
                    <div className="app-logo">🔐</div>
                    <h2>E-Debt System</h2>
                    <p className="login-subtitle">
                        {isLocked ? `Try again in ${timeLeft}s` : 'Sign in to continue'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            className="login-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="admin or staff"
                            disabled={isLocked || loading}
                            autoComplete="off"
                            name="login-username-field"
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className="login-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            disabled={isLocked || loading}
                            autoComplete="off"
                            name="login-password-field"
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={isLocked || loading}>
                        {loading ? 'Signing in...' : isLocked ? `Locked (${timeLeft}s)` : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    <p className="role-hint">👤 Admin — Full dashboard access</p>
                    <p className="role-hint">📱 Staff — Mobile order capture</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
