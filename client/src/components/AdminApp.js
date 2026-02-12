import React, { useState } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import AdminCustomers from './AdminCustomers';
import AdminPayments from './AdminPayments';
import AdminExport from './AdminExport';
import AdminUsers from './AdminUsers';
import Settings from './Settings';
import './AdminApp.css';

const AdminApp = ({ onLogout, darkMode, toggleDarkMode }) => {
    const [activeSection, setActiveSection] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const username = localStorage.getItem('username') || 'Alex Rivera';

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '🎛️' },
        { id: 'customers', label: 'Customers', icon: '👥' },
        { id: 'users', label: 'Staff/Users', icon: '👤' },
        { id: 'export', label: 'Export Reports', icon: '📊' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'dashboard':
                return <AnalyticsDashboard onBack={() => { }} setActiveSection={setActiveSection} />;
            case 'customers':
                return <AdminCustomers />;
            case 'users':
                return <AdminUsers />;
            case 'export':
                return <AdminExport />;
            case 'settings':
                return <Settings onBack={() => setActiveSection('dashboard')} onLogout={onLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
            default:
                return <AnalyticsDashboard onBack={() => { }} setActiveSection={setActiveSection} />;
        }
    };

    return (
        <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <div className="brand-icon-wrapper">E</div>
                        {!sidebarCollapsed && <span className="brand-text">E-Debt <span>Admin</span></span>}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(item.id)}
                            title={item.label}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            {!sidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile-mini">
                        <div className="profile-avatar">
                            {/* Simple colored avatar like in image */}
                        </div>
                        {!sidebarCollapsed && (
                            <div className="profile-info">
                                <span className="profile-name">{username}</span>
                                <span className="profile-role">Administrator</span>
                            </div>
                        )}
                    </div>
                    <button className="sidebar-logout" onClick={onLogout}>
                        <span className="logout-icon">↩️</span>
                        {!sidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-topbar">
                    <div className="topbar-search">
                        <input type="text" placeholder="Search transactions, customers..." />
                    </div>
                    <div className="topbar-right">
                        <button className="icon-btn" title="Notifications">
                            🔔
                            <span className="notification-dot"></span>
                        </button>
                        <button className="icon-btn" onClick={toggleDarkMode} title="Toggle Theme">
                            {darkMode ? '☀️' : '🌙'}
                        </button>
                    </div>
                </header>
                <div className="admin-content">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AdminApp;
