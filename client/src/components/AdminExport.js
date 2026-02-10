import React, { useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import './AdminExport.css';

const AdminExport = () => {
    const [loading, setLoading] = useState(false);
    const userRole = localStorage.getItem('userRole');
    const headers = { 'x-user-role': userRole };

    const exportCustomersPDF = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/export/customers`, { headers });
            const customers = res.data;

            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text('E-Debt — Customer Report', 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

            autoTable(doc, {
                startY: 36,
                head: [['Name', 'ID', 'Email', 'Phone', 'Balance', 'Status']],
                body: customers.map(c => [
                    c.name || 'Unknown',
                    c.unique_id,
                    c.email || '—',
                    c.phone || '—',
                    `₱${(c.balance || 0).toFixed(2)}`,
                    c.is_active ? 'Active' : 'Inactive'
                ]),
                styles: { fontSize: 9 },
                headStyles: { fillColor: [99, 102, 241] }
            });

            doc.save('E-Debt_Customers.pdf');
            Swal.fire({ icon: 'success', title: 'Exported!', text: 'Customer PDF downloaded', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to export customer data' });
        } finally {
            setLoading(false);
        }
    };

    const exportOrdersPDF = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/export/orders`, { headers });
            const orders = res.data;

            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text('E-Debt — Orders Report', 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

            autoTable(doc, {
                startY: 36,
                head: [['Date', 'Customer', 'Order', 'Amount', 'Status']],
                body: orders.map(o => [
                    new Date(o.createdAt).toLocaleDateString(),
                    o.customer_name || 'Unknown',
                    o.order_name,
                    `₱${Math.abs(o.order_amount || 0).toFixed(2)}`,
                    o.order_status
                ]),
                styles: { fontSize: 9 },
                headStyles: { fillColor: [99, 102, 241] }
            });

            doc.save('E-Debt_Orders.pdf');
            Swal.fire({ icon: 'success', title: 'Exported!', text: 'Orders PDF downloaded', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to export order data' });
        } finally {
            setLoading(false);
        }
    };

    const exportBillingPDF = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/export/customers`, { headers });
            const debtors = res.data.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);

            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text('E-Debt — Billing Report', 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

            const totalDebt = debtors.reduce((s, c) => s + c.balance, 0);
            doc.text(`Total Outstanding: ₱${totalDebt.toFixed(2)}`, 14, 38);

            autoTable(doc, {
                startY: 44,
                head: [['Name', 'ID', 'Balance', 'Last Transaction']],
                body: debtors.map(c => [
                    c.name || 'Unknown',
                    c.unique_id,
                    `₱${c.balance.toFixed(2)}`,
                    c.last_transaction_date ? new Date(c.last_transaction_date).toLocaleDateString() : '—'
                ]),
                styles: { fontSize: 9 },
                headStyles: { fillColor: [239, 68, 68] }
            });

            doc.save('E-Debt_Billing.pdf');
            Swal.fire({ icon: 'success', title: 'Exported!', text: 'Billing PDF downloaded', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to export billing data' });
        } finally {
            setLoading(false);
        }
    };

    const exportFinancialReportPDF = async () => {
        setLoading(true);
        const shopName = localStorage.getItem('shopName') || 'E-Debt Store';
        const ownerName = localStorage.getItem('ownerName') || 'Admin';

        // Show loading state
        Swal.fire({
            title: 'Generating Report...',
            text: 'Please wait while we compile your financial data.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const res = await axios.get(`${API_URL}/api/customers`, { headers });
            const customers = res.data;

            const doc = new jsPDF({ format: 'letter' });
            const dateStr = new Date().toLocaleDateString();

            // Header
            doc.setFontSize(20);
            doc.setTextColor(40, 40, 40);
            doc.text(`${shopName} - Financial Report`, 14, 22);

            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated by: ${ownerName}`, 14, 30);
            doc.text(`Date: ${dateStr}`, 14, 36);

            // Customer Debts Section
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text("Customer Debt Summary", 14, 50);

            const debtData = customers
                .sort((a, b) => b.balance - a.balance)
                .map(c => [
                    c.name || 'Unknown',
                    c.unique_id,
                    `P ${(c.balance || 0).toFixed(2)}`
                ]);

            const totalDebt = customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0);

            autoTable(doc, {
                startY: 55,
                head: [['Customer Name', 'ID', 'Outstanding Balance']],
                body: [...debtData, ['', 'TOTAL DEBT', `P ${totalDebt.toFixed(2)}`]],
                theme: 'striped',
                headStyles: { fillColor: [220, 38, 38] },
                styles: { fontSize: 10 },
                footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
            });

            doc.save(`Financial_Report_${dateStr.replace(/\//g, '-')}.pdf`);

            Swal.fire({
                icon: 'success',
                title: 'Export Complete',
                text: 'Your PDF report has been downloaded.',
                confirmButtonColor: '#6366f1'
            });

        } catch (err) {
            console.error("Export failed:", err);
            Swal.fire({
                icon: 'error',
                title: 'Export Failed',
                text: 'Could not generate PDF. Please check connection.',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const exportCustomersCSV = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/export/customers`, { headers });
            const customers = res.data;

            const csvRows = [
                ['Name', 'ID', 'Email', 'Phone', 'Balance', 'Status', 'Created'],
                ...customers.map(c => [
                    `"${c.name || ''}"`,
                    c.unique_id,
                    `"${c.email || ''}"`,
                    `"${c.phone || ''}"`,
                    (c.balance || 0).toFixed(2),
                    c.is_active ? 'Active' : 'Inactive',
                    new Date(c.createdAt).toLocaleDateString()
                ])
            ];

            const csv = csvRows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'E-Debt_Customers.csv';
            a.click();
            URL.revokeObjectURL(url);

            Swal.fire({ icon: 'success', title: 'Exported!', text: 'Customer CSV downloaded', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to export' });
        } finally {
            setLoading(false);
        }
    };

    const exportOrdersCSV = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/export/orders`, { headers });
            const orders = res.data;

            const csvRows = [
                ['Date', 'Customer', 'Order', 'Description', 'Amount', 'Status'],
                ...orders.map(o => [
                    new Date(o.createdAt).toLocaleDateString(),
                    `"${o.customer_name || ''}"`,
                    `"${o.order_name || ''}"`,
                    `"${(o.order_description || '').replace(/"/g, '""')}"`,
                    (o.order_amount || 0).toFixed(2),
                    o.order_status
                ])
            ];

            const csv = csvRows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'E-Debt_Orders.csv';
            a.click();
            URL.revokeObjectURL(url);

            Swal.fire({ icon: 'success', title: 'Exported!', text: 'Orders CSV downloaded', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to export' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-export">
            <p className="export-intro">Export your system data in PDF or Excel-compatible CSV format.</p>

            {loading && (
                <div className="export-loading">
                    <div className="spinner"></div>
                    <span>Generating export...</span>
                </div>
            )}

            <div className="export-grid">
                {/* Customers */}
                <div className="export-card">
                    <div className="export-card-icon">👥</div>
                    <h3>Customer Records</h3>
                    <p>All customer details including balances and contact info</p>
                    <div className="export-actions">
                        <button className="btn-export pdf" onClick={exportCustomersPDF} disabled={loading}>📕 PDF</button>
                        <button className="btn-export csv" onClick={exportCustomersCSV} disabled={loading}>📗 CSV/Excel</button>
                    </div>
                </div>

                {/* Orders */}
                <div className="export-card">
                    <div className="export-card-icon">📦</div>
                    <h3>Order Records</h3>
                    <p>Complete order history with customer associations</p>
                    <div className="export-actions">
                        <button className="btn-export pdf" onClick={exportOrdersPDF} disabled={loading}>📕 PDF</button>
                        <button className="btn-export csv" onClick={exportOrdersCSV} disabled={loading}>📗 CSV/Excel</button>
                    </div>
                </div>

                {/* Billing */}
                <div className="export-card">
                    <div className="export-card-icon">💳</div>
                    <h3>Billing Report</h3>
                    <p>Outstanding debts and billing summary for collections</p>
                    <div className="export-actions">
                        <button className="btn-export pdf" onClick={exportBillingPDF} disabled={loading}>📕 PDF</button>
                    </div>
                </div>

                {/* Financial Report Summary */}
                <div className="export-card">
                    <div className="export-card-icon">📊</div>
                    <h3>Financial Report</h3>
                    <p>Complete summary of debts and store financial status</p>
                    <div className="export-actions">
                        <button className="btn-export pdf" onClick={exportFinancialReportPDF} disabled={loading}>📕 PDF Report</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminExport;
