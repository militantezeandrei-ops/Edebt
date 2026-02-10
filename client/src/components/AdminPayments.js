import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import './AdminPayments.css';

const AdminPayments = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [processing, setProcessing] = useState(false);

    const userRole = localStorage.getItem('userRole');

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/customers`);
            setCustomers(res.data.sort((a, b) => (b.balance || 0) - (a.balance || 0)));
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCustomers(); }, []);

    const handlePayment = async () => {
        if (!selectedCustomer || !paymentAmount || parseFloat(paymentAmount) <= 0) {
            Swal.fire({ icon: 'warning', title: 'Invalid', text: 'Select a customer and enter a valid amount.' });
            return;
        }

        const confirm = await Swal.fire({
            title: 'Confirm Payment',
            html: `Record <b>₱${parseFloat(paymentAmount).toFixed(2)}</b> payment for <b>${selectedCustomer.name}</b>?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Record Payment'
        });

        if (!confirm.isConfirmed) return;

        setProcessing(true);
        try {
            await axios.post(`${API_URL}/api/customer/${selectedCustomer._id}/payment`, {
                amount: paymentAmount,
                note: paymentNote
            }, { headers: { 'x-user-role': userRole } });

            Swal.fire({ icon: 'success', title: 'Payment Recorded!', timer: 1500, showConfirmButton: false });
            setPaymentAmount('');
            setPaymentNote('');
            setSelectedCustomer(null);
            fetchCustomers();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Failed to record payment' });
        } finally {
            setProcessing(false);
        }
    };

    const debtors = customers.filter(c => c.balance > 0);
    const filtered = searchTerm
        ? debtors.filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
        : debtors;

    if (loading) return <div className="admin-loading"><div className="spinner"></div><p>Loading...</p></div>;

    return (
        <div className="admin-payments">
            {/* Record Payment — redesigned to match Outstanding Debt */}
            <div className="payment-card">
                <h3>💰 Record Payment</h3>

                {/* Customer Selection */}
                <div className="pay-field">
                    <label>Customer</label>
                    {selectedCustomer ? (
                        <div className="selected-customer">
                            <div className="sc-row">
                                <div className="sc-avatar">{(selectedCustomer.name || '?').charAt(0).toUpperCase()}</div>
                                <div className="sc-info">
                                    <span className="sc-name">{selectedCustomer.name}</span>
                                    <span className="sc-balance">Balance: ₱{(selectedCustomer.balance || 0).toFixed(2)}</span>
                                </div>
                                <button className="btn-change" onClick={() => setSelectedCustomer(null)}>Change</button>
                            </div>
                        </div>
                    ) : (
                        <div className="customer-selector">
                            <input
                                type="text"
                                placeholder="Search customers with balance..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="customer-dropdown">
                                {filtered.map(c => (
                                    <button key={c._id} className="dropdown-item"
                                        onClick={() => { setSelectedCustomer(c); setSearchTerm(''); }}>
                                        <div className="dd-left">
                                            <span className="dd-avatar">{(c.name || '?').charAt(0).toUpperCase()}</span>
                                            <span className="dd-name">{c.name || 'Unknown'}</span>
                                        </div>
                                        <span className="dd-balance">₱{(c.balance || 0).toFixed(2)}</span>
                                    </button>
                                ))}
                                {filtered.length === 0 && <div className="dropdown-empty">No customers with balance</div>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pay-field">
                    <label>Amount (₱)</label>
                    <input type="number" min="0" step="0.01" value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
                    {selectedCustomer && paymentAmount && (
                        <div className="payment-preview">
                            New balance: ₱{Math.max(0, (selectedCustomer.balance || 0) - parseFloat(paymentAmount || 0)).toFixed(2)}
                        </div>
                    )}
                </div>

                <div className="pay-field">
                    <label>Note (optional)</label>
                    <input type="text" value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)} placeholder="e.g. Cash payment" />
                </div>

                <button className="btn-record-payment" onClick={handlePayment}
                    disabled={!selectedCustomer || !paymentAmount || processing}>
                    {processing ? 'Recording...' : '✅ Record Payment'}
                </button>
            </div>

            {/* Outstanding Debts */}
            <div className="payment-card">
                <h3>📊 Outstanding Debts</h3>
                <div className="debt-summary">
                    <div className="ds-card">
                        <span className="ds-value">{debtors.length}</span>
                        <span className="ds-label">Debtors</span>
                    </div>
                    <div className="ds-card">
                        <span className="ds-value">₱{debtors.reduce((s, c) => s + c.balance, 0).toFixed(2)}</span>
                        <span className="ds-label">Total Outstanding</span>
                    </div>
                </div>

                <div className="debt-list">
                    {debtors.map(c => (
                        <div key={c._id}
                            className={`debt-item ${selectedCustomer?._id === c._id ? 'selected' : ''}`}
                            onClick={() => setSelectedCustomer(c)}>
                            <div className="di-avatar">{(c.name || '?').charAt(0).toUpperCase()}</div>
                            <div className="di-info">
                                <span className="di-name">{c.name || 'Unknown'}</span>
                                <span className="di-date">
                                    {c.last_transaction_date
                                        ? `Last: ${new Date(c.last_transaction_date).toLocaleDateString()}`
                                        : 'No activity'}
                                </span>
                            </div>
                            <span className="di-amount">₱{c.balance.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminPayments;
