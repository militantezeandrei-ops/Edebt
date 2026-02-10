import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import './StaffCustomers.css';

const StaffCustomers = () => {
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedIds, setExpandedIds] = useState(new Set());

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, ordRes] = await Promise.all([
                    axios.get(`${API_URL}/api/customers`),
                    axios.get(`${API_URL}/api/orders`)
                ]);
                setCustomers(custRes.data.sort((a, b) => (b.balance || 0) - (a.balance || 0)));
                setOrders(ordRes.data);
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filtered = useMemo(() => {
        if (!searchTerm) return customers;
        const term = searchTerm.toLowerCase();
        return customers.filter(c =>
            (c.name || '').toLowerCase().includes(term) ||
            (c.unique_id || '').toLowerCase().includes(term)
        );
    }, [customers, searchTerm]);

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getCustomerOrders = (customerId, uniqueId) => {
        return orders
            .filter(o =>
                (o.customer_id && (o.customer_id._id === customerId || o.customer_id === customerId)) ||
                (o.customer_unique_id && o.customer_unique_id === uniqueId)
            )
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    };

    if (loading) return <div className="staff-loading"><div className="spinner"></div></div>;

    return (
        <div className="staff-customers">
            <div className="staff-search-bar">
                <span>🔍</span>
                <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="staff-stat-row">
                <div className="staff-stat">
                    <span className="ss-value">{customers.length}</span>
                    <span className="ss-label">Total</span>
                </div>
                <div className="staff-stat">
                    <span className="ss-value">₱{customers.reduce((s, c) => s + (c.balance || 0), 0).toFixed(0)}</span>
                    <span className="ss-label">Total Debt</span>
                </div>
            </div>

            <div className="staff-customer-list">
                {filtered.map(c => {
                    const isExpanded = expandedIds.has(c._id);
                    const customerOrders = isExpanded ? getCustomerOrders(c._id, c.unique_id) : [];

                    return (
                        <div key={c._id} className={`staff-customer-card ${isExpanded ? 'expanded' : ''}`}>
                            <div className="scc-main" onClick={() => toggleExpand(c._id)}>
                                <div className="scc-avatar">{(c.name || '?').charAt(0).toUpperCase()}</div>
                                <div className="scc-info">
                                    <span className="scc-name">{c.name || 'Unknown'}</span>
                                    <span className="scc-id">{c.unique_id}</span>
                                </div>
                                <div className={`scc-balance ${c.balance > 0 ? 'debt' : 'clear'}`}>
                                    ₱{(c.balance || 0).toFixed(2)}
                                </div>
                                <div className="scc-expand">{isExpanded ? '▲' : '▼'}</div>
                            </div>

                            {isExpanded && (
                                <div className="scc-drawer">
                                    <h5>📦 Borrowed Items</h5>
                                    {customerOrders.length > 0 ? (
                                        <ul className="scc-order-list">
                                            {customerOrders.map(order => (
                                                <li key={order._id} className="scc-order-item">
                                                    <div className="scc-order-date">
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </div>
                                                    <div className="scc-order-desc">
                                                        {order.order_description
                                                            ? order.order_description.split(', ').map((item, i) => (
                                                                <span key={i} className="scc-item-tag">{item}</span>
                                                            ))
                                                            : <span>{order.order_name}</span>
                                                        }
                                                    </div>
                                                    <div className={`scc-order-amt ${order.order_amount < 0 ? 'payment' : ''}`}>
                                                        {order.order_amount < 0 ? '−' : ''}₱{Math.abs(order.order_amount || 0).toFixed(2)}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="scc-empty-orders">No items found</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                {filtered.length === 0 && <div className="staff-empty">No customers found</div>}
            </div>
        </div>
    );
};

export default StaffCustomers;
