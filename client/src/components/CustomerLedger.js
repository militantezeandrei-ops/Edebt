import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import './CustomerLedger.css';
import { OfflineStorage } from '../utils/offlineStorage';
import * as IDB from '../utils/indexedDB';
import Swal from 'sweetalert2';

const CustomerLedger = ({ onBack }) => {
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // all, high_debt, recent
    const [expandedIds, setExpandedIds] = useState(new Set());

    useEffect(() => {
        fetchData();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);

        // 1. Cache-First: Load immediately
        const cached = OfflineStorage.loadData('customers');
        if (cached) {
            setCustomers(cached);
            setLoading(false); // Show content immediately
        }

        try {
            const res = await axios.get(`${API_URL}/api/customers`);
            // Sort by balance (descending) by default
            const sorted = res.data.sort((a, b) => b.balance - a.balance);
            setCustomers(sorted);
            OfflineStorage.saveData('customers', sorted);
            setError(null);
        } catch (err) {
            console.error('Error fetching customers:', err);
            if (!cached) {
                setError('Failed to load customer data. Check connection.');
            } else {
                // We have cached data, so this is just a background sync failure
                console.log("Using cached customer data due to network error.");
            }
        } finally {
            if (!cached) setLoading(false);
        }
    };

    const fetchOrders = async () => {
        // 1. Cache-First
        const cached = OfflineStorage.loadData('orders');
        if (cached) {
            setOrders(cached);
        }

        try {
            const res = await axios.get(`${API_URL}/api/orders`);
            setOrders(res.data);
            OfflineStorage.saveData('orders', res.data); // Cache orders too
        } catch (err) {
            console.error('Error fetching orders:', err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchCustomers(), // Call the new fetchCustomers function
                fetchOrders()     // Call the new fetchOrders function
            ]);
        } catch (err) {
            // Errors are already handled within fetchCustomers and fetchOrders
            console.error('Error in fetchData orchestration:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Filter Logic
    const filteredCustomers = useMemo(() => {
        let filtered = customers.filter(c =>
        (c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.unique_id?.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (activeFilter === 'high_debt') {
            filtered = filtered.filter(c => c.balance > 50).sort((a, b) => b.balance - a.balance);
        } else if (activeFilter === 'recent') {
            // Sort by most recently updated/created
            filtered = [...filtered].reverse();
        } else if (activeFilter === 'active') {
            filtered = filtered.filter(c => c.is_active !== false); // Default to true if undefined
        } else if (activeFilter === 'inactive') {
            filtered = filtered.filter(c => c.is_active === false);
        }

        return filtered;
    }, [customers, searchTerm, activeFilter]);

    // Helper: Get recent orders for expanded view
    const getCustomerRecentOrders = (customerId, customerUniqueId) => {
        const customerOrders = orders.filter(order =>
            (order.customer_id && order.customer_id._id === customerId) ||
            (order.customer_id === customerId) ||
            (order.customer_unique_id && customerUniqueId === order.customer_unique_id)
        );

        // Sort by date desc
        return customerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    };

    const getRiskColorClass = (balance) => {
        if (balance <= 0) return 'risk-low'; // Green/Safe
        if (balance < 50) return 'risk-medium'; // Orange
        return 'risk-high'; // Red
    };

    return (
        <div className="customer-ledger fade-in">
            <div className="header-row">
                <h2>Customers</h2>
            </div>

            {/* Sticky Header Section */}
            <div className="sticky-header">

                <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filter-chips">
                    <button
                        className={`chip ${activeFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`chip ${activeFilter === 'high_debt' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('high_debt')}
                    >
                        High Debt
                    </button>
                    <button
                        className={`chip ${activeFilter === 'recent' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('recent')}
                    >
                        Recent
                    </button>
                    <button
                        className={`chip ${activeFilter === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('active')}
                    >
                        Active
                    </button>
                    <button
                        className={`chip ${activeFilter === 'inactive' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('inactive')}
                    >
                        Inactive
                    </button>
                </div>
            </div>

            {/* Content List */}
            <div className="ledger-list">
                {loading ? <div className="spinner"></div> : (
                    <>
                        {filteredCustomers.map(customer => {
                            const isExpanded = expandedIds.has(customer._id);
                            const riskClass = getRiskColorClass(customer.balance);
                            const recentOrders = isExpanded ? getCustomerRecentOrders(customer._id, customer.unique_id) : [];

                            return (
                                <div key={customer._id} className={`ledger-card ${isExpanded ? 'expanded' : ''}`} onClick={() => toggleExpand(customer._id)}>
                                    <div className="card-main">
                                        <div className="user-avatar">
                                            {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div className="user-info">
                                            <h4>{customer.name || 'Unknown'}</h4>
                                            <span className="user-id">ID: {customer.unique_id}</span>
                                        </div>
                                        <div className={`user-balance ${riskClass}`}>
                                            P {(customer.balance || 0).toFixed(2)}
                                        </div>
                                        <div className="expand-icon">
                                            {isExpanded ? '▲' : '▼'}
                                        </div>
                                    </div>

                                    {/* Collapsible Drawer */}
                                    {isExpanded && (
                                        <div className="card-drawer fade-in">
                                            <h5>Recent Orders</h5>
                                            {recentOrders.length > 0 ? (
                                                <ul className="history-list">
                                                    {recentOrders.map(order => (
                                                        <li key={order._id} className="history-item">
                                                            <div className="h-date">{new Date(order.createdAt).toLocaleDateString()}</div>
                                                            <div className="h-items">
                                                                {order.order_description ? (
                                                                    <ul className="order-items-list">
                                                                        {order.order_description.split(', ').map((item, idx) => (
                                                                            <li key={idx}>{item}</li>
                                                                        ))}
                                                                    </ul>
                                                                ) : (
                                                                    <span>{order.order_name}</span>
                                                                )}
                                                            </div>
                                                            <div className="h-amount">P {order.order_amount.toFixed(2)}</div>
                                                        </li>
                                                    ))}
                                                    {/* Opening Balance Calculation */}
                                                    {(() => {
                                                        const historyTotal = recentOrders.reduce((sum, o) => sum + o.order_amount, 0);
                                                        const openingBal = customer.balance - historyTotal;
                                                        if (Math.abs(openingBal) > 0.01) {
                                                            return (
                                                                <li className="history-item opening-balance-row">
                                                                    <div className="h-date">--/--</div>
                                                                    <div className="h-items"><em>Opening Balance / Adjustment</em></div>
                                                                    <div className="h-amount">P {openingBal.toFixed(2)}</div>
                                                                </li>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </ul>
                                            ) : (
                                                <p className="empty-history">No recent order history.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {filteredCustomers.length === 0 && (
                            <div className="empty-state">
                                No customers found matching your search.
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Padding for bottom nav */}
            <div style={{ height: '80px' }}></div>
        </div>
    );
};

export default CustomerLedger;
