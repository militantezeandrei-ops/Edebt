import React, { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import API_URL from '../config/api';
import './Settings.css';

const Settings = ({ onBack, onLogout, darkMode, toggleDarkMode }) => {
    const [shopName, setShopName] = useState(localStorage.getItem('shopName') || 'My Digital Store');
    const [ownerName, setOwnerName] = useState(localStorage.getItem('ownerName') || 'Admin');

    // Toast Configuration
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });

    // Save settings
    const handleSave = () => {
        localStorage.setItem('shopName', shopName);
        localStorage.setItem('ownerName', ownerName);
        Toast.fire({
            icon: 'success',
            title: 'Settings saved successfully!'
        });
    };



    const handleResetData = async () => {
        const result = await Swal.fire({
            title: '⚠️ Factory Reset',
            html: `
                <p>This will <b>PERMANENTLY DELETE</b> all order history and reset customer balances.</p>
                <p>Please enter the <b>Admin Password</b> to confirm:</p>
            `,
            input: 'password', // Change using password field
            inputAttributes: {
                autocapitalize: 'off',
                placeholder: 'Enter password',
                autocomplete: 'off',
                name: 'reset-password-field' // Random name to prevent manager matching
            },
            showCancelButton: true,
            confirmButtonText: 'Verify & Delete',
            confirmButtonColor: '#ef4444',
            showLoaderOnConfirm: true,
            preConfirm: async (input) => {
                // Hardcoded password verification
                if (input !== 'admin123') {
                    Swal.showValidationMessage('Incorrect password. Access denied.');
                } else {
                    try {
                        const response = await axios.post(`${API_URL}/api/reset`, { action: 'FULL_RESET' });
                        return response.data;
                    } catch (error) {
                        Swal.showValidationMessage(
                            `Request failed: ${error.response ? error.response.data.message : error.message}`
                        )
                    }
                }
            },
            allowOutsideClick: () => !Swal.isLoading()
        });

        if (result.isConfirmed) {
            Swal.fire({
                icon: 'success',
                title: 'System Reset!',
                text: 'All data has been cleared successfully.',
                confirmButtonColor: '#4f46e5'
            }).then(() => {
                window.location.reload();
            });
        }
    };

    return (
        <div className="settings-page fade-in">
            <div className="settings-header">
                <h2>Settings</h2>
            </div>

            <div className="settings-content">
                {/* Profile Section */}
                <div className="settings-card">
                    <h3>Store Profile</h3>
                    <div className="setting-item">
                        <label>Shop Name</label>
                        <input
                            type="text"
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            className="settings-input"
                        />
                    </div>
                    <div className="setting-item">
                        <label>Owner Name</label>
                        <input
                            type="text"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            className="settings-input"
                        />
                    </div>
                    <button className="button button-primary" onClick={handleSave}>
                        Save Changes
                    </button>
                </div>

                {/* Data Management Section */}
                <div className="settings-card">
                    <h3>Data Management</h3>


                    <div className="setting-row danger-zone">
                        <div className="setting-info">
                            <h4 className="text-danger">Factory Reset</h4>
                            <p>Delete all orders and reset balances</p>
                        </div>
                        <button
                            className="button button-danger"
                            onClick={handleResetData}
                        >
                            ⚠️ Reset Data
                        </button>
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="settings-card">
                    <h3>App Preferences</h3>
                    <div className="setting-row">
                        <div className="setting-info">
                            <h4>Dark Mode</h4>
                            <p>Switch between light and dark themes</p>
                        </div>
                        <div className="toggle-switch-container">
                            <div className={`toggle-switch ${darkMode ? 'on' : 'off'}`} onClick={toggleDarkMode}>
                                <div className="toggle-handle"></div>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Account Section */}
                <div className="settings-card">
                    <h3>Account</h3>
                    <div className="setting-row">
                        <div className="setting-info">
                            <h4>Admin Session</h4>
                            <p>Sign out of the application</p>
                        </div>
                        <button
                            className="button button-secondary"
                            onClick={() => {
                                Swal.fire({
                                    title: 'Sign Out?',
                                    text: "You will be returned to the login screen.",
                                    icon: 'question',
                                    showCancelButton: true,
                                    confirmButtonColor: '#4f46e5',
                                    cancelButtonColor: '#d33',
                                    confirmButtonText: 'Yes, Sign Out'
                                }).then((result) => {
                                    if (result.isConfirmed) {
                                        onLogout && onLogout();
                                    }
                                })
                            }}
                        >
                            Log Out
                        </button>
                    </div>
                </div>

                {/* About Section */}
                <div className="settings-card">
                    <h3>About</h3>
                    <div className="setting-row">
                        <span className="app-version">Version 1.0.0</span>
                    </div>
                    <div className="setting-row">
                        <span className="app-credit">2026</span>
                    </div>
                </div>
            </div>

            {/* Padding for bottom nav */}
            <div style={{ height: '80px' }}></div>
        </div>
    );
};

export default Settings;
