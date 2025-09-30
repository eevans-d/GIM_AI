# 📱 Check-in QR System - PROMPT 5 Implementation

## Overview

Complete implementation of the QR-based check-in system for GIM_AI, enabling seamless member access through multiple check-in methods: personal QR codes, generic kiosk QR, manual staff entry, and class-specific QR codes.

## Features Implemented

### ✅ Core Functionality

1. **Personal QR Codes**
   - Unique QR code for each member
   - Direct check-in via mobile scan
   - Auto-detection of member status and debt
   - WhatsApp confirmation message

2. **Generic Kiosk QR**
   - Single QR at gym entrance
   - Phone number entry for identification
   - Walk-in support

3. **Manual Check-in**
   - Staff (reception/instructor) can register check-ins
   - Source tracking (qr_cliente, profesor, recepcion, kiosk)
   - Notes field for special cases

4. **Class-Specific QR**
   - QR codes for specific classes
   - Automatic class occupancy tracking
   - Capacity management

### ✅ Smart Features

- **Debt Detection**: Automatic detection of overdue payments during check-in
- **Post-Workout Messages**: Scheduled WhatsApp message 90 minutes after check-in if member has debt
- **Streak Tracking**: Consecutive check-in days tracking
- **Capacity Management**: Prevents check-in when class is full
- **Member Status Validation**: Only active members can check in

## File Structure

```
/home/runner/work/GIM_AI/GIM_AI/
├── frontend/
│   └── qr-checkin/
│       └── index.html              # Check-in landing page (responsive mobile-first)
├── routes/
│   └── api/
│       ├── checkin.js              # Check-in API endpoints
│       └── qr.js                   # QR generation API endpoints
├── services/
│   └── qr-service.js               # QR code generation service
└── docs/
    └── prompt-05-checkin-qr.md     # This file
```

## API Endpoints

### Check-in Endpoints

#### POST /api/checkin
Process a check-in (QR, manual, or kiosk)

**Request:**
```json
{
  "member_id": 123,        // Required if no phone
  "phone": "+5491234567890", // Required if no member_id
  "source": "qr_cliente",  // qr_cliente | profesor | recepcion | kiosk
  "class_id": 45,          // Optional
  "timestamp": "2024-01-15T19:00:00Z" // Optional, defaults to now
}
```

**Response (Success):**
```json
{
  "success": true,
  "checkinId": 789,
  "memberName": "Juan Pérez",
  "className": "CrossFit",
  "hasDebt": true,
  "debtAmount": "3200.00",
  "streak": 5,
  "autoOpenWhatsApp": false
}
```

**Response (Member Inactive):**
```json
{
  "success": false,
  "message": "Membresía inactiva. Por favor, contacta a recepción.",
  "memberName": "Juan Pérez",
  "estado": "suspendido"
}
```

**Response (Class Full):**
```json
{
  "success": false,
  "message": "Clase completa. Por favor, elige otra clase.",
  "className": "CrossFit",
  "capacity": 30
}
```

#### GET /api/checkin/history/:memberId
Get check-in history for a member

**Query Parameters:**
- `limit`: Number of results (default: 30)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "checkins": [
    {
      "id": 789,
      "timestamp": "2024-01-15T19:00:00Z",
      "source": "qr_cliente",
      "has_debt": true,
      "classes": {
        "nombre": "CrossFit",
        "fecha_hora": "2024-01-15T19:00:00Z"
      }
    }
  ],
  "total": 120
}
```

#### POST /api/checkin/manual
Manual check-in by staff

**Request:**
```json
{
  "member_id": 123,
  "class_id": 45,
  "staff_id": "I001",      // Instructor or R001 for reception
  "notes": "Arrived late"  // Optional
}
```

### QR Code Generation Endpoints

#### GET /api/qr/member/:memberId
Generate personal QR code for a member

**Query Parameters:**
- `width`: QR code width in pixels (default: 300)

**Response:**
```json
{
  "success": true,
  "data": {
    "memberId": 123,
    "memberName": "Juan Pérez",
    "qrCode": "GYM-A3F2-8D5E",
    "qrCodeImage": "data:image/png;base64,...",
    "checkInUrl": "https://gim-ai.netlify.app/frontend/qr-checkin/?m=123&p=..."
  }
}
```

#### GET /api/qr/generic
Generate generic kiosk QR code

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "generic",
    "qrCodeImage": "data:image/png;base64,...",
    "checkInUrl": "https://gim-ai.netlify.app/frontend/qr-checkin/?s=kiosk"
  }
}
```

#### GET /api/qr/class/:classId
Generate class-specific QR code

**Response:**
```json
{
  "success": true,
  "data": {
    "classId": 45,
    "className": "CrossFit",
    "classTime": "2024-01-15T19:00:00Z",
    "qrCodeImage": "data:image/png;base64,...",
    "checkInUrl": "https://gim-ai.netlify.app/frontend/qr-checkin/?c=45&s=clase"
  }
}
```

#### POST /api/qr/batch
Batch generate QR codes for all members without QR codes

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "successful": 148,
    "failed": 2,
    "results": [...]
  }
}
```

#### POST /api/qr/verify
Verify if a QR code is valid

**Request:**
```json
{
  "qrCode": "GYM-A3F2-8D5E"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "member": {
      "id": 123,
      "nombre": "Juan Pérez",
      "estado": "activo"
    }
  }
}
```

## Frontend - Check-in Landing Page

### Features
- **Responsive Design**: Mobile-first, optimized for smartphones
- **Real-time Processing**: Automatic check-in on page load
- **Visual States**:
  - Loading: Spinner while processing
  - Success: Green check mark
  - Warning: Yellow alert for members with debt
  - Error: Red alert with clear message
- **Member Details**: Shows name, time, class, and debt if applicable
- **WhatsApp Integration**: One-click button to open WhatsApp
- **Auto-redirect**: Can automatically open WhatsApp after successful check-in

### URL Parameters
- `m`: Member ID
- `p`: Phone number (encoded)
- `s`: Source (qr_cliente, profesor, recepcion, kiosk, clase)
- `c`: Class ID (for class-specific check-ins)

### Example URLs

**Personal QR:**
```
https://gim-ai.netlify.app/frontend/qr-checkin/?m=123&p=%2B5491234567890&s=qr_cliente
```

**Generic Kiosk:**
```
https://gim-ai.netlify.app/frontend/qr-checkin/?s=kiosk
```

**Class-specific:**
```
https://gim-ai.netlify.app/frontend/qr-checkin/?c=45&s=clase
```

## Database Schema

### checkins Table
```sql
CREATE TABLE checkins (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  source VARCHAR(20) CHECK (source IN ('qr_cliente','profesor','recepcion','kiosk')),
  class_id INTEGER REFERENCES classes(id),
  has_debt BOOLEAN DEFAULT false,
  staff_id VARCHAR(20),
  notes TEXT
);

CREATE INDEX idx_checkins_member_id ON checkins(member_id);
CREATE INDEX idx_checkins_timestamp ON checkins(timestamp);
CREATE INDEX idx_checkins_class_id ON checkins(class_id);
```

## Integration with Other Systems

### WhatsApp Business API
- **Check-in Confirmation**: Immediate message after successful check-in
- **Post-Workout Collection**: Scheduled message 90 minutes after check-in if member has debt
- **Template Used**: `checkin_exitoso`, `post_entreno_cobranza`

### n8n Workflows
- **Check-in Event**: Triggers n8n workflow on successful check-in
- **Debt Detection**: Flags member for contextual collection
- **Class Occupancy**: Updates real-time occupancy metrics

### Monitoring
- All check-ins logged with correlation ID
- Failed check-ins logged with error details
- Performance metrics tracked (response time, success rate)

## Configuration

### Environment Variables Required
```env
# Application
APP_BASE_URL=https://gim-ai.netlify.app

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token

# Server
PORT=3000
NODE_ENV=production
```

## Testing

### Manual Testing
1. Generate a test QR code:
   ```bash
   curl -X GET http://localhost:3000/api/qr/member/1
   ```

2. Save the QR code image and scan with phone

3. Verify check-in is registered:
   ```bash
   curl -X GET http://localhost:3000/api/checkin/history/1
   ```

### Integration Testing
- Test check-in with active member
- Test check-in with inactive member
- Test check-in with overdue payment
- Test check-in when class is full
- Test manual check-in by staff

## Deployment

### Frontend (Netlify)
1. Deploy `/frontend/qr-checkin/` to Netlify
2. Configure environment variable: `API_BASE_URL`
3. Ensure static files are accessible at `/frontend/*`

### Backend (Node.js)
1. Ensure all dependencies installed: `npm install`
2. Configure environment variables
3. Start server: `npm start`
4. Verify endpoints: `curl http://localhost:3000/health`

## Usage Examples

### Scenario 1: Member Scans Personal QR
1. Member opens personal QR code on phone
2. Scans QR code at gym entrance
3. Landing page opens automatically
4. Check-in processed in < 2 seconds
5. Confirmation shown on screen
6. WhatsApp message received

### Scenario 2: Walk-in Without QR
1. Member scans generic kiosk QR
2. Enters phone number on landing page
3. System finds member by phone
4. Check-in processed
5. Confirmation shown

### Scenario 3: Instructor Check-in
1. Instructor opens "My Class Now" panel
2. Views list of registered students
3. Marks attendance with one tap
4. System registers check-in with source="profesor"

### Scenario 4: Member with Debt
1. Member checks in (any method)
2. System detects overdue payment of $3,200
3. Check-in still registered (access granted)
4. Warning shown: "Tienes un pago pendiente"
5. 90 minutes later: WhatsApp message sent with payment link

## Metrics Tracked

- **Check-in Volume**: Total check-ins per day/hour
- **Source Distribution**: % of QR vs manual vs kiosk
- **Success Rate**: % of successful vs failed check-ins
- **Response Time**: Average check-in processing time
- **Debt Detection**: % of check-ins with overdue payments
- **WhatsApp Confirmation**: Delivery rate of confirmation messages

## Next Steps (Future Enhancements)

- [ ] Offline check-in support (PWA with local storage)
- [ ] Face recognition as alternative to QR
- [ ] NFC card support
- [ ] Biometric authentication
- [ ] Multi-location support
- [ ] Guest pass QR codes with expiration
- [ ] Class check-in leaderboard
- [ ] Integration with Apple Wallet / Google Pay

## Support

For issues or questions:
- Create GitHub issue: [github.com/eevans-d/GIM_AI/issues](https://github.com/eevans-d/GIM_AI/issues)
- Review logs: `/logs/checkin-api.log`
- Check monitoring dashboard: `/health`

---

**Implementation Date**: January 2025  
**Status**: ✅ COMPLETE  
**Part of**: GIM_AI Core Functionality (Prompts 5-15)  
**Dependencies**: Prompts 1-4, 16-19  
**Next Prompt**: Prompt 6 - Automated Reminders
