import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import './WeeklyReport.css';

const WeeklyReport = ({ onBack }) => {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/reports/weekly`);
            setReportData(res.data);
        } catch (err) {
            console.error('Error fetching report:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="weekly-report card">
            <div className="header-row">
                <h2>Weekly Sales Report</h2>
                <button className="button button-secondary" onClick={onBack}>Back</button>
            </div>

            {loading ? <p>Loading...</p> : (
                <div className="report-content">
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Total Orders</th>
                                <th>Total Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map(day => (
                                <tr key={day._id}>
                                    <td>{day._id}</td>
                                    <td>{day.totalOrders}</td>
                                    <td>${day.totalRevenue.toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr className="total-row">
                                <td><strong>Total</strong></td>
                                <td><strong>{reportData.reduce((sum, day) => sum + day.totalOrders, 0)}</strong></td>
                                <td><strong>${reportData.reduce((sum, day) => sum + day.totalRevenue, 0).toFixed(2)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WeeklyReport;
