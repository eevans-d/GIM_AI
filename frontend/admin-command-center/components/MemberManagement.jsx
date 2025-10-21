/**
 * Member Management Component
 * View and manage gym members
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function MemberManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMembers();
  }, [filter]);

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`/api/admin/members/list?filter=${filter}`);
      setMembers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setLoading(false);
    }
  };

  const withDebtCount = members.filter(m => m.deuda_actual > 0).length;
  const activeCount = members.filter(m => m.estado === 'activo').length;
  const inactiveCount = members.length - activeCount;

  if (loading) return <div>Loading members...</div>;

  return (
    <div className="member-management">
      <h2>👥 Member Management</h2>
      <div className="filter-controls">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Members ({members.length})
        </button>
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Active ({activeCount})
        </button>
        <button
          className={filter === 'inactive' ? 'active' : ''}
          onClick={() => setFilter('inactive')}
        >
          Inactive ({inactiveCount})
        </button>
        <button
          className={filter === 'debt' ? 'active' : ''}
          onClick={() => setFilter('debt')}
        >
          With Debt ({withDebtCount})
        </button>
      </div>

      <table className="members-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Joined</th>
            <th>Status</th>
            <th>Debt</th>
            <th>Last Checkin</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.id}>
              <td>{member.nombre}</td>
              <td>{member.telefono}</td>
              <td>{new Date(member.fecha_adhesion).toLocaleDateString()}</td>
              <td>
                <span className={`status-badge ${member.estado}`}>
                  {member.estado}
                </span>
              </td>
              <td className={member.deuda_actual > 0 ? 'debt' : ''}>
                ${member.deuda_actual.toFixed(2)}
              </td>
              <td>{member.ultimo_checkin ? new Date(member.ultimo_checkin).toLocaleDateString() : 'Never'}</td>
              <td>
                <button className="btn-sm">View</button>
                <button className="btn-sm danger">Block</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .member-management {
          padding: 20px 0;
        }

        .filter-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-controls button {
          padding: 8px 16px;
          background: #ecf0f1;
          border: 2px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s;
        }

        .filter-controls button:hover {
          background: #d5dbdb;
        }

        .filter-controls button.active {
          background: #3498db;
          color: white;
          border-color: #2980b9;
        }

        .members-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .members-table thead {
          background: #34495e;
          color: white;
        }

        .members-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }

        .members-table td {
          padding: 12px;
          border-bottom: 1px solid #ecf0f1;
        }

        .members-table tbody tr:hover {
          background: #f8f9fa;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.activo {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.inactivo {
          background: #f8d7da;
          color: #721c24;
        }

        .status-badge.suspendido {
          background: #fff3cd;
          color: #856404;
        }

        .members-table td.debt {
          color: #e74c3c;
          font-weight: 600;
        }

        .btn-sm {
          padding: 4px 8px;
          margin: 0 4px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .btn-sm.danger {
          background: #e74c3c;
        }

        .btn-sm:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
