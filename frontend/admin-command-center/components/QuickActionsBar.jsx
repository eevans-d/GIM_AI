/**
 * Quick Actions Bar Component
 * Buttons for common admin actions
 */

import React from 'react';

export default function QuickActionsBar({ onAction }) {
  const actions = [
    { id: 'pause-classes', label: '⏸️ Pause All Classes', type: 'danger' },
    { id: 'send-reminders', label: '📬 Send Reminders', type: 'secondary' },
    { id: 'generate-report', label: '📊 Generate Report', type: 'primary' },
    { id: 'backup', label: '💾 Backup Data', type: 'secondary' },
    { id: 'send-survey', label: '📝 Send Survey', type: 'secondary' },
  ];

  return (
    <div className="quick-actions-bar">
      {actions.map(action => (
        <button
          key={action.id}
          className={`action-btn ${action.type}`}
          onClick={() => onAction(action.id)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
