/**
 * Admin Command Center - Main Dashboard
 * Centralized control panel for gym admin
 * 
 * SEMANA 2 UX Improvement #1
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminCommandCenter.css';

// Sub-components
import MetricsCard from './components/MetricsCard';
import QuickActionsBar from './components/QuickActionsBar';
import ClassManagement from './components/ClassManagement';
import MemberManagement from './components/MemberManagement';
import PaymentManagement from './components/PaymentManagement';
import ReportsPanel from './components/ReportsPanel';

export default function AdminCommandCenter() {
  const [metrics, setMetrics] = useState({
    activeMembers: 0,
    todayCheckins: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    classOccupancy: 0,
    churnRisk: 0
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Fetch metrics on component mount
  useEffect(() => {
    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/metrics/dashboard');
      // Extract data from response (API returns { success, data, timestamp })
      setMetrics(response.data.data || response.data);
      setError(null);
      console.log('✅ Metrics loaded successfully', response.data.data);
    } catch (err) {
      console.error('❌ Failed to fetch metrics:', err);
      setError('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    try {
      switch (action) {
        case 'pause-classes':
          await pauseAllClasses();
          break;
        case 'send-reminders':
          await sendReminders();
          break;
        case 'generate-report':
          await generateReport();
          break;
        default:
          break;
      }
      addNotification(`${action} executed successfully`, 'success');
    } catch (error) {
      addNotification(`Failed to execute ${action}`, 'error');
    }
  };

  const pauseAllClasses = async () => {
    const response = await axios.post('/api/admin/classes/pause-all');
    return response.data;
  };

  const sendReminders = async () => {
    const response = await axios.post('/api/admin/reminders/send-batch');
    return response.data;
  };

  const generateReport = async () => {
    const response = await axios.post('/api/admin/reports/generate');
    return response.data;
  };

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  if (loading && !metrics.activeMembers) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="admin-command-center">
      {/* Header */}
      <header className="acc-header">
        <h1>🎯 Admin Command Center</h1>
        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchMetrics}>
            ↻ Refresh
          </button>
          <span className="last-updated">
            Updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </header>

      {/* Quick Actions Bar */}
      <QuickActionsBar onAction={handleQuickAction} />

      {/* Notifications */}
      <div className="notifications">
        {notifications.map(notif => (
          <div key={notif.id} className={`notification ${notif.type}`}>
            {notif.message}
          </div>
        ))}
      </div>

      {/* Main Dashboard Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab ${activeTab === 'classes' ? 'active' : ''}`}
          onClick={() => setActiveTab('classes')}
        >
          📅 Classes
        </button>
        <button
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          👥 Members
        </button>
        <button
          className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          💳 Payments
        </button>
        <button
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📈 Reports
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-view">
            {/* Key Metrics */}
            <div className="metrics-grid">
              <MetricsCard
                title="Active Members"
                value={metrics.activeMembers}
                icon="👥"
                trend="+12%"
              />
              <MetricsCard
                title="Today's Checkins"
                value={metrics.todayCheckins}
                icon="✅"
                trend={`+${Math.floor(Math.random() * 10)}`}
              />
              <MetricsCard
                title="Monthly Revenue"
                value={`$${metrics.monthlyRevenue.toLocaleString()}`}
                icon="💰"
                trend="+8%"
              />
              <MetricsCard
                title="Pending Payments"
                value={metrics.pendingPayments}
                icon="⚠️"
                trend="-5%"
              />
              <MetricsCard
                title="Class Occupancy"
                value={`${metrics.classOccupancy}%`}
                icon="📊"
                trend="+3%"
              />
              <MetricsCard
                title="Churn Risk"
                value={`${metrics.churnRisk}%`}
                icon="📉"
                trend="-2%"
              />
            </div>

            {/* Charts Section */}
            <div className="charts-section">
              <div className="chart-placeholder">
                <h3>Revenue Trend (Last 30 Days)</h3>
                <p>[Chart will be rendered here]</p>
              </div>
              <div className="chart-placeholder">
                <h3>Member Growth</h3>
                <p>[Chart will be rendered here]</p>
              </div>
            </div>

            {/* Alerts & Notifications */}
            <div className="alerts-section">
              <h3>🚨 Critical Alerts</h3>
              <div className="alert-list">
                <div className="alert alert-danger">
                  5 members with payment overdue ({'>'}60 days)
                </div>
                <div className="alert alert-warning">
                  2 classes at 100% capacity
                </div>
                <div className="alert alert-info">
                  Backup completed successfully
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'classes' && <ClassManagement />}
        {activeTab === 'members' && <MemberManagement />}
        {activeTab === 'payments' && <PaymentManagement />}
        {activeTab === 'reports' && <ReportsPanel />}
      </div>

      {/* Footer */}
      <footer className="acc-footer">
        <p>Last refresh: {new Date().toLocaleString()}</p>
      </footer>
    </div>
  );
}
