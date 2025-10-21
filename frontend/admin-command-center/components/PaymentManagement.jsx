/**
 * Payment Management Component
 * Handle payment tracking and collection
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PaymentManagement() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/payments/pending');
      // Extract data from API response { success, data, count, totalAmount, timestamp }
      setPayments(response.data.data || []);
      console.log('✅ Payments loaded:', response.data.count, 'pending');
    } catch (error) {
      console.error('❌ Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading payments...</div>;

  return (
    <div className="payment-management">
      <h2>💳 Payment Management</h2>
      <p>Total Pending: ${payments.reduce((sum, p) => sum + (p.monto || 0), 0).toFixed(0)}</p>
      <table className="payments-table">
        <thead>
          <tr>
            <th>Member ID</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Days Overdue</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(payment => (
            <tr key={payment.id}>
              <td>{payment.member_id}</td>
              <td>${payment.monto ? payment.monto.toFixed(0) : '0'}</td>
              <td>{new Date(payment.fecha_vencimiento).toLocaleDateString()}</td>
              <td className={payment.daysOverdue > 0 ? 'overdue' : ''}>
                {payment.daysOverdue > 0 ? `+${payment.daysOverdue}` : 'On time'}
              </td>
              <td>
                <span className={`status-badge ${payment.estado}`}>
                  {payment.estado}
                </span>
              </td>
              <td>
                <button className="btn-sm">Send Reminder</button>
                <button className="btn-sm">Mark Paid</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
