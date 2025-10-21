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
      const response = await axios.get('/api/admin/payments/pending');
      setPayments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading payments...</div>;

  return (
    <div className="payment-management">
      <h2>💳 Payment Management</h2>
      <p>Total Pending: ${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</p>
      <table className="payments-table">
        <thead>
          <tr>
            <th>Member</th>
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
              <td>{payment.member_name}</td>
              <td>${payment.amount.toFixed(2)}</td>
              <td>{new Date(payment.due_date).toLocaleDateString()}</td>
              <td className={payment.days_overdue > 0 ? 'overdue' : ''}>
                {payment.days_overdue > 0 ? `+${payment.days_overdue}` : 'On time'}
              </td>
              <td>
                <span className={`status-badge ${payment.status}`}>
                  {payment.status}
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
