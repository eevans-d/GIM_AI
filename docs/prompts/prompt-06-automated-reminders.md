# 📅 Automated Reminders System - PROMPT 6 Implementation

## Overview

Complete implementation of the automated reminder system for GIM_AI, sending timely WhatsApp notifications for upcoming classes and payment due dates. The system runs on scheduled cron jobs and ensures members never miss a class or payment deadline.

## Features Implemented

### ✅ Class Reminders

1. **24-Hour Reminder**
   - Sent daily at 9:00 AM
   - For all classes happening tomorrow at the same hour
   - Includes: class name, time, instructor
   - Confirmation buttons: [SÍ VOY] [CANCELAR] [CAMBIAR]

2. **2-Hour Reminder**
   - Sent hourly (every hour on the hour)
   - For classes starting in 2 hours
   - Includes: class name, time, preparation tips
   - More urgent tone, shorter message

### ✅ Payment Reminders

1. **D0 - Due Date Reminder**
   - Sent at 9:00 AM on payment due date
   - Soft tone: "Tu cuota venció hoy"
   - One-click payment link
   - Help option available

2. **D3 - 3 Days Overdue**
   - Sent at 10:00 AM, 3 days after due date
   - Offers flexible payment options:
     - Full payment
     - 2 installments without interest
     - Talk to admin
   - Tracks as attempt #1

3. **D7 - 1 Week Overdue**
   - Sent at 11:00 AM, 7 days after due date
   - Urgent but empathetic tone
   - Special plan: 3 installments without interest
   - Direct phone contact offered
   - Tracks as attempt #2

4. **D14+ - Critical Overdue**
   - Automated check at 8:00 AM daily
   - Flags payments 14+ days overdue
   - Creates admin notification
   - Logs detailed context for manual follow-up
   - Does NOT send automatic message (requires human touch)

### ✅ Smart Features

- **Business Hours Compliance**: All messages sent between 9:00 AM - 9:00 PM
- **Rate Limiting**: Max 2 messages per member per day
- **Consent Verification**: Only sends to members with `consentimiento_wa = true`
- **Delivery Tracking**: Logs all sent/failed messages
- **Retry Logic**: Failed messages logged for manual retry
- **Attempt Counter**: Tracks number of collection attempts
- **Correlation IDs**: Full traceability of all reminders

## File Structure

```
/home/runner/work/GIM_AI/GIM_AI/
├── services/
│   └── reminder-service.js         # Core reminder logic + cron jobs
├── routes/
│   └── api/
│       └── reminders.js             # Manual trigger API endpoints
├── docs/
│   └── prompt-06-automated-reminders.md  # This file
└── index.js                         # Updated with cron initialization
```

## Architecture

### Cron Jobs Schedule

```javascript
// Class reminders 24h before - Daily at 9:00 AM
cron.schedule('0 9 * * *', sendClassReminders24h);

// Class reminders 2h before - Every hour
cron.schedule('0 * * * *', sendClassReminders2h);

// Payment reminders D0 - Daily at 9:00 AM
cron.schedule('0 9 * * *', sendPaymentRemindersD0);

// Payment reminders D3 - Daily at 10:00 AM
cron.schedule('0 10 * * *', sendPaymentRemindersD3);

// Payment reminders D7 - Daily at 11:00 AM
cron.schedule('0 11 * * *', sendPaymentRemindersD7);

// Critical overdue check - Daily at 8:00 AM
cron.schedule('0 8 * * *', flagCriticalOverduePayments);
```

### Workflow Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   CRON JOB TRIGGER                          │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│          QUERY DATABASE (Supabase)                          │
│  - Classes in next 24h/2h                                   │
│  - Payments due today/overdue                               │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│              FILTER BY CONSENT                              │
│  - Only members with consentimiento_wa = true               │
│  - Only active members                                      │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│           SEND WHATSAPP MESSAGES                            │
│  - Via WhatsApp Business API                                │
│  - 500ms-1000ms delay between messages                      │
│  - Rate limiting applied                                    │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│          UPDATE DATABASE & LOG                              │
│  - Update ultimo_recordatorio                               │
│  - Increment intentos_cobro                                 │
│  - Log success/failure with correlation ID                  │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Manual Trigger Endpoints (For Testing & Admin Control)

#### POST /api/reminders/class/24h
Manually trigger 24-hour class reminders

**Response:**
```json
{
  "success": true,
  "message": "24h class reminders triggered successfully"
}
```

#### POST /api/reminders/class/2h
Manually trigger 2-hour class reminders

#### POST /api/reminders/payment/d0
Manually trigger D0 payment reminders

#### POST /api/reminders/payment/d3
Manually trigger D3 payment reminders

#### POST /api/reminders/payment/d7
Manually trigger D7 payment reminders

#### POST /api/reminders/payment/critical
Manually trigger critical overdue payment check

#### GET /api/reminders/status
Get reminder system status

**Response:**
```json
{
  "success": true,
  "status": "operational",
  "scheduledJobs": {
    "class-24h": "0 9 * * * (Daily at 9:00 AM)",
    "class-2h": "0 * * * * (Hourly)",
    "payment-d0": "0 9 * * * (Daily at 9:00 AM)",
    "payment-d3": "0 10 * * * (Daily at 10:00 AM)",
    "payment-d7": "0 11 * * * (Daily at 11:00 AM)",
    "critical-check": "0 8 * * * (Daily at 8:00 AM)"
  },
  "businessHours": "9:00 - 21:00",
  "maxMessagesPerDay": 2
}
```

## Message Templates

### Class Reminder - 24h

**Template Name**: `recordatorio_clase_24h`

**Variables**: `[nombre, clase, hora]`

**Message:**
```
{{1}}, te esperamos mañana!
📅 {{2}} a las {{3}}
📍 Sala principal

¿Cancelar? Respondé CANCELAR
```

**Example:**
```
María, te esperamos mañana!
📅 CrossFit a las 19:00
📍 Sala principal

¿Cancelar? Respondé CANCELAR
```

### Class Reminder - 2h

**Format**: Text message (not template)

**Message:**
```
⏰ Recordatorio!

{clase} en 2 horas
🕐 {hora}

💡 Tip: Cená liviano ahora y traé agua extra 💧
```

**Example:**
```
⏰ Recordatorio!

CrossFit en 2 horas
🕐 19:00

💡 Tip: Cená liviano ahora y traé agua extra 💧
```

### Payment Reminder - D0

**Template Name**: `recordatorio_pago_d0`

**Variables**: `[nombre, monto]`

**Message:**
```
Hola {{1}}! 
Tu cuota de ${{2}} venció hoy.

Pagá fácil: [LINK]
¿Ayuda? Respondé AYUDA
```

### Payment Reminder - D3

**Format**: Text message

**Message:**
```
Hola {nombre}! 👋

Seguimos viendo ${monto} pendiente.

Te ofrecemos opciones:
• Pago completo: [LINK]
• 2 cuotas sin interés: [LINK_PLAN]
• Hablar con admin: Respondé LLAMAR

Tu bienestar nos importa 💙
```

### Payment Reminder - D7

**Format**: Text message

**Message:**
```
{nombre}, para mantener tu acceso activo necesitamos regularizar ${monto} antes del viernes.

Plan especial: 3 cuotas sin interés
[ACTIVAR PLAN]

También podés llamarnos: {gym_phone}

Queremos que sigas entrenando 🏋️‍♀️
```

## Database Schema Updates

### payments Table - New Fields
```sql
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ultimo_recordatorio TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS intentos_cobro INTEGER DEFAULT 0;
```

### Indexes for Performance
```sql
CREATE INDEX IF NOT EXISTS idx_payments_estado_fecha ON payments(estado, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_payments_ultimo_recordatorio ON payments(ultimo_recordatorio);
```

## Logging & Monitoring

### Log Events

All reminder operations are logged with structured data:

```javascript
// Success log
log.info('24h reminder sent', {
  member_id: 123,
  class_id: 45,
  class_name: 'CrossFit'
});

// Failure log
log.error('Failed to send D3 reminder', {
  payment_id: 789,
  member_id: 123,
  error: 'Rate limit exceeded'
});

// Summary log
log.info('D0 payment reminders complete', {
  sent: 45,
  failed: 3,
  total: 48
});
```

### Metrics Tracked

- **Total reminders sent** (per type, per day)
- **Success rate** (sent / total)
- **Failure reasons** (rate limit, invalid phone, consent missing)
- **Response time** (database query + message sending)
- **Cost tracking** (messages sent = WhatsApp API cost)

## Configuration

### Environment Variables

```env
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token

# Business Configuration
GYM_PHONE=+5491234567890
BUSINESS_HOURS_START=09:00
BUSINESS_HOURS_END=21:00
WHATSAPP_MAX_MESSAGES_PER_DAY=2

# Reminder Settings
REMINDER_CLASS_24H_ENABLED=true
REMINDER_CLASS_2H_ENABLED=true
REMINDER_PAYMENT_D0_ENABLED=true
REMINDER_PAYMENT_D3_ENABLED=true
REMINDER_PAYMENT_D7_ENABLED=true
```

## Testing

### Manual Testing

1. **Trigger class reminders manually:**
   ```bash
   curl -X POST http://localhost:3000/api/reminders/class/24h
   ```

2. **Check reminder status:**
   ```bash
   curl -X GET http://localhost:3000/api/reminders/status
   ```

3. **View logs:**
   ```bash
   tail -f logs/reminder-service.log
   ```

### Integration Testing

Create test scenarios:
- Member with class tomorrow at 9:00 AM (should get 24h reminder at 9:00 AM today)
- Member with payment due today (should get D0 reminder at 9:00 AM)
- Member with payment 3 days overdue (should get D3 reminder at 10:00 AM)

## Error Handling

### Common Errors & Solutions

1. **Rate Limit Exceeded**
   - Cause: Too many messages sent too quickly
   - Solution: Increase delay between messages (currently 500ms-1000ms)
   - Logged as warning, not error

2. **Invalid Phone Number**
   - Cause: Member phone number incorrect format
   - Solution: Logged for manual correction
   - Member skipped for this reminder cycle

3. **No Consent**
   - Cause: Member hasn't opted in to WhatsApp
   - Solution: Member automatically skipped
   - Not logged as error (expected behavior)

4. **Database Query Failure**
   - Cause: Supabase connection issue
   - Solution: Retry logic with exponential backoff
   - Critical error logged, admin notified

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**: Query all members at once, iterate efficiently
2. **Rate Limiting**: 500ms-1000ms delay between messages
3. **Async Execution**: Cron job returns immediately, processing happens in background
4. **Database Indexes**: Optimized queries for date ranges and status
5. **Connection Pooling**: Reuse Supabase client connection

### Expected Load

**Average Gym (500 members):**
- Class reminders 24h: ~30-40 messages/day
- Class reminders 2h: ~15-20 messages/hour (peak times)
- Payment D0: ~50-60 messages/month
- Payment D3: ~10-15 messages/month
- Payment D7: ~5-10 messages/month

**Total**: ~500-600 messages/month for reminders alone

## Business Rules

### When NOT to Send Reminders

1. Member status is not "activo"
2. Member has not given WhatsApp consent
3. Member has unsubscribed (responded "STOP")
4. Maximum daily messages already reached (2/day)
5. Outside business hours (9:00 AM - 9:00 PM)

### Escalation Rules

- **D0-D7**: Automated reminders
- **D7-D14**: Automated + flag for admin attention
- **D14+**: No automated message, manual follow-up required

## Integration with Other Systems

### WhatsApp Business API
- **sender.js**: Uses `sendTemplate()` and `sendText()` methods
- **Rate limiting**: Respects WhatsApp API limits
- **Template approval**: All templates must be pre-approved by Meta

### n8n Workflows
- **Trigger**: Each sent reminder can trigger n8n workflow
- **Use case**: Complex multi-step sequences
- **Future**: Move entire reminder logic to n8n for visual editing

### Database
- **Supabase**: Direct SQL queries for efficiency
- **Real-time**: Could use Supabase real-time subscriptions for immediate triggers
- **Analytics**: All reminder data available for BI reports

## Future Enhancements

- [ ] Personalized reminder times based on member preferences
- [ ] A/B testing of message content and timing
- [ ] SMS fallback if WhatsApp delivery fails
- [ ] Email reminders as backup channel
- [ ] Reminder preferences page for members
- [ ] "Snooze" feature (remind me in 1 hour)
- [ ] Integration with Google Calendar
- [ ] Push notifications for app users
- [ ] Voice call reminders for critical cases
- [ ] Multi-language support (Spanish/English)

## Troubleshooting

### Cron Jobs Not Running

**Check:**
1. Server time zone is correct
2. Cron package is installed: `npm list node-cron`
3. Logs show initialization: `grep "Reminder cron jobs initialized" logs/app.log`

**Solution:**
```bash
# Restart server
npm restart

# Check cron job status
curl http://localhost:3000/api/reminders/status
```

### Messages Not Sending

**Check:**
1. WhatsApp API credentials are correct
2. Templates are approved in Meta Business Suite
3. Rate limiter is not blocking
4. Member has WhatsApp consent

**Solution:**
```bash
# Test single message
curl -X POST http://localhost:3000/api/reminders/class/24h

# Check logs
tail -f logs/reminder-service.log | grep ERROR
```

### High Failure Rate

**Check:**
1. Database connection stable
2. WhatsApp API quota not exceeded
3. Phone numbers in correct format

**Solution:**
- Review error logs for patterns
- Manually trigger specific reminder type to isolate issue
- Check WhatsApp Business Manager for API usage

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Reminder Success Rate**: Should be >95%
2. **Average Processing Time**: Should be <5 seconds per reminder
3. **Failed Message Rate**: Should be <5%
4. **Cron Job Execution**: Should run on schedule 100% of time

### Alert Thresholds

- **CRITICAL**: Success rate <80% for 24 hours
- **WARNING**: Failed messages >10 in 1 hour
- **INFO**: New cron job execution

## Support

For issues or questions:
- Review logs: `/logs/reminder-service.log`
- Check monitoring: `/health`
- Manual trigger: `POST /api/reminders/{type}`
- Contact: support@gim-ai.com

---

**Implementation Date**: January 2025  
**Status**: ✅ COMPLETE  
**Part of**: GIM_AI Core Functionality (Prompts 5-15)  
**Dependencies**: Prompts 1-5, WhatsApp API, Cron  
**Next Prompt**: Prompt 7 - Contextual Collection System
