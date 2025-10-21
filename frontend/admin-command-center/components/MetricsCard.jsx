/**
 * Metrics Card Component
 * Displays a single KPI metric
 */

import React from 'react';
import '../AdminCommandCenter.css';

export default function MetricsCard({ title, value, icon, trend }) {
  const isPositive = trend && trend.startsWith('+');
  
  return (
    <div className={`metrics-card ${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="metrics-card-header">
        <span className="metrics-card-title">{title}</span>
        <span className="metrics-card-icon">{icon}</span>
      </div>
      <div className="metrics-card-value">{value}</div>
      {trend && (
        <div className={`metrics-card-trend ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '📈' : '📉'} {trend}
        </div>
      )}
    </div>
  );
}
