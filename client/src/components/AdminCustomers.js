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
    const [formCustomerType, setFormCustomerType] = useState('Regular');
    const [formPaymentStatus, setFormPaymentStatus] = useState('Not Paid');
    const [formPartialAmount, setFormPartialAmount] = useState('');
    const [saving, setSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

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

    // Reset pagination on filter/search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeFilter]);

    const filteredCustomers = useMemo(() => {
        let filtered = customers;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(c =>
                (c.name || '').toLowerCase().includes(term) ||
                (c.unique_id || '').toLowerCase().includes(term) ||
                (c.customer_type || '').toLowerCase().includes(term) ||
                (c.employment_status || '').toLowerCase().includes(term)
            );
        }
        switch (activeFilter) {
            case 'regular':
                filtered = filtered.filter(c => {
                    const type = (c.customer_type || '').toLowerCase();
                    const status = (c.employment_status || '').toLowerCase();
                    return type === 'regular' || (status === 'regular') || (type === '' && status === '');
                });
                break;
            case 'non_regular':
                filtered = filtered.filter(c => {
                    const type = (c.customer_type || '').toLowerCase();
                    const status = (c.employment_status || '').toLowerCase();
                    return type.includes('non') || status.includes('non') || status.includes('outsourcer');
                });
                break;
            case 'high_debt':
                filtered = filtered.filter(c => (c.balance || 0) >= 501);
                break;
            case 'low_debt':
                filtered = filtered.filter(c => (c.balance || 0) > 0 && (c.balance || 0) < 500);
                break;
            case 'paid':
                filtered = filtered.filter(c => c.payment_status === 'Paid');
                break;
            case 'unpaid':
                filtered = filtered.filter(c => c.payment_status !== 'Paid');
                break;
            case 'recent':
                // Sort by the latest transaction date (which is typically the most recent order's createdAt)
                filtered = [...filtered].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
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
        setFormCustomerType('Regular');
        setFormPaymentStatus('Not Paid');
        setFormPartialAmount('');
        setShowModal(true);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        setFormName(customer.name || '');
        setFormCustomerType(customer.customer_type || 'Regular');
        setFormPaymentStatus(customer.payment_status || 'Not Paid');
        setFormPartialAmount('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCustomer(null);
        setFormName('');
        setFormCustomerType('Regular');
        setFormPaymentStatus('Not Paid');
        setFormPartialAmount('');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formName.trim() || saving) return;
        setSaving(true);

        try {
            const payload = {
                name: formName.trim(),
                customer_type: formCustomerType === 'Regular' ? 'Regular' : 'Non-Regular',
                payment_status: formPaymentStatus
            };

            if (editingCustomer) {
                await axios.put(`${API_URL}/api/customer/${editingCustomer._id}`, payload, {
                    headers: {
                        'x-user-role': userRole,
                        'x-username': localStorage.getItem('username')
                    }
                });

                // Automation: If Partial, record a payment transaction using dedicated endpoint
                const partialAmt = parseFloat(formPartialAmount);
                if (formPaymentStatus === 'Partial' && partialAmt > 0) {
                    console.log('[AdminCustomers] Recording partial payment:', partialAmt);
                    await axios.post(`${API_URL}/api/customer/${editingCustomer._id}/payment`, {
                        amount: partialAmt,
                        note: `Partial payment received via Admin Edit`
                    }, {
                        headers: {
                            'x-user-role': userRole,
                            'x-username': localStorage.getItem('username') || 'Admin'
                        }
                    });
                }

                Swal.fire({ icon: 'success', title: 'Updated', timer: 1500, showConfirmButton: false });
            } else {
                const uid = `CUST-${Date.now()}`;
                await axios.post(`${API_URL}/api/customer`, { ...payload, unique_id: uid }, {
                    headers: {
                        'x-user-role': userRole,
                        'x-username': localStorage.getItem('username')
                    }
                });
                Swal.fire({ icon: 'success', title: 'Customer Added', timer: 1500, showConfirmButton: false });
            }
            closeModal();
            fetchData();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Failed' });
        } finally {
            setSaving(false);
        }
    };

    const handleActionCheck = (customer) => {
        Swal.fire({
            title: 'Payment Status Check',
            html: `
                <div style="font-size: 1.2rem; margin: 10px 0;">
                    <b>Status:</b> 
                    <span style="color: ${customer.payment_status === 'Paid' ? '#10b981' : '#ef4444'}; font-weight: bold;">
                        ${customer.payment_status || 'Not Paid'}
                    </span>
                </div>
            `,
            icon: customer.payment_status === 'Paid' ? 'success' : 'info',
            confirmButtonText: 'Close',
            confirmButtonColor: '#4f46e5'
        });
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
                    { id: 'regular', label: '👤 Regular' },
                    { id: 'non_regular', label: '👥 Non-Regular' },
                    { id: 'low_debt', label: '🟢 Low Debt' },
                    { id: 'high_debt', label: '🔴 High Debt' },
                    { id: 'unpaid', label: '❌ Unpaid' },
                    { id: 'paid', label: '✅ Paid' },
                    { id: 'recent', label: '🕒 Recent' }
                ].map(f => (
                    <button key={f.id} className={`filter-chip ${activeFilter === f.id ? 'active' : ''}`}
                        onClick={() => setActiveFilter(f.id)}>{f.label}</button>
                ))}
            </div>

            {/* Stats */}
            <div className="customer-stats">
                <div className="stat-card">
                    <span className="stat-value">{customers.length}</span>
                    <span className="stat-label">Total Customers</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">P {totalDebt.toFixed(2)}</span>
                    <span className="stat-label">Total Debt</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{debtors.length}</span>
                    <span className="stat-label">With Balance</span>
                </div>
            </div>

            {/* Customer List Header */}
            <div className="admin-list-header">
                <div className="alh-col name">👤 Customer Name</div>
                <div className="alh-col type">🏷️ Type</div>
                <div className="alh-col status">💳 Status</div>
                <div className="alh-col debt">💰 Debt</div>
                <div className="alh-col actions">⚙️ Actions</div>
                <div className="alh-col expand"></div>
            </div>

            {/* Customer Cards */}
            <div className="customer-cards-list">
                {filteredCustomers
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map(c => {
                        const isExpanded = expandedIds.has(c._id);
                        const customerOrders = isExpanded ? getCustomerOrders(c._id, c.unique_id) : [];

                        return (
                            <div key={c._id} className={`admin-customer-card ${isExpanded ? 'expanded' : ''}`}>
                                <div className="acc-header" onClick={() => toggleExpand(c._id)}>
                                    <div className="acc-col name-col">
                                        <div className="acc-avatar">{(c.name || '?').charAt(0).toUpperCase()}</div>
                                        <div className="acc-info">
                                            <span className="acc-name">{c.name || 'Unknown'}</span>
                                            <span className="acc-sub-id">#{c.unique_id.slice(-6)}</span>
                                        </div>
                                    </div>

                                    <div className="acc-col type-col">
                                        <span className={`acc-badge ${(c.customer_type || '').toLowerCase().includes('non') || (c.employment_status || '').toLowerCase() === 'outsourcer' ? 'non-regular' : 'regular'}`}>
                                            {(c.customer_type || '').toLowerCase().includes('non') || (c.employment_status || '').toLowerCase() === 'outsourcer' ? 'Non-Regular' : 'Regular'}
                                        </span>
                                    </div>

                                    <div className="acc-col status-col">
                                        <div className={`acc-status-indicator ${c.payment_status === 'Paid' ? 'paid' : c.payment_status === 'Partial' ? 'partial' : 'unpaid'}`}>
                                            {c.payment_status || 'Not Paid'}
                                        </div>
                                    </div>

                                    <div className="acc-col debt-col">
                                        <div className={`acc-balance ${(c.balance || 0) > 0 && c.payment_status !== 'Paid' ? 'debt' : 'clear'}`}>
                                            P {(c.balance || 0).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="acc-col actions-col" onClick={(e) => e.stopPropagation()}>
                                        <button className="btn-icon-edit" onClick={() => openEditModal(c)} title="Edit">✏️</button>
                                        <button className="btn-icon-delete" onClick={() => handleDelete(c)} title="Delete">🗑️</button>
                                    </div>

                                    <div className="acc-col expand-col">
                                        <div className="acc-expand-icon">{isExpanded ? '▲' : '▼'}</div>
                                    </div>
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
                                                                {order.order_amount < 0 ? '−' : ''}₱{Math.abs(order.order_amount || 0).toFixed(2)}
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

            {/* Pagination Controls */}
            {filteredCustomers.length > ITEMS_PER_PAGE && (
                <div className="pagination">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="page-btn"
                    >
                        ← Prev
                    </button>

                    <div className="page-info">
                        Page <b>{currentPage}</b> of {Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)}
                    </div>

                    <button
                        disabled={currentPage >= Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="page-btn"
                    >
                        Next →
                    </button>
                </div>
            )}

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
                            <div className="modal-row">
                                <div className="modal-field">
                                    <label>Customer Type</label>
                                    <select value={formCustomerType} onChange={(e) => setFormCustomerType(e.target.value)}>
                                        <option value="Regular">Regular</option>
                                        <option value="Non-Regular">Non-Regular</option>
                                    </select>
                                </div>
                                <div className="modal-field">
                                    <label>Payment Status</label>
                                    <select value={formPaymentStatus} onChange={(e) => setFormPaymentStatus(e.target.value)}>
                                        <option value="Not Paid">Not Paid</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Partial">Partial</option>
                                    </select>
                                </div>
                            </div>
                            {editingCustomer && (
                                <div className="modal-balance-display">
                                    <div className="balance-info-row">
                                        <span>Current Balance:</span>
                                        <span className="current-amt">₱{(editingCustomer.balance || 0).toFixed(2)}</span>
                                    </div>
                                    {formPaymentStatus === 'Partial' && parseFloat(formPartialAmount) > 0 && (
                                        <div className="balance-info-row projected">
                                            <span>Remaining After Payment:</span>
                                            <span className="projected-amt">
                                                ₱{Math.max(0, (editingCustomer.balance || 0) - parseFloat(formPartialAmount)).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {formPaymentStatus === 'Partial' && (
                                <div className="modal-field animate-pulse-subtle">
                                    <label>Partial Payment Amount (₱) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formPartialAmount}
                                        onChange={(e) => setFormPartialAmount(e.target.value)}
                                        placeholder="Enter amount paid"
                                        required
                                        className="partial-amount-input"
                                        autoFocus
                                    />
                                    <p className="field-hint">Entering an amount will show the projected balance above.</p>
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving...' : (editingCustomer ? 'Update' : 'Add')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCustomers;
