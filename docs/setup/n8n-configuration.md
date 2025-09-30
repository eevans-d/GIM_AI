# n8n Configuration Guide for GIM_AI

This document explains how to configure n8n with all required credentials and settings.

## Prerequisites

- n8n installed (Desktop or self-hosted)
- Supabase project created
- WhatsApp Business API access
- Redis running (for queues)

## 1. Supabase Credentials

### Create Credential
1. In n8n, go to **Credentials** → **New**
2. Search for "Supabase"
3. Configure:
   - **Name**: `Supabase GIM_AI`
   - **Host**: Your Supabase URL (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Secret**: Your Supabase service role key

### Get Supabase Keys
1. Go to Supabase Dashboard → Project Settings → API
2. Copy `URL` and `service_role` key (not anon key, we need full access)

## 2. WhatsApp Business API

### Setup WhatsApp
1. Create Facebook Developer App
2. Add WhatsApp Business product
3. Get Phone Number ID and Access Token

### n8n HTTP Request Configuration
WhatsApp doesn't have native n8n integration, so we use HTTP Request nodes:

**Headers**:
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN",
  "Content-Type": "application/json"
}
```

**Base URL**: `https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages`

## 3. Google APIs (Optional - for migration)

### Google Sheets
1. Create credential in n8n: **Google Sheets API**
2. Authorize with OAuth2
3. Select sheets to access

### Google Forms
1. Create credential: **Google Forms API**
2. Authorize with OAuth2

## 4. Environment Variables

Add these to n8n environment (or `.env` file):

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# WhatsApp
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token

# App
N8N_WEBHOOK_URL=http://localhost:5678
GYM_PHONE=+54xxxxxxxxxx
GYM_NAME=Mi Gimnasio
```

## 5. Import Workflows

### Method 1: Via UI
1. Open n8n
2. Click **Workflows** → **Import from File**
3. Select workflow JSON file
4. Click **Import**

### Method 2: Via CLI
```bash
# Copy workflows to n8n directory
cp n8n-workflows/core/*.json ~/.n8n/workflows/
cp n8n-workflows/messaging/*.json ~/.n8n/workflows/
cp n8n-workflows/analytics/*.json ~/.n8n/workflows/

# Restart n8n
n8n restart
```

## 6. Configure Webhooks

### Check-in Flow
- **URL**: `http://your-n8n-domain:5678/webhook/checkin`
- **Method**: POST
- **Body**:
```json
{
  "phone": "+5491112345678",
  "source": "qr",
  "class_id": "uuid-here",
  "location": "Spinning 19:00"
}
```

### Test Webhook
```bash
curl -X POST http://localhost:5678/webhook/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5491112345678",
    "source": "qr"
  }'
```

## 7. Activate Workflows

1. Open each workflow
2. Click **Active** toggle in top-right
3. Verify no errors in execution log

### Required Active Workflows
- ✅ Check-in Flow
- ✅ Daily Collection Flow (cron)
- ✅ Contextual Collection Flow

## 8. Monitoring

### View Executions
1. Go to **Executions** tab
2. Filter by workflow
3. Click execution to see details

### Check Errors
```bash
# View n8n logs
tail -f ~/.n8n/logs/n8n.log

# Check specific workflow
n8n execute --workflow="Daily Collection Flow"
```

## 9. Backup Workflows

### Export All Workflows
```bash
# In n8n UI
Workflows → Select All → Export

# Or use CLI
n8n export:workflow --all --output=./backups/
```

### Version Control
All workflow JSON files are in Git:
- `n8n-workflows/core/`
- `n8n-workflows/messaging/`
- `n8n-workflows/analytics/`

## 10. Troubleshooting

### Workflow Not Triggering
- Check if workflow is **Active**
- Verify cron expression for scheduled workflows
- Check webhook URL is accessible

### Supabase Connection Failed
- Verify service role key (not anon key)
- Check Supabase URL format
- Test connection in credential settings

### WhatsApp Messages Not Sending
- Verify access token is valid
- Check phone number ID
- Ensure templates are approved by Meta
- Check rate limits

### Common Errors

**"Cannot read property 'json' of undefined"**
- Previous node returned empty data
- Add error handling or default values

**"Credential not found"**
- Create credential with exact name: `Supabase GIM_AI`
- Re-assign credential in affected nodes

**"Webhook timed out"**
- Increase execution timeout in workflow settings
- Use async processing for long operations

## 11. Performance Optimization

### Queue Settings
```javascript
// In workflow settings
{
  "executionTimeout": 300,  // 5 minutes
  "saveExecutionProgress": true,
  "saveManualExecutions": true
}
```

### Database Indexes
Ensure these indexes exist:
- `idx_members_phone`
- `idx_payments_overdue`
- `idx_checkins_date`

### Cron Schedule Best Practices
- **Daily Collection**: 9:00 AM (business start)
- **Metrics Refresh**: Every 15 minutes during business hours
- **Cleanup Jobs**: 2:00 AM (low traffic)

## 12. Security

### Webhook Security
Add verification token:
```javascript
if (req.headers['x-verify-token'] !== process.env.WEBHOOK_SECRET) {
  throw new Error('Unauthorized');
}
```

### Rate Limiting
Built into WhatsApp sender module:
- Max 2 messages/day per user
- Business hours only (9-21h)
- Exponential backoff on failures

### Credential Encryption
n8n encrypts credentials at rest. Ensure:
- Strong encryption key set
- Regular backups
- Restricted access to n8n instance

## Support

For issues:
1. Check n8n community: https://community.n8n.io
2. Review logs: `~/.n8n/logs/`
3. Test workflows manually first
4. Consult GIM_AI documentation
