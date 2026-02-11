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
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState('all');
    const ITEMS_PER_PAGE = 10;

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
        let result = customers;

        // Apply Filters
        switch (activeFilter) {
            case 'high_debt':
                result = result.filter(c => (c.balance || 0) > 100);
                break;
            case 'regular':
                result = result.filter(c => {
                    const type = (c.customer_type || '').toLowerCase();
                    const status = (c.employment_status || '').toLowerCase();
                    return type === 'regular' || (type === '' && status === '');
                });
                break;
            case 'non_regular':
                result = result.filter(c => {
                    const type = (c.customer_type || '').toLowerCase();
                    const status = (c.employment_status || '').toLowerCase();
                    return type.includes('non') || status.includes('non');
                });
                break;
            case 'recent':
                result = [...result].sort((a, b) => new Date(b.last_transaction_date || 0) - new Date(a.last_transaction_date || 0));
                break;
            default:
                break;
        }

        if (!searchTerm) return result;
        const term = searchTerm.toLowerCase();
        return result.filter(c =>
            (c.name || '').toLowerCase().includes(term) ||
            (c.unique_id || '').toLowerCase().includes(term)
        );
    }, [customers, searchTerm, activeFilter]);

    // Reset page on search or filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeFilter]);

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

            <div className="staff-filter-chips">
                {[
                    { id: 'all', label: 'All' },
                    { id: 'high_debt', label: '🔴 High Debt' },
                    { id: 'regular', label: '👤 Regular' },
                    { id: 'non_regular', label: '👥 Non-Regular' },
                    { id: 'recent', label: '🕒 Recent' },
                ].map(f => (
                    <button
                        key={f.id}
                        className={`staff-filter-chip ${activeFilter === f.id ? 'active' : ''}`}
                        onClick={() => setActiveFilter(f.id)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="staff-stat-row">
                <div className="staff-stat">
                    <span className="ss-value">{customers.length}</span>
                    <span className="ss-label">Total Customers</span>
                </div>
                <div className="staff-stat">
                    <span className="ss-value">P {(customers.reduce((s, c) => s + (c.balance || 0), 0) || 0).toFixed(0)}</span>
                    <span className="ss-label">Total Debt</span>
                </div>
            </div>

            <div className="staff-customer-list">
                {filtered
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map(c => {
                        const isExpanded = expandedIds.has(c._id);
                        const customerOrders = isExpanded ? getCustomerOrders(c._id, c.unique_id) : [];

                        return (
                            <div key={c._id} className={`staff-customer-card ${isExpanded ? 'expanded' : ''}`}>
                                <div className="scc-main" onClick={() => toggleExpand(c._id)}>
                                    <div className="scc-avatar">{(c.name || '?').charAt(0).toUpperCase()}</div>
                                    <div className="scc-info">
                                        <div className="scc-name-row">
                                            <span className="scc-name">{c.name || 'Unknown'}</span>
                                        </div>
                                        <div className="scc-meta">
                                            <span className={`scc-badge ${(c.customer_type || '').toLowerCase().includes('non') ? 'non-regular' : 'regular'}`}>
                                                {c.customer_type || 'Regular'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`scc-payment-status ${c.payment_status === 'Paid' ? 'paid' : 'unpaid'}`}>
                                        {c.payment_status === 'Paid' ? 'PAID' : 'UNPAID'}
                                    </div>
                                    <div className={`scc-balance ${c.balance > 0 ? 'debt' : 'clear'}`}>
                                        P {(c.balance || 0).toFixed(2)}
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

                {/* Pagination Relocated below cards */}
                {filtered.length > ITEMS_PER_PAGE && (
                    <div className="staff-pagination">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="sp-btn"
                        >
                            ← Prev
                        </button>

                        <span className="sp-info">
                            Page <b>{currentPage}</b> of {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                        </span>

                        <button
                            disabled={currentPage >= Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="sp-btn"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffCustomers;
