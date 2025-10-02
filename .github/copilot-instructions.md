# GIM_AI Development Guidelines for AI Agents

## Project Architecture

**GIM_AI** is a WhatsApp-first gym management system with QR check-in automation. Core stack: Node.js/Express backend, Supabase PostgreSQL, n8n workflow orchestration, WhatsApp Business Cloud API, Redis for queues.

### Major Components & Data Flow
1. **Check-in Flow**: QR scan → `routes/api/checkin.js` → Supabase validation → WhatsApp confirmation → n8n workflow trigger
2. **WhatsApp Messaging**: `whatsapp/client/sender.js` handles all outbound messages via Bull queue with strict rate limiting (2 msg/day, 9-21h window)
3. **n8n Orchestration**: Workflows in `n8n-workflows/` handle contextual collection (90min post-workout), reminders, and class management
4. **Database**: 11 tables (members, classes, checkins, payments) with UUID primary keys, RLS policies, and stored functions for KPIs

### Key Architectural Decisions
- **No direct WhatsApp API calls**: Always queue through `whatsapp/client/sender.js` for rate limit compliance
- **Correlation IDs everywhere**: Every request gets `req.correlationId` for distributed tracing (see `index.js` middleware)
- **Supabase service key**: Backend uses `SUPABASE_SERVICE_KEY` for bypassing RLS (frontend would use anon key)
- **n8n as orchestrator**: Complex multi-step flows (debt collection sequences, waitlist management) live in n8n JSON workflows, NOT Node.js code

## Testing Conventions

### Test Structure (PROMPT 17 Implementation)
```javascript
// Unit tests: tests/unit/
// Integration tests: tests/integration/
// E2E tests: tests/e2e/critical-flows/
```

**Critical pattern**: All tests mock external dependencies via `tests/__mocks__/`:
- `winston.js` + `winston-daily-rotate-file.js` for logger mocks
- `whatsapp-sender.js` for WhatsApp API (prevents actual sends in tests)
- `uuid.js` for deterministic IDs

**ESM + Jest**: Babel transpiles CJS to work with Jest. If adding ESM modules, update `jest.config.js` `transformIgnorePatterns`.

### Running Tests
```bash
npm test              # Full suite with coverage
npm run test:unit     # Unit tests only
npm run test:e2e      # Playwright E2E tests
```

**Coverage thresholds**: 70% in CI (`jest.config.js` checks `process.env.CI`), 0% locally for rapid iteration.

## Error Handling & Logging

### Centralized Patterns (PROMPT 16)
**Always use** `utils/error-handler.js` `AppError` class with error types:
```javascript
const { AppError, ErrorTypes } = require('../utils/error-handler');
throw new AppError('Member not found', ErrorTypes.NOT_FOUND, 404, { member_id });
```

**Logging** via `utils/logger.js` with automatic sensitive data masking:
```javascript
const log = logger.createLogger('component-name');
log.info('Operation started', { correlationId, member_id }); // phone/password auto-masked
```

**Circuit breaker**: External API calls (WhatsApp, Supabase) wrapped in `CircuitBreaker` class (see `error-handler.js`). After 5 failures, circuit opens for 60s.

**Retry logic**: Network/API errors auto-retry with exponential backoff (configured in `RETRY_CONFIG` object). Validation/business errors never retry.

## WhatsApp Integration

### Rate Limiting & Business Hours
**Critical constraint**: WhatsApp Cloud API limits enforced in `whatsapp/client/sender.js`:
- Max 2 messages per user per 24h (configurable via `WHATSAPP_MAX_MESSAGES_PER_DAY`)
- Only send 9-21h (business hours) unless `options.force = true`
- Messages outside hours queued via Bull Redis queue

### Template Messages (HSM)
All WhatsApp messages must use approved templates from `whatsapp/templates/`. Never construct freeform text.
```javascript
await whatsappSender.sendTemplate(phone, 'checkin_confirmation', {
  member_name: 'Juan',
  class_name: 'Spinning',
  language: 'es'
});
```

Templates defined in Meta Business Suite, referenced by name in code.

## Database Patterns

### UUID Primary Keys & Supabase Client
**All tables use UUIDs** (`uuid_generate_v4()`). Never use auto-increment integers.

**Service key vs Anon key**:
- Backend: `SUPABASE_SERVICE_KEY` (bypasses RLS)
- Frontend/n8n: `SUPABASE_ANON_KEY` (enforces RLS)

### Common Queries
- **Member lookup**: Always use `telefono` (phone) or `codigo_qr` for public endpoints
- **Debt detection**: Join `members` with `payments` where `deuda_actual > 0 AND fecha_ultimo_pago < NOW() - INTERVAL '30 days'`
- **Class capacity**: Check `clases.capacidad_maxima` vs count of `reservas` + `checkins` for same `clase_id`

## Development Workflow

### Local Setup
```bash
docker-compose up -d      # Start Postgres, Redis, n8n
npm install
npm run migrate           # Run database/schemas/*.sql
npm start                 # Port 3000
```

**n8n**: Access at `http://localhost:5678` (admin/admin123). Import workflows from `n8n-workflows/` via UI.

### Branch Strategy
- Main branch: `main` (production-ready)
- Current branch: `ci/jest-esm-support` (ESM/Jest compatibility fixes)
- Feature branches: `feature/prompt-XX-description`

### Key Commands
```bash
npm run dev               # Nodemon with auto-reload
npm run lint:fix          # ESLint + Prettier auto-fix
npm run health-check      # Test all service connections
npm run backup            # Backup Supabase data
```

## Project-Specific Patterns

### Prompt-Based Development
This project follows a 25-prompt implementation roadmap (`docs/IMPLEMENTATION_STATUS.md`). When implementing features:
1. Check prompt status (10/25 complete as of Jan 2025)
2. Reference prompt docs in `docs/prompt-XX-*.md`
3. Follow existing patterns from completed prompts (1-6, 16-19)

### Service Boundaries
- **routes/api/**: Thin HTTP handlers, validation only
- **services/**: Business logic (QR generation, reminder scheduling)
- **whatsapp/**: ALL WhatsApp interaction (never call API directly from routes)
- **n8n-workflows/**: Multi-step workflows (collection sequences, waitlists)

### Configuration
- **Environment-first**: All config via `.env` (see `.env.example`)
- **Centralized config**: `config/whatsapp.config.js` for WhatsApp, never hardcode URLs/keys
- **Docker-ready**: `docker-compose.yml` includes all services for local dev

### Security Considerations
- **Helmet.js**: Security headers applied in `index.js`
- **Rate limiting**: API endpoints use `rate-limiter-flexible` with Redis
- **Input validation**: Joi schemas for all POST bodies (see `routes/api/checkin.js` patterns)
- **Authentication**: JWT for staff/admin, PIN hash for instructors (see `security/authentication/`)

## Common Gotchas

1. **Don't call WhatsApp API directly**: Always use `whatsapp/client/sender.js` queue
2. **Correlation IDs**: Never log without passing `correlationId` from request
3. **Sensitive data**: Logger auto-masks, but never log full phone numbers in custom strings
4. **Mock external services**: Tests fail in CI if they hit real APIs (Supabase, WhatsApp)
5. **ESM imports**: Project is CJS (`require`), not ESM (`import`). Babel transpiles tests only.
6. **Supabase RLS**: Backend uses service key, but remember RLS policies exist for frontend security
