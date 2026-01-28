import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import './Login.css';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);

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

    const handleSubmit = (e) => {
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
            return; // Don't count this as an attempt
        }

        // Simple hardcoded check
        if (username === 'admin' && password === 'admin123') {
            onLogin();
            Swal.fire({
                icon: 'success',
                title: 'Welcome back!',
                text: 'Login successful',
                timer: 1500,
                showConfirmButton: false
            });
            setAttempts(0);
            setUsername('');
            setPassword('');
            localStorage.removeItem('loginLockoutEnd');
        } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setUsername(''); // Clear username field
            setPassword(''); // Clear password field

            if (newAttempts >= 3) {
                const lockoutEnd = Date.now() + 30000; // 30 seconds from now
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
                    title: 'Access Denied',
                    text: `Invalid credentials. ${3 - newAttempts} attempts remaining.`,
                    confirmButtonColor: '#ef4444',
                    timer: 1500
                });
            }
        }
    };

    const isLocked = timeLeft > 0;

    return (
        <div className="login-container">
            <div className="login-card glass-panel">
                <div className="login-header">
                    <div className="app-logo">🔒</div>
                    <h2>Admin Access</h2>
                    <p>{isLocked ? `Try again in ${timeLeft}s` : 'Please sign in to continue'}</p>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            className="login-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            disabled={isLocked}
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
                            disabled={isLocked}
                            autoComplete="off"
                            name="login-password-field"
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={isLocked}>
                        {isLocked ? `Locked (${timeLeft}s)` : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
