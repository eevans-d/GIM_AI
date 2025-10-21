/**
 * Reports Panel Component
 * Generate and view reports
 */

import React, { useState } from 'react';
import axios from 'axios';

export default function ReportsPanel() {
  const [reports, setReports] = useState([]);
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = async (reportType) => {
    setGenerating(true);
    try {
      const response = await axios.post(`/api/admin/reports/generate`, {
        type: reportType,
        format: 'pdf'
      });
      setReports([response.data, ...reports]);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="reports-panel">
      <h2>📈 Reports</h2>
      <div className="report-generators">
        <button
          className="btn-generate"
          onClick={() => handleGenerateReport('monthly-revenue')}
          disabled={generating}
        >
          📊 Monthly Revenue
        </button>
        <button
          className="btn-generate"
          onClick={() => handleGenerateReport('member-engagement')}
          disabled={generating}
        >
          📍 Member Engagement
        </button>
        <button
          className="btn-generate"
          onClick={() => handleGenerateReport('payment-summary')}
          disabled={generating}
        >
          💰 Payment Summary
        </button>
        <button
          className="btn-generate"
          onClick={() => handleGenerateReport('class-stats')}
          disabled={generating}
        >
          📅 Class Statistics
        </button>
      </div>

      <h3>Recent Reports</h3>
      <table className="reports-table">
        <thead>
          <tr>
            <th>Report Type</th>
            <th>Generated</th>
            <th>Format</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center' }}>
                No reports generated yet
              </td>
            </tr>
          ) : (
            reports.map((report, idx) => (
              <tr key={idx}>
                <td>{report.type}</td>
                <td>{new Date(report.generated_at).toLocaleString()}</td>
                <td>{report.format.toUpperCase()}</td>
                <td>
                  <button className="btn-sm">Download</button>
                  <button className="btn-sm">Share</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
