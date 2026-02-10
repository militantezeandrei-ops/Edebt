import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import './AdminCustomers.css';

const AdminCustomers = () => {
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formName, setFormName] = useState('');

    const userRole = localStorage.getItem('userRole');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [custRes, ordRes] = await Promise.all([
                axios.get(`${API_URL}/api/customers`),
                axios.get(`${API_URL}/api/orders`)
            ]);
            setCustomers(custRes.data);
            setOrders(ordRes.data);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filteredCustomers = useMemo(() => {
        let filtered = customers;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(c =>
                (c.name || '').toLowerCase().includes(term) ||
                (c.unique_id || '').toLowerCase().includes(term)
            );
        }
        switch (activeFilter) {
            case 'high_debt':
                filtered = filtered.filter(c => (c.balance || 0) > 100).sort((a, b) => b.balance - a.balance);
                break;
            case 'low_debt':
                filtered = filtered.filter(c => (c.balance || 0) > 0 && (c.balance || 0) <= 100);
                break;
            case 'no_debt':
                filtered = filtered.filter(c => (c.balance || 0) <= 0);
                break;
            case 'unpaid':
                filtered = filtered.filter(c => (c.balance || 0) > 0).sort((a, b) => b.balance - a.balance);
                break;
            default:
                break;
        }
        return filtered;
    }, [customers, searchTerm, activeFilter]);

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

    const openAddModal = () => {
        setEditingCustomer(null);
        setFormName('');
        setShowModal(true);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        setFormName(customer.name || '');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCustomer(null);
        setFormName('');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formName.trim()) return;

        try {
            if (editingCustomer) {
                await axios.put(`${API_URL}/api/customer/${editingCustomer._id}`, { name: formName.trim() }, {
                    headers: { 'x-user-role': userRole }
                });
                Swal.fire({ icon: 'success', title: 'Updated', timer: 1500, showConfirmButton: false });
            } else {
                const uid = `CUST-${Date.now()}`;
                await axios.post(`${API_URL}/api/customer`, { unique_id: uid, name: formName.trim() });
                Swal.fire({ icon: 'success', title: 'Customer Added', timer: 1500, showConfirmButton: false });
            }
            closeModal();
            fetchData();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Failed' });
        }
    };

    const handleDelete = async (customer) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Delete Customer?',
            text: `This will delete "${customer.name}" and all orders.`,
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Delete'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_URL}/api/customer/${customer._id}`, {
                    headers: { 'x-user-role': userRole }
                });
                Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false });
                fetchData();
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Failed' });
            }
        }
    };

    if (loading) return <div className="admin-loading"><div className="spinner"></div><p>Loading...</p></div>;

    const debtors = customers.filter(c => c.balance > 0);
    const totalDebt = customers.reduce((s, c) => s + (c.balance || 0), 0);

    return (
        <div className="admin-customers">
            {/* Toolbar */}
            <div className="admin-toolbar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input type="text" placeholder="Search customers..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button className="btn-add" onClick={openAddModal}>➕ Add Customer</button>
            </div>

            {/* Filter Chips */}
            <div className="filter-chips">
                {[
                    { id: 'all', label: 'All' },
                    { id: 'high_debt', label: '🔴 High Debt' },
                    { id: 'low_debt', label: '🟡 Low Debt' },
                    { id: 'no_debt', label: '🟢 No Debt' },
                    { id: 'unpaid', label: '⚠️ Unpaid' },
                ].map(f => (
                    <button key={f.id} className={`filter-chip ${activeFilter === f.id ? 'active' : ''}`}
                        onClick={() => setActiveFilter(f.id)}>{f.label}</button>
                ))}
            </div>

            {/* Stats */}
            <div className="customer-stats">
                <div className="stat-card">
                    <span className="stat-value">{customers.length}</span>
                    <span className="stat-label">Total</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">₱{totalDebt.toFixed(2)}</span>
                    <span className="stat-label">Total Debt</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{debtors.length}</span>
                    <span className="stat-label">With Balance</span>
                </div>
            </div>

            {/* Customer Cards */}
            <div className="customer-cards-list">
                {filteredCustomers.map(c => {
                    const isExpanded = expandedIds.has(c._id);
                    const customerOrders = isExpanded ? getCustomerOrders(c._id, c.unique_id) : [];

                    return (
                        <div key={c._id} className={`admin-customer-card ${isExpanded ? 'expanded' : ''}`}>
                            <div className="acc-header" onClick={() => toggleExpand(c._id)}>
                                <div className="acc-avatar">{(c.name || '?').charAt(0).toUpperCase()}</div>
                                <div className="acc-info">
                                    <span className="acc-name">{c.name || 'Unknown'}</span>
                                    <span className="acc-meta">ID: {c.unique_id}</span>
                                </div>
                                <div className={`acc-balance ${(c.balance || 0) > 0 ? 'debt' : 'clear'}`}>
                                    ₱{(c.balance || 0).toFixed(2)}
                                </div>
                                <div className="acc-actions" onClick={(e) => e.stopPropagation()}>
                                    <button className="btn-icon-edit" onClick={() => openEditModal(c)} title="Edit">✏️</button>
                                    <button className="btn-icon-delete" onClick={() => handleDelete(c)} title="Delete">🗑️</button>
                                </div>
                                <div className="acc-expand">{isExpanded ? '▲' : '▼'}</div>
                            </div>

                            {isExpanded && (
                                <div className="acc-drawer">
                                    <h5>📦 Borrowed Items & Payments</h5>
                                    {customerOrders.length > 0 ? (
                                        <table className="acc-orders-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Description</th>
                                                    <th>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {customerOrders.map(order => (
                                                    <tr key={order._id} className={order.order_amount < 0 ? 'payment-row' : ''}>
                                                        <td className="od-date">{new Date(order.createdAt).toLocaleDateString()}</td>
                                                        <td>{order.order_description || order.order_name}</td>
                                                        <td className={`od-amount ${order.order_amount < 0 ? 'payment' : 'charge'}`}>
                                                            {order.order_amount < 0 ? '−' : '+'}₱{Math.abs(order.order_amount || 0).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="acc-empty">No items or payments found</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                {filteredCustomers.length === 0 && <div className="empty-state">No customers matching your filter</div>}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="customer-modal-overlay" onClick={closeModal}>
                    <div className="customer-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingCustomer ? '✏️ Edit Customer' : '➕ New Customer'}</h3>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            {editingCustomer && (
                                <div className="modal-field">
                                    <label>Customer ID</label>
                                    <input type="text" value={editingCustomer.unique_id} disabled className="disabled-input" />
                                </div>
                            )}
                            <div className="modal-field">
                                <label>Customer Name *</label>
                                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Enter customer name" required autoFocus />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn-save">{editingCustomer ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCustomers;
