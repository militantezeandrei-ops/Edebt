import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import API_URL from '../config/api';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = ({ onBack, setActiveSection }) => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [weeklyData, setWeeklyData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const userRole = localStorage.getItem('userRole');
    const headers = {
        'x-user-role': userRole,
        'x-username': localStorage.getItem('username')
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const requests = [
                    axios.get(`${API_URL}/api/analytics`),
                    axios.get(`${API_URL}/api/reports/weekly`),
                    axios.get(`${API_URL}/api/customers`)
                ];

                if (userRole === 'admin') {
                    requests.push(axios.get(`${API_URL}/api/activity/logs`, { headers }));
                }

                const results = await Promise.all(requests);

                setAnalyticsData(results[0].data);
                setWeeklyData(results[1].data);
                setTotalCustomers(results[2].data.length);

                if (userRole === 'admin' && results[3]) {
                    setLogs(results[3].data.slice(0, 5));
                }

                setError(null);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userRole]);

    if (loading) return <div className="analytics-dashboard loading-state"><div className="spinner"></div></div>;
    if (error) return <div className="analytics-dashboard error-state"><p>{error}</p></div>;
    if (!analyticsData || !weeklyData) return null;

    const totalRevenueCode = weeklyData.reduce((acc, day) => acc + day.totalRevenue, 0);
    const totalOrdersCode = weeklyData.reduce((acc, day) => acc + day.totalOrders, 0);

    return (
        <div className={`analytics-dashboard fade-in ${userRole === 'staff' ? 'staff-view' : ''}`}>
            <header className="dashboard-header">
                <div className="header-title-group">
                    <h2>System Overview</h2>
                    <span className="last-updated">Real-time Analytics • Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </header>

            <div className="metrics-row">
                <div className="metric-card revenue">
                    <div className="m-header">
                        <span className="m-title">Weekly Revenue</span>
                        <div className="m-icon-box">📈</div>
                    </div>
                    <div className="m-value">₱ {totalRevenueCode.toLocaleString()}</div>
                    <div className="m-bar-bg"><div className="m-bar"></div></div>
                </div>

                <div className="metric-card orders">
                    <div className="m-header">
                        <span className="m-title">Total Orders</span>
                        <div className="m-icon-box">🛍️</div>
                    </div>
                    <div className="m-value">{totalOrdersCode}</div>
                    <div className="m-bar-bg"><div className="m-bar"></div></div>
                </div>

                <div className="metric-card customers">
                    <div className="m-header">
                        <span className="m-title">Total Customers</span>
                        <div className="m-icon-box">👥</div>
                    </div>
                    <div className="m-value">{totalCustomers}</div>
                    <div className="m-footer">+3 since yesterday</div>
                </div>

                <div className="metric-card debt">
                    <div className="m-header">
                        <span className="m-title">Active Debts</span>
                        <div className="m-icon-box">⚠️</div>
                    </div>
                    <div className="m-value">₱ {analyticsData.aiInsights.totalDebt.toLocaleString()}</div>
                    <div className="m-footer negative">Action required for 5 users</div>
                </div>
            </div>

            <div className="bento-grid">
                <div className="bento-left">
                    <div className="card products-card">
                        <div className="card-title-row">
                            <h3>Top Products</h3>
                            
                        </div>
                        <div className="products-list">
                            {analyticsData.popularProducts.slice(0, 4).map((p, i) => (
                                <div key={p._id} className="product-item">
                                    <div className="p-info-row">
                                        <span className="p-name">{p._id}</span>
                                        <span className="p-count">{p.count} sold</span>
                                    </div>
                                    <div className="p-bar-bg">
                                        <div className="p-bar" style={{ width: `${(p.count / analyticsData.popularProducts[0].count) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card ai-insight-card">
                        <div className="ai-header">✨ AI Insight</div>
                        <div className="ai-content">
                            <span>Trending:</span> {analyticsData.aiInsights.topTrend} is seeing a 20% spike. Recommend increasing inventory.
                        </div>
                    </div>
                </div>

                <div className="bento-right">
                    {userRole === 'admin' && (
                        <div className="card activity-card">
                            <div className="card-title-row">
                                <h3>Recent Activity</h3>
                            </div>
                            <div className="activity-list">
                                {logs.map(log => (
                                    <div key={log._id} className="activity-item">
                                        <div className={`a-icon ${log.action.includes('Payment') ? 'payment' : 'orders'}`}>
                                            {log.action.includes('Payment') ? '💵' : '📦'}
                                        </div>
                                        <div className="a-details">
                                            <span className="a-title">{log.action}</span>
                                            <div className="a-desc">Recorded activity for <span>{log.details.split('for ')[1] || 'User'}</span></div>
                                        </div>
                                        <div className="a-time">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="card balances-card">
                        <div className="card-title-row">
                            <h3>Outstanding Balances</h3>
                            <span className="view-all-link">Top 5 debtors</span>
                        </div>
                        <div className="balances-table">
                            <div className="table-header">
                                <span>Customer</span>
                                <span>Type</span>
                                <span>Balance</span>
                                <span></span>
                            </div>
                            {analyticsData.highDebtCustomers.slice(0, 5).map(c => (
                                <div key={c.unique_id} className="table-row">
                                    <div className="c-profile">
                                        <div className="c-avatar">{c.name ? c.name.charAt(0) : '?'}</div>
                                        <span className="c-name">{c.name || 'Unknown'}</span>
                                    </div>
                                    <div className="c-type">{c.customer_type || 'Regular'}</div>
                                    <div className="c-balance">-₱{c.balance.toLocaleString()}</div>
                                    <div className="row-action">›</div>
                                </div>
                            ))}
                        </div>
                        <div className="balances-footer">
                            <button className="view-all-btn" onClick={() => setActiveSection && setActiveSection('customers')}>View All Customers ↗</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
