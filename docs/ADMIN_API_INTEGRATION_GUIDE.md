# 🚀 Admin API Integration Guide

## Quick Start: Connect Frontend to Backend

**Status:** ✅ Backend APIs ready for integration  
**Frontend:** AdminCommandCenter React components waiting  
**Timeline:** Day 3 (Oct 23) - Integration sprint

---

## Step-by-Step Integration

### 1. Start Backend Server

```bash
cd /home/eevan/ProyectosIA/GIM_AI
npm start
```

Server runs at: `http://localhost:3000`

### 2. Test Endpoints (cURL)

```bash
# Get metrics
curl http://localhost:3000/api/admin/metrics/dashboard

# Get classes
curl http://localhost:3000/api/admin/classes/list

# Get members (with filter)
curl http://localhost:3000/api/admin/members/list?filter=debt

# Get pending payments
curl http://localhost:3000/api/admin/payments/pending
```

### 3. Wire React Components

Update `AdminCommandCenter.jsx`:

```javascript
import axios from 'axios';

// Replace mock fetchMetrics with real API call
const fetchMetrics = async () => {
    try {
        const response = await axios.get('/api/admin/metrics/dashboard');
        setMetrics(response.data.data);
    } catch (err) {
        setError('Failed to load metrics');
    }
};

// Replace mock data with real data
useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // 30s refresh
    return () => clearInterval(interval);
}, []);
```

### 4. Update Component: ClassManagement.jsx

```javascript
const fetchClasses = async () => {
    try {
        const response = await axios.get('/api/admin/classes/list');
        setClasses(response.data.data);
    } catch (err) {
        console.error('Failed to load classes', err);
    }
};

const pauseClass = async (classId) => {
    try {
        await axios.post(`/api/admin/classes/${classId}/pause`);
        // Refresh classes list
        await fetchClasses();
    } catch (err) {
        console.error('Failed to pause class', err);
    }
};
```

### 5. Update Component: MemberManagement.jsx

```javascript
const fetchMembers = async (filter = 'all') => {
    try {
        const response = await axios.get(`/api/admin/members/list?filter=${filter}`);
        setMembers(response.data.data);
    } catch (err) {
        console.error('Failed to load members', err);
    }
};
```

### 6. Update Component: PaymentManagement.jsx

```javascript
const fetchPendingPayments = async () => {
    try {
        const response = await axios.get('/api/admin/payments/pending');
        setPayments(response.data.data);
        setTotalPending(response.data.totalAmount);
    } catch (err) {
        console.error('Failed to load payments', err);
    }
};

const sendBatchReminders = async () => {
    try {
        await axios.post('/api/admin/reminders/send-batch');
        // Show success message
    } catch (err) {
        console.error('Failed to send reminders', err);
    }
};
```

---

## API Endpoint Reference

### Metrics Dashboard
```
GET /api/admin/metrics/dashboard

Response:
{
  "success": true,
  "data": {
    "activeMembers": 150,
    "todayCheckins": 45,
    "monthlyRevenue": 15000,
    "pendingPayments": 12,
    "classOccupancy": 75,
    "churnRisk": 5,
    "membersTrend": 8,
    "checkinsTrend": 12,
    "revenueTrend": 5,
    "timestamp": "2025-10-22T22:00:00Z"
  },
  "timestamp": "2025-10-22T22:00:00Z"
}
```

### Classes List
```
GET /api/admin/classes/list

Response:
{
  "success": true,
  "data": [
    {
      "id": "class-1",
      "nombre": "Spinning",
      "instructor_id": "instr-1",
      "horario": "09:00",
      "capacidad_maxima": 20,
      "estado": "activo",
      "currentOccupancy": 15,
      "occupancyPercentage": 75
    }
  ],
  "count": 1,
  "timestamp": "2025-10-22T22:00:00Z"
}
```

### Pause Class
```
POST /api/admin/classes/{id}/pause

Response:
{
  "success": true,
  "data": {
    "id": "class-1",
    "estado": "pausado",
    "updated_at": "2025-10-22T22:05:00Z"
  },
  "message": "Class paused successfully"
}
```

### Members List (with filters)
```
GET /api/admin/members/list?filter=all|active|inactive|debt

Response:
{
  "success": true,
  "data": [
    {
      "id": "member-1",
      "nombre": "Juan Pérez",
      "telefono": "3105551234",
      "email": "juan@example.com",
      "estado": "activo",
      "fecha_registro": "2025-01-15",
      "fecha_ultimo_checkin": "2025-10-21",
      "deuda_actual": 0,
      "statusBadge": "active",
      "debtDays": 0
    }
  ],
  "count": 1,
  "filter": "all"
}
```

### Pending Payments
```
GET /api/admin/payments/pending

Response:
{
  "success": true,
  "data": [
    {
      "id": "payment-1",
      "member_id": "member-1",
      "monto": 50000,
      "fecha_vencimiento": "2025-10-15",
      "estado": "pendiente",
      "daysOverdue": 6,
      "severityColor": "danger"
    }
  ],
  "count": 1,
  "totalAmount": 50000
}
```

### Reports List
```
GET /api/admin/reports/list

Response:
{
  "success": true,
  "data": [
    {
      "id": "report-1",
      "type": "revenue",
      "status": "completed",
      "created_at": "2025-10-20T10:00:00Z"
    }
  ],
  "count": 1
}
```

### Generate Report
```
POST /api/admin/reports/generate

Body: { "type": "revenue|engagement|payments|classes" }

Response:
{
  "success": true,
  "data": {
    "id": "report_1729617600000",
    "type": "revenue",
    "status": "queued",
    "createdAt": "2025-10-22T22:30:00Z",
    "message": "Report generation queued for processing"
  }
}
```

---

## Error Handling

### Standard Error Response
```javascript
// Catch API errors and display in UI
try {
    const response = await axios.get('/api/admin/metrics/dashboard');
    setMetrics(response.data.data);
} catch (error) {
    if (error.response?.status === 400) {
        setError('Invalid request parameters');
    } else if (error.response?.status === 500) {
        setError('Server error - please try again later');
    } else {
        setError('Failed to load data');
    }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "Failed to fetch dashboard metrics",
  "type": "DATABASE_ERROR",
  "details": {
    "originalError": "Connection timeout"
  }
}
```

---

## Loading States

### Before Integration
```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
        const response = await axios.get('/api/admin/metrics/dashboard');
        setMetrics(response.data.data);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
};
```

### UI Updates
```jsx
{loading && <div className="loader">Loading...</div>}
{error && <div className="error">{error}</div>}
{!loading && !error && <MetricsCard data={metrics} />}
```

---

## Performance Monitoring

### Add Console Timing
```javascript
const fetchMetrics = async () => {
    console.time('fetchMetrics');
    try {
        const response = await axios.get('/api/admin/metrics/dashboard');
        console.timeEnd('fetchMetrics'); // Logs time in console
        setMetrics(response.data.data);
    } catch (err) {
        console.error('Error:', err);
    }
};
```

### Monitor Real Response Times
- Dashboard metrics: Target < 2s
- Classes list: Target < 1s
- Members list: Target < 1.5s
- Payments list: Target < 1s

---

## Testing Checklist

- [ ] Backend server running (`npm start`)
- [ ] Metrics endpoint responds with real data
- [ ] Classes endpoint shows actual classes
- [ ] Members filtering works (all/active/inactive/debt)
- [ ] Pause/Resume class updates database
- [ ] Payments shows pending items with correct days overdue
- [ ] 30-second auto-refresh works
- [ ] Loading states display while fetching
- [ ] Error messages show on failures
- [ ] No console errors in browser

---

## Common Issues

### CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Backend CORS already configured (see `security-middleware.js`)

### 404 Not Found
```
Cannot GET /api/admin/metrics/dashboard
```
**Solution:** Ensure admin routes are mounted in `index.js`:
```javascript
app.use('/api/admin', adminRoutes);
```

### Data Not Updating
**Solution:** Check network tab in DevTools, verify response is fresh:
- Check `timestamp` in response
- Verify 30-second interval is running
- Clear browser cache if needed

---

## Next Steps (Day 3)

1. **Connect all components** to their respective endpoints
2. **Test with real Supabase data** (ensure environment variables set)
3. **Add loading/error states** to each component
4. **Verify performance targets** (< 2s dashboard load)
5. **Performance monitoring setup** for production

---

## Resources

- **Backend Code:** `/routes/api/admin/`
- **Frontend Code:** `/frontend/admin-command-center/`
- **API Specs:** `/frontend/admin-command-center/README.md`
- **Tests:** `/tests/integration/admin-api.spec.js`
- **Documentation:** `/docs/SEMANA_2_DAY2_BACKEND.md`

---

## Support

For issues or questions:
1. Check test files for working examples
2. Review error middleware in `routes/api/admin/index.js`
3. Check correlation IDs in logs
4. Verify Supabase credentials in `.env`

Happy integrating! 🚀
