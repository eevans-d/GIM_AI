# 🧪 SEMANA 1.2: Coverage Improvement Plan (A1)

**Target**: 83% → 90%+ Coverage  
**Current State**: 176 failed, 307 passed (64% passing rate)  
**Goal**: Add 50-70 high-value tests to critical paths  
**Timeline**: 3-4 days (Oct 21-24)

---

## 📊 Coverage Analysis

### Current State
```
Test Suites: 17 failed, 14 passed (45% passing suites)
Tests:       176 failed, 307 passed (64% passing rate)
Gap:         ~20-30 test files need critical coverage
```

### Coverage by Module (Estimated)
```
routes/api/        ~65% (need: +15%)
services/          ~40% (need: +20%)
whatsapp/client/   ~50% (need: +15%)
utils/             ~55% (need: +10%)
workers/           ~30% (need: +15%)
security/          ~70% (need: +5%)
```

---

## 🎯 Strategic Approach

### Phase 1: Fix Failing Tests (1 day)
- Identify root cause of 176 failing tests
- Fix test setup/mocks issues
- Get passing rate to 85%+

### Phase 2: Add Critical Coverage (2 days)
- Add 30-40 tests for critical paths:
  - Check-in flow (10+ tests)
  - Payment processing (8+ tests)
  - WhatsApp sending (10+ tests)
  - Error handling (5+ tests)
  - Rate limiting (5+ tests)

### Phase 3: Add Feature Coverage (1 day)
- Add 20-30 tests for new features:
  - Dashboard endpoints (10+ tests)
  - Reminder scheduling (8+ tests)
  - Member queries (5+ tests)
  - Alert system (5+ tests)

### Phase 4: Validate & Document (0.5 day)
- Run full coverage report
- Document coverage by module
- Create baseline metrics

---

## 📝 Test Categories to Add

### Category A: Critical Paths (30 tests)
**Impact**: HIGH - These are user-facing workflows

```javascript
// 1. Check-in Flow (6 tests)
✓ Valid check-in succeeds
✓ Duplicate check-in prevented
✓ Member with debt checks in with warning
✓ Invalid QR code handled
✓ Manual lookup by phone works
✓ Check-in triggers WhatsApp confirmation

// 2. Payment Processing (5 tests)
✓ Payment recorded correctly
✓ Debt cleared after payment
✓ Partial payment tracked
✓ Failed payment handled
✓ Payment reminder sent

// 3. Member Management (5 tests)
✓ New member created
✓ Member updated
✓ Member deleted (soft)
✓ Member search by phone
✓ Member deactivation

// 4. Class Management (5 tests)
✓ Class created successfully
✓ Class capacity enforced
✓ Class schedule prevents conflicts
✓ Class cancellation notifies members
✓ Instructor assignment validated

// 5. Reminders (5 tests)
✓ Reminder scheduled correctly
✓ Reminder sent at right time
✓ Reminder respects quiet hours
✓ Reminder tracking recorded
✓ Reminder delivery confirmed
```

### Category B: Error Handling (15 tests)
**Impact**: MEDIUM - Robustness and reliability

```javascript
// 1. Validation Errors (5 tests)
✓ Invalid phone number rejected
✓ Missing required fields caught
✓ Invalid date format handled
✓ Out-of-range values rejected
✓ Duplicate entries prevented

// 2. API Errors (5 tests)
✓ 400 Bad Request on invalid data
✓ 401 Unauthorized handled
✓ 403 Forbidden for restricted access
✓ 404 Not Found for missing resource
✓ 500 Server Error caught and logged

// 3. External Service Errors (5 tests)
✓ Supabase connection failure
✓ WhatsApp API failure handled
✓ Redis connection loss
✓ Rate limit exceeded
✓ Timeout handling
```

### Category C: Rate Limiting & Security (15 tests)
**Impact**: MEDIUM-HIGH - Security and stability

```javascript
// 1. WhatsApp Rate Limiting (5 tests)
✓ Max 2 messages per day enforced
✓ Business hours restriction (9-21h)
✓ Force option bypasses hours
✓ Rate limit reset daily
✓ Rate limit headers returned

// 2. API Rate Limiting (5 tests)
✓ 100 requests/min per IP
✓ Burst limit enforced
✓ Rate limit headers returned
✓ Cached responses served
✓ Rate limit escalation to Redis

// 3. Security (5 tests)
✓ SQL injection prevented
✓ XSS payload escaped
✓ CORS headers correct
✓ JWT validation works
✓ Password hashing verified
```

### Category D: Data Integrity (10 tests)
**Impact**: MEDIUM - Data consistency

```javascript
// 1. Transaction Integrity (5 tests)
✓ Check-in + Payment atomic
✓ Rollback on failure
✓ Consistency across tables
✓ Foreign key constraints
✓ Cascade deletes work

// 2. Timestamp Accuracy (5 tests)
✓ Created_at set correctly
✓ Updated_at updated on change
✓ Soft deletes tracked
✓ Timestamps in UTC
✓ Timestamp timezone handling
```

---

## 🔧 Implementation Plan

### Day 1 (Oct 21): Fix Failing Tests

**Task**: Identify and fix root causes of 176 failing tests

```bash
# 1. Run tests with verbose output
npm test -- --verbose 2>&1 | grep -E "FAIL|Error:" > /tmp/failures.txt

# 2. Analyze common failure patterns
# (Mock issues, setup issues, etc.)

# 3. Fix by category:
# - Mock setup issues (40-50 tests)
# - Service configuration (30-40 tests)
# - Database mocks (20-30 tests)
# - Integration issues (20-30 tests)

# 4. Validate fixes
npm test -- --passWithNoTests
```

**Time**: 6-8 hours  
**Expected Result**: 85%+ passing rate (425+ passing tests)

---

### Day 2 (Oct 22): Add Critical Path Tests

**Task**: Implement 30 tests for critical user workflows

**Files to Create/Update**:
```
tests/unit/
├── checkin-flow.test.js         (6 tests - check-in path)
├── payment-processing.test.js   (5 tests - payment path)
├── member-management.test.js    (5 tests - member CRUD)
├── class-management.test.js     (5 tests - class operations)
└── reminders.test.js            (5 tests - reminder scheduling)

tests/integration/
├── checkin-integration.test.js  (5 tests - end-to-end check-in)
└── payment-integration.test.js  (5 tests - end-to-end payment)
```

**Example Test Structure**:
```javascript
// tests/unit/checkin-flow.test.js

describe('Check-in Flow', () => {
  describe('Valid Check-in', () => {
    test('should record check-in for valid member', async () => {
      // Setup: Create test member
      const member = await createTestMember({
        phone: '+34612345678',
        deuda: 0
      });

      // Execute: Check-in
      const result = await checkinFlow.process({
        memberId: member.id,
        classId: 'class-123'
      });

      // Assert: Verify check-in recorded
      expect(result.success).toBe(true);
      expect(result.message).toContain(member.name);
      
      // Verify DB
      const checkin = await getLatestCheckin(member.id);
      expect(checkin.class_id).toBe('class-123');
      expect(checkin.status).toBe('completed');
    });

    test('should send WhatsApp confirmation', async () => {
      // Setup
      const member = await createTestMember();
      const whatsappMock = mockWhatsappSender();

      // Execute
      await checkinFlow.process({ memberId: member.id });

      // Assert
      expect(whatsappMock.sendTemplate).toHaveBeenCalledWith(
        member.telefono,
        'checkin_confirmation',
        expect.objectContaining({
          member_name: member.name,
          class_name: expect.any(String)
        })
      );
    });
  });

  describe('Error Scenarios', () => {
    test('should handle invalid member', async () => {
      const result = await checkinFlow.process({
        memberId: 'invalid-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should warn if member has debt', async () => {
      const member = await createTestMember({ deuda: 100 });

      const result = await checkinFlow.process({
        memberId: member.id
      });

      expect(result.success).toBe(true);
      expect(result.warning).toContain('debt');
    });
  });
});
```

**Time**: 8-10 hours  
**Expected Result**: 30 new tests, coverage 85% → 88%

---

### Day 3 (Oct 23): Add Error Handling & Security Tests

**Task**: Implement 15 tests for robustness + 15 tests for security

**Files to Create**:
```
tests/unit/
├── error-handling.test.js      (15 tests - error scenarios)
├── rate-limiting.test.js       (15 tests - rate limits)
└── security-validation.test.js (10 tests - security)
```

**Example: Error Handling**:
```javascript
describe('Error Handling', () => {
  describe('Validation Errors', () => {
    test('should reject invalid phone number', async () => {
      const result = await memberService.create({
        name: 'Test',
        telefono: 'invalid'
      });
      
      expect(result.error).toContain('invalid phone');
    });

    test('should catch missing required fields', async () => {
      const result = await memberService.create({
        name: 'Test'
        // telefono missing
      });
      
      expect(result.error).toContain('required');
    });
  });

  describe('Database Errors', () => {
    test('should handle connection failure gracefully', async () => {
      mockSupabaseError('Connection failed');
      
      const result = await memberService.list();
      
      expect(result.error).toContain('database');
      expect(result.fallback).toBe(true);
    });
  });
});
```

**Example: Rate Limiting**:
```javascript
describe('WhatsApp Rate Limiting', () => {
  test('should enforce 2 messages per day limit', async () => {
    const member = await createTestMember();

    // Send 2 messages
    await sender.send(member.phone, 'msg1');
    await sender.send(member.phone, 'msg2');

    // 3rd should fail
    const result = await sender.send(member.phone, 'msg3');
    
    expect(result.error).toContain('rate limit');
  });

  test('should reset limit at midnight', async () => {
    jest.setSystemTime(new Date('2025-10-21T22:00:00'));
    const member = await createTestMember();

    await sender.send(member.phone, 'msg1');
    await sender.send(member.phone, 'msg2');

    // Fast forward to next day
    jest.setSystemTime(new Date('2025-10-22T09:00:00'));

    // Should succeed
    const result = await sender.send(member.phone, 'msg3');
    expect(result.success).toBe(true);
  });
});
```

**Time**: 8-10 hours  
**Expected Result**: 40 new tests, coverage 88% → 90%+

---

### Day 4 (Oct 24): Data Integrity & Validation

**Task**: Implement 10 tests for data consistency

**Files to Create**:
```
tests/integration/
├── transaction-integrity.test.js  (5 tests)
└── data-consistency.test.js       (5 tests)
```

**Example**:
```javascript
describe('Transaction Integrity', () => {
  test('check-in and payment should be atomic', async () => {
    const member = await createTestMember({ deuda: 100 });

    // Simulate payment during check-in
    await expect(
      Promise.all([
        checkinService.process(member.id),
        paymentService.process(member.id, 100)
      ])
    ).resolves.toEqual([
      expect.objectContaining({ success: true }),
      expect.objectContaining({ success: true })
    ]);

    // Verify final state
    const finalMember = await memberService.get(member.id);
    expect(finalMember.deuda).toBe(0);
    expect(finalMember.checked_in_today).toBe(true);
  });

  test('should rollback on payment failure', async () => {
    const member = await createTestMember({ deuda: 100 });

    // Simulate payment failure
    mockSupabaseError('Payment declined');

    const result = await paymentService.process(member.id, 100);

    expect(result.error).toBeDefined();

    // Verify rollback
    const finalMember = await memberService.get(member.id);
    expect(finalMember.deuda).toBe(100); // Still owes
  });
});
```

**Time**: 6-8 hours  
**Expected Result**: 10 new tests, coverage 90% → 91%+

---

## 📈 Coverage Metrics - Before & After

### Current State (Oct 20)
```
✓ routes/api/:        ~65%
✓ services/:          ~40%
✓ whatsapp/client/:   ~50%
✓ utils/:             ~55%
✓ workers/:           ~30%
✓ security/:          ~70%

OVERALL: ~53% (estimated)
```

### Target State (Oct 26)
```
✓ routes/api/:        80%   (+15%)
✓ services/:          60%   (+20%)
✓ whatsapp/client/:   65%   (+15%)
✓ utils/:             70%   (+15%)
✓ workers/:           50%   (+20%)
✓ security/:          75%   (+5%)

OVERALL: 90%+ ✅
```

### Tests Added
```
Day 1: Fix 176 failing → 85%+ passing rate
Day 2: +30 critical path tests → 88% coverage
Day 3: +40 error/security tests → 90%+ coverage
Day 4: +10 data integrity tests → 91%+ coverage

TOTAL: +80 high-value tests
```

---

## 🚀 Execution Steps

### Step 1: Set Up Testing Environment
```bash
# Ensure all mocks are configured
npm run test:setup

# Install additional testing utilities if needed
npm install --save-dev jest-mock-extended faker
```

### Step 2: Create Test Structure
```bash
# Create test files with boilerplate
mkdir -p tests/unit tests/integration

# Create individual test files (see above)
```

### Step 3: Implement Tests Day by Day
```bash
# Day 1: Fix failing tests
npm test -- --listTests | wc -l
npm test 2>&1 | tee test-output.log

# Day 2-4: Add new tests
npm test -- --testPathPattern="checkin|payment|member|class|reminder"
```

### Step 4: Validate Coverage
```bash
# Generate coverage report
npm test -- --coverage

# View coverage summary
cat coverage/coverage-summary.json | jq '.total'

# Expected output after Day 4:
# "lines": { "total": 91, "covered": 82, ... } → 91% ✅
```

---

## 📋 Success Criteria

### Must Have
- [ ] Coverage: 83% → 90%+ ✅
- [ ] All tests passing (0 failures) ✅
- [ ] Critical paths tested ✅

### Nice to Have
- [ ] Coverage report in CI/CD ✅
- [ ] Coverage badge in README ✅
- [ ] 91%+ coverage achieved ✅

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Tests take too long | Prioritize critical paths first |
| Mock setup complex | Use existing mock patterns |
| Regressions introduced | Run full test suite after each day |
| Time boxing | Allocate buffer time for Day 1 |

---

## 📞 Questions?

**Q: What if we don't finish all tests in 4 days?**
- Prioritize critical paths (check-in, payment, member)
- Defer worker tests to next iteration
- Aim for 88% minimum (still a win)

**Q: Should we add E2E tests too?**
- Focus on unit/integration first (foundation)
- E2E tests come in Week 2 after features finalized

**Q: How do we prevent regression?**
- Run full test suite after every significant change
- Set up CI/CD to run tests on every push
- Maintain minimum coverage threshold (88%)

---

**Status**: 📋 PLAN READY - Execution begins Oct 21  
**Owner**: Development Team  
**Timeline**: 4 days (Oct 21-24)  
**Next**: Push plan to GitHub, begin implementation
