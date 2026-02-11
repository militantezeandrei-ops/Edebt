import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import './AdminOrders.css';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/orders`);
            setOrders(res.data);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, []);

    const filteredOrders = useMemo(() => {
        let result = orders;
        if (statusFilter !== 'all') {
            result = result.filter(o => o.order_status === statusFilter);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(o =>
                (o.order_name || '').toLowerCase().includes(term) ||
                (o.customer_name || '').toLowerCase().includes(term) ||
                (o.customer_unique_id || '').toLowerCase().includes(term)
            );
        }
        return result;
    }, [orders, searchTerm, statusFilter]);

    const updateStatus = async (orderId, newStatus) => {
        try {
            await axios.put(`${API_URL}/api/order/${orderId}/status`, { status: newStatus });
            Swal.fire({ icon: 'success', title: 'Status Updated', timer: 1000, showConfirmButton: false });
            fetchOrders();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update status' });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#f59e0b';
            case 'processing': return '#3b82f6';
            case 'completed': return '#10b981';
            case 'cancelled': return '#ef4444';
            default: return '#888';
        }
    };

    const statusCounts = useMemo(() => {
        const counts = { all: orders.length, pending: 0, processing: 0, completed: 0, cancelled: 0 };
        orders.forEach(o => { if (counts[o.order_status] !== undefined) counts[o.order_status]++; });
        return counts;
    }, [orders]);

    if (loading) return <div className="admin-loading"><div className="spinner"></div><p>Loading orders...</p></div>;

    return (
        <div className="admin-orders">
            {/* Filters */}
            <div className="admin-toolbar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Status Chips */}
            <div className="status-chips">
                {['all', 'pending', 'processing', 'completed', 'cancelled'].map(status => (
                    <button
                        key={status}
                        className={`status-chip ${statusFilter === status ? 'active' : ''}`}
                        onClick={() => setStatusFilter(status)}
                        style={statusFilter === status ? { borderColor: getStatusColor(status), color: getStatusColor(status) } : {}}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
                    </button>
                ))}
            </div>

            {/* Orders Table */}
            <div className="orders-table-wrapper">
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order._id}>
                                <td>
                                    <div className="order-name">{order.order_name}</div>
                                    <div className="order-desc">{order.order_description || ''}</div>
                                </td>
                                <td className="cell-customer">
                                    {order.customer_name || order.customer_unique_id}
                                </td>
                                <td className={order.order_amount < 0 ? 'cell-payment' : 'cell-amount'}>
                                    {order.order_amount < 0 ? '-' : ''}P {Math.abs(order.order_amount || 0).toFixed(2)}
                                </td>
                                <td>
                                    <span className="status-badge" style={{ background: getStatusColor(order.order_status) + '22', color: getStatusColor(order.order_status), borderColor: getStatusColor(order.order_status) }}>
                                        {order.order_status}
                                    </span>
                                </td>
                                <td className="cell-date">
                                    {new Date(order.createdAt).toLocaleDateString()}<br />
                                    <small>{new Date(order.createdAt).toLocaleTimeString()}</small>
                                </td>
                                <td>
                                    <select
                                        className="status-select"
                                        value={order.order_status}
                                        onChange={(e) => updateStatus(order._id, e.target.value)}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                            <tr><td colSpan="6" className="empty-row">No orders found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminOrders;
