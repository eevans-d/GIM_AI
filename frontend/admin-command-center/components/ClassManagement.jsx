/**
 * Class Management Component
 * Manage classes, schedule, and occupancy
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/classes/list');
      // Extract data from API response { success, data, count, timestamp }
      setClasses(response.data.data || []);
      console.log('✅ Classes loaded:', response.data.count, 'classes');
    } catch (error) {
      console.error('❌ Failed to fetch classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseClass = async (classId) => {
    try {
      await axios.post(`/api/admin/classes/${classId}/pause`);
      fetchClasses();
    } catch (error) {
      console.error('Failed to pause class:', error);
    }
  };

  const handleResumeClass = async (classId) => {
    try {
      await axios.post(`/api/admin/classes/${classId}/resume`);
      fetchClasses();
    } catch (error) {
      console.error('Failed to resume class:', error);
    }
  };

  if (loading) return <div>Loading classes...</div>;

  return (
    <div className="class-management">
      <h2>📅 Class Management</h2>
      <table className="classes-table">
        <thead>
          <tr>
            <th>Class Name</th>
            <th>Instructor</th>
            <th>Schedule</th>
            <th>Occupancy</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {classes.map(cls => (
            <tr key={cls.id}>
              <td>{cls.nombre}</td>
              <td>{cls.instructor_id}</td>
              <td>{cls.horario}</td>
              <td>
                {cls.currentOccupancy}/{cls.capacidad_maxima} 
                ({cls.occupancyPercentage}%)
              </td>
              <td>
                <span className={`status ${cls.estado}`}>
                  {cls.estado === 'activo' ? '✅ Active' : '⏸️ Paused'}
                </span>
              </td>
              <td>
                {cls.estado === 'activo' ? (
                  <button
                    className="btn-danger"
                    onClick={() => handlePauseClass(cls.id)}
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    className="btn-success"
                    onClick={() => handleResumeClass(cls.id)}
                  >
                    Resume
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .class-management {
          padding: 20px 0;
        }

        .class-management h2 {
          margin: 0 0 20px 0;
          color: #2c3e50;
        }

        .classes-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .classes-table thead {
          background: #34495e;
          color: white;
        }

        .classes-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }

        .classes-table td {
          padding: 12px;
          border-bottom: 1px solid #ecf0f1;
        }

        .classes-table tbody tr:hover {
          background: #f8f9fa;
        }

        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .status.activo {
          background: #d4edda;
          color: #155724;
        }

        .status.pausado {
          background: #fff3cd;
          color: #856404;
        }

        .btn-danger,
        .btn-success {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 12px;
        }

        .btn-danger {
          background: #e74c3c;
          color: white;
        }

        .btn-danger:hover {
          background: #c0392b;
        }

        .btn-success {
          background: #27ae60;
          color: white;
        }

        .btn-success:hover {
          background: #229954;
        }
      `}</style>
    </div>
  );
}
