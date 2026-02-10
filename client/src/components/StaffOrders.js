import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import './StaffOrders.css';

const StaffOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/orders`);
            setOrders(res.data);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, []);

    const filteredOrders = useMemo(() => {
        if (statusFilter === 'all') return orders;
        return orders.filter(o => o.order_status === statusFilter);
    }, [orders, statusFilter]);

    const setProcessing = async (orderId) => {
        try {
            await axios.put(`${API_URL}/api/order/${orderId}/status`, { status: 'processing' });
            Swal.fire({ icon: 'success', title: 'Now Processing!', timer: 1000, showConfirmButton: false });
            fetchOrders();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update status' });
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending': return { bg: '#f59e0b22', color: '#f59e0b', label: '⏳ Pending' };
            case 'processing': return { bg: '#3b82f622', color: '#3b82f6', label: '🔄 Processing' };
            case 'completed': return { bg: '#10b98122', color: '#10b981', label: '✅ Completed' };
            case 'cancelled': return { bg: '#ef444422', color: '#ef4444', label: '❌ Cancelled' };
            default: return { bg: '#88888822', color: '#888', label: status };
        }
    };

    const statusCounts = useMemo(() => {
        const c = { all: orders.length, pending: 0, processing: 0, completed: 0 };
        orders.forEach(o => { if (c[o.order_status] !== undefined) c[o.order_status]++; });
        return c;
    }, [orders]);

    if (loading) return <div className="staff-loading"><div className="spinner"></div></div>;

    return (
        <div className="staff-orders">
            {/* Status Filter */}
            <div className="staff-filter-row">
                {['all', 'pending', 'processing', 'completed'].map(s => (
                    <button
                        key={s}
                        className={`staff-filter-btn ${statusFilter === s ? 'active' : ''}`}
                        onClick={() => setStatusFilter(s)}
                    >
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s]})
                    </button>
                ))}
            </div>

            {/* Orders List */}
            <div className="staff-order-list">
                {filteredOrders.map(order => {
                    const style = getStatusStyle(order.order_status);
                    return (
                        <div key={order._id} className="staff-order-card">
                            <div className="soc-header">
                                <span className="soc-name">{order.order_name}</span>
                                <span className="soc-badge" style={{ background: style.bg, color: style.color }}>
                                    {style.label}
                                </span>
                            </div>
                            {order.order_description && (
                                <p className="soc-desc">{order.order_description}</p>
                            )}
                            <div className="soc-meta">
                                <span>👤 {order.customer_name || order.customer_unique_id}</span>
                                <span>₱{Math.abs(order.order_amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="soc-footer">
                                <span className="soc-date">
                                    {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                                </span>
                                {order.order_status === 'pending' && (
                                    <button className="soc-process-btn" onClick={() => setProcessing(order._id)}>
                                        🔄 Start Processing
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
                {filteredOrders.length === 0 && <div className="staff-empty">No orders found</div>}
            </div>
        </div>
    );
};

export default StaffOrders;
