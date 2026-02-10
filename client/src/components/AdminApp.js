import React, { useState } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import AdminCustomers from './AdminCustomers';
import AdminPayments from './AdminPayments';
import AdminExport from './AdminExport';
import Settings from './Settings';
import './AdminApp.css';

const AdminApp = ({ onLogout, darkMode, toggleDarkMode }) => {
    const [activeSection, setActiveSection] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const username = localStorage.getItem('username') || 'Admin';

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'customers', label: 'Customers', icon: '👥' },
        { id: 'payments', label: 'Payments', icon: '💰' },
        { id: 'export', label: 'Export Data', icon: '📤' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'dashboard':
                return <AnalyticsDashboard onBack={() => { }} />;
            case 'customers':
                return <AdminCustomers />;
            case 'payments':
                return <AdminPayments />;
            case 'export':
                return <AdminExport />;
            case 'settings':
                return <Settings onBack={() => setActiveSection('dashboard')} onLogout={onLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
            default:
                return <AnalyticsDashboard onBack={() => { }} />;
        }
    };

    return (
        <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <span className="brand-icon">💼</span>
                        {!sidebarCollapsed && <span className="brand-text">E-Debt Admin</span>}
                    </div>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title={sidebarCollapsed ? 'Expand' : 'Collapse'}
                    >
                        {sidebarCollapsed ? '▶' : '◀'}
                    </button>
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
                    <div className="user-info">
                        <div className="user-avatar">{username.charAt(0).toUpperCase()}</div>
                        {!sidebarCollapsed && (
                            <div className="user-details">
                                <span className="user-name">{username}</span>
                                <span className="user-role">Administrator</span>
                            </div>
                        )}
                    </div>
                    <button className="sidebar-logout" onClick={onLogout} title="Logout">
                        <span className="sidebar-icon">🚪</span>
                        {!sidebarCollapsed && <span className="sidebar-label">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-topbar">
                    <h1 className="page-title">
                        {menuItems.find(i => i.id === activeSection)?.icon}{' '}
                        {menuItems.find(i => i.id === activeSection)?.label}
                    </h1>
                    <div className="topbar-actions">
                        <button className="theme-toggle" onClick={toggleDarkMode} title="Toggle theme">
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
