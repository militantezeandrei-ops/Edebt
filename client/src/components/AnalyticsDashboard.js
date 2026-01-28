import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import API_URL from '../config/api';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = ({ onBack }) => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [weeklyData, setWeeklyData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [analyticsRes, weeklyRes] = await Promise.all([
                    axios.get(`${API_URL}/api/analytics`),
                    axios.get(`${API_URL}/api/reports/weekly`)
                ]);
                setAnalyticsData(analyticsRes.data);
                setWeeklyData(weeklyRes.data); // Array of { _id: date, totalOrders, totalRevenue }
                setError(null);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="analytics-dashboard loading-state">
        <div className="spinner"></div>
        <p>Analyzing Data...</p>
    </div>;

    if (error) return <div className="analytics-dashboard error-state">
        <p>{error}</p>
        <button className="button" onClick={onBack}>Go Back</button>
    </div>;

    if (!analyticsData || !weeklyData) return null;

    // Calculate metrics
    const totalRevenueCode = weeklyData.reduce((acc, day) => acc + day.totalRevenue, 0);
    const totalOrdersCode = weeklyData.reduce((acc, day) => acc + day.totalOrders, 0);

    return (
        <div className="analytics-dashboard fade-in">
            <header className="dashboard-header">
                <h2>Dashboard</h2>
                {/* Back button is technically handled by bottom nav now, 
                    but keeping a 'Back' or 'Close' might be redundant if this is a main tab.
                    If it's a main tab, we don't need a back button to scanner.
                    But the prop is passed, so we can keep it or hide it. 
                    User feedback implies this is a Dashboard view.
                */}
            </header>

            <div className="bento-grid">
                {/* Metric Card 1: Revenue */}
                <div className="bento-card metric-card">
                    <div className="metric-header">
                        <span className="metric-title">Weekly Revenue</span>
                        <span className="metric-icon">💰</span>
                    </div>
                    <div className="metric-value">
                        ₱{totalRevenueCode.toFixed(2)}
                    </div>
                    <div className="mini-chart">
                        <ResponsiveContainer width="100%" height={50}>
                            <AreaChart data={weeklyData}>
                                <Area type="monotone" dataKey="totalRevenue" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Metric Card 2: Orders */}
                <div className="bento-card metric-card">
                    <div className="metric-header">
                        <span className="metric-title">Total Orders</span>
                        <span className="metric-icon">📦</span>
                    </div>
                    <div className="metric-value">
                        {totalOrdersCode}
                    </div>
                    <div className="mini-chart">
                        <ResponsiveContainer width="100%" height={50}>
                            <AreaChart data={weeklyData}>
                                <Area type="monotone" dataKey="totalOrders" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Insights (Large Tile) */}
                <div className="bento-card ai-insight-card">
                    <div className="card-header">
                        <h3>🤖 AI Observation</h3>
                    </div>
                    <div className="insight-content">
                        <div className="insight-row">
                            <div className="icon-badge trend">🔥</div>
                            <div>
                                <span className="label">Trending Product</span>
                                <div className="value">{analyticsData.aiInsights.topTrend}</div>
                            </div>
                        </div>
                        <div className="insight-row">
                            <div className="icon-badge warn">⚠️</div>
                            <div>
                                <span className="label">Debt Risk Exposure</span>
                                <div className="value negative">₱{analyticsData.aiInsights.totalDebt.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Popular Products (Tall Tile) */}
                <div className="bento-card products-card">
                    <div className="card-header">
                        <h3>Top Products</h3>
                    </div>
                    <div className="product-list">
                        {analyticsData.popularProducts.map((p, i) => (
                            <div key={p._id} className="product-item">
                                <span className="p-rank">{i + 1}</span>
                                <div className="p-info">
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

                {/* High Debt (Wide Tile) */}
                <div className="bento-card debt-card">
                    <div className="card-header">
                        <h3>High Debt Customers</h3>
                        <span className="badge-count">{analyticsData.highDebtCustomers.length}</span>
                    </div>
                    <div className="debt-list">
                        {analyticsData.highDebtCustomers.map(c => (
                            <div key={c.unique_id} className="debt-item">
                                <div className="d-avatar">{c.name ? c.name.charAt(0).toUpperCase() : '?'}</div>
                                <div className="d-info">
                                    <span className="d-name">{c.name || 'Unknown'}</span>
                                    <span className="d-id">{c.unique_id}</span>
                                </div>
                                <span className="d-amount">-₱{c.balance.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Padding for bottom nav */}
            <div style={{ height: '80px' }}></div>
        </div>
    );
};

export default AnalyticsDashboard;
