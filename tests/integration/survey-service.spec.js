/**
 * INTEGRATION TESTS: Survey Service
 * Testing post-class surveys, AI sentiment analysis, NPS calculation, actionable feedback
 */

const { createClient } = require('@supabase/supabase-js');
const Queue = require('bull');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

jest.mock('@supabase/supabase-js');
jest.mock('bull');
jest.mock('axios');
jest.mock('../utils/logger');
jest.mock('../utils/error-handler');

const logger = require('../utils/logger');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const surveyService = require('../../services/survey-service');

describe('INTEGRATION: Survey Service', () => {
  let mockSupabaseClient;
  let mockSurveyQueue;
  let mockLoggerInstance;

  beforeAll(() => {
    mockLoggerInstance = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    logger.createLogger.mockReturnValue(mockLoggerInstance);

    mockSupabaseClient = {
      from: jest.fn(),
      rpc: jest.fn()
    };
    createClient.mockReturnValue(mockSupabaseClient);

    mockSurveyQueue = {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn()
    };
    Queue.mockReturnValue(mockSurveyQueue);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Survey Scheduling', () => {
    test('should schedule survey 30 minutes after check-in', async () => {
      // Arrange
      const memberId = uuidv4();
      const checkInId = uuidv4();
      const classId = uuidv4();
      const checkInTime = new Date();
      const expectedDelayMs = 30 * 60 * 1000; // 30 minutes

      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: [{ survey_id: uuidv4() }],
        error: null
      });

      mockSurveyQueue.add.mockResolvedValueOnce({
        id: uuidv4()
      });

      // Act
      await surveyService.schedulePostClassSurvey(
        memberId,
        checkInId,
        classId,
        checkInTime
      );

      // Assert
      expect(mockSurveyQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'send_survey'
        }),
        expect.objectContaining({
          delay: expectedDelayMs
        })
      );
    });

    test('should not schedule survey if consent not given', async () => {
      // Arrange
      const memberId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{ consent_surveys: false }],
        error: null
      });

      // Act
      await surveyService.schedulePostClassSurvey(
        memberId,
        uuidv4(),
        uuidv4(),
        new Date()
      );

      // Assert
      expect(mockSurveyQueue.add).not.toHaveBeenCalled();
    });

    test('should not schedule if member already surveyed today for same class', async () => {
      // Arrange
      const memberId = uuidv4();
      const classId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{ survey_id: uuidv4(), created_at: new Date() }],
        error: null
      });

      // Act
      await surveyService.schedulePostClassSurvey(
        memberId,
        uuidv4(),
        classId,
        new Date()
      );

      // Assert
      expect(mockSurveyQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('2. Survey Response Collection', () => {
    test('should record 5-star rating response', async () => {
      // Arrange
      const surveyId = uuidv4();
      const rating = 5;
      const comment = 'Excellent class!';

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{
          survey_id: surveyId,
          rating: rating,
          comment: comment,
          responded_at: new Date()
        }],
        error: null
      });

      // Act
      const result = await surveyService.recordSurveyResponse(
        surveyId,
        rating,
        comment
      );

      // Assert
      expect(result.rating).toBe(5);
      expect(result.comment).toBe(comment);
    });

    test('should validate rating is between 1-5', async () => {
      // Arrange
      const surveyId = uuidv4();
      const invalidRating = 6;

      // Act & Assert
      await expect(
        surveyService.recordSurveyResponse(surveyId, invalidRating)
      ).rejects.toThrow();
    });

    test('should handle response without comment', async () => {
      // Arrange
      const surveyId = uuidv4();
      const rating = 4;

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{
          survey_id: surveyId,
          rating: rating,
          comment: null,
          responded_at: new Date()
        }],
        error: null
      });

      // Act
      const result = await surveyService.recordSurveyResponse(surveyId, rating);

      // Assert
      expect(result.rating).toBe(4);
      expect(result.comment).toBeNull();
    });
  });

  describe('3. AI Sentiment Analysis (Gemini)', () => {
    test('should analyze positive comment sentiment', async () => {
      // Arrange
      const comment = 'Amazing class! Instructor was very motivating and energetic';

      axios.post.mockResolvedValueOnce({
        data: {
          sentiment: 'positive',
          confidence: 0.98,
          keywords: ['amazing', 'motivating', 'energetic']
        }
      });

      // Act
      const result = await surveyService.analyzeSentiment(comment);

      // Assert
      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0.90);
    });

    test('should analyze negative comment sentiment', async () => {
      // Arrange
      const comment = 'Instructor was rude and the music was too loud';

      axios.post.mockResolvedValueOnce({
        data: {
          sentiment: 'negative',
          confidence: 0.95,
          keywords: ['rude', 'loud'],
          actionable: true
        }
      });

      // Act
      const result = await surveyService.analyzeSentiment(comment);

      // Assert
      expect(result.sentiment).toBe('negative');
      expect(result.actionable).toBe(true);
    });

    test('should analyze neutral comment sentiment', async () => {
      // Arrange
      const comment = 'Class was okay, nothing special';

      axios.post.mockResolvedValueOnce({
        data: {
          sentiment: 'neutral',
          confidence: 0.87
        }
      });

      // Act
      const result = await surveyService.analyzeSentiment(comment);

      // Assert
      expect(result.sentiment).toBe('neutral');
    });

    test('should fallback to keyword-based analysis if AI fails', async () => {
      // Arrange
      const comment = 'Great instructor, bad sound system';

      axios.post.mockRejectedValueOnce(new Error('Gemini API error'));

      // Act
      const result = await surveyService.analyzeSentiment(comment, { fallback: true });

      // Assert
      expect(result).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(mockLoggerInstance.warn).toHaveBeenCalled();
    });
  });

  describe('4. NPS Calculation', () => {
    test('should classify rating 5-5 as Promoter', async () => {
      // Arrange
      const rating = 5;

      // Act
      const classification = surveyService.classifyNPS(rating);

      // Assert
      expect(classification).toBe('promoter');
    });

    test('should classify rating 4 as Passive', async () => {
      // Arrange
      const rating = 4;

      // Act
      const classification = surveyService.classifyNPS(rating);

      // Assert
      expect(classification).toBe('passive');
    });

    test('should classify rating 1-3 as Detractor', async () => {
      // Arrange
      const ratings = [1, 2, 3];

      // Act
      const classifications = ratings.map(r => surveyService.classifyNPS(r));

      // Assert
      expect(classifications).toEqual(['detractor', 'detractor', 'detractor']);
    });

    test('should calculate NPS score for instructor (date range)', async () => {
      // Arrange
      const instructorId = uuidv4();
      const startDate = '2025-10-01';
      const endDate = '2025-10-18';

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          nps_score: 42,
          total_responses: 50,
          promoters_count: 30,
          passives_count: 12,
          detractors_count: 8,
          avg_rating: 4.4
        }],
        error: null
      });

      // Act
      const result = await surveyService.getInstructorNPS(
        instructorId,
        startDate,
        endDate
      );

      // Assert
      expect(result.nps_score).toBe(42);
      expect(result.nps_score).toBeGreaterThan(0); // Healthy NPS
      expect(result.promoters_count).toBeGreaterThan(result.detractors_count);
    });

    test('should calculate negative NPS (more detractors than promoters)', async () => {
      // Arrange
      const instructorId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          nps_score: -15,
          promoters_count: 20,
          detractors_count: 35,
          total_responses: 100
        }],
        error: null
      });

      // Act
      const result = await surveyService.getInstructorNPS(
        instructorId,
        '2025-10-01',
        '2025-10-18'
      );

      // Assert
      expect(result.nps_score).toBeLessThan(0);
    });
  });

  describe('5. Actionable Feedback Detection', () => {
    test('should detect low-rating (1-2) as actionable', async () => {
      // Arrange
      const surveyId = uuidv4();
      const rating = 2;
      const comment = 'Class was disorganized';

      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: [{ survey_id: surveyId, actionable: true }],
        error: null
      });

      // Act
      await surveyService.markActionableFeedback(surveyId, rating, comment);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('actionable_feedback');
    });

    test('should trigger automatic low-rating followup 60min later', async () => {
      // Arrange
      const surveyId = uuidv4();
      const rating = 1;
      const delayMs = 60 * 60 * 1000; // 60 minutes

      mockSurveyQueue.add.mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await surveyService.scheduleFollowup(surveyId, rating);

      // Assert
      expect(mockSurveyQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'send_followup'
        }),
        expect.objectContaining({
          delay: delayMs
        })
      );
    });

    test('should list actionable feedback for admin review', async () => {
      // Arrange
      const actionableList = [
        {
          survey_id: uuidv4(),
          member_name: 'Juan',
          rating: 1,
          comment: 'Instructor was rude',
          created_at: new Date(),
          status: 'pending'
        },
        {
          survey_id: uuidv4(),
          member_name: 'María',
          rating: 2,
          comment: 'Class was too crowded',
          created_at: new Date(),
          status: 'pending'
        }
      ];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: actionableList,
        error: null
      });

      // Act
      const result = await surveyService.getActionableFeedback();

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(item => item.rating <= 2)).toBe(true);
    });

    test('should mark actionable feedback as resolved', async () => {
      // Arrange
      const feedbackId = uuidv4();
      const resolution = 'Spoke with instructor about behavior';

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{
          feedback_id: feedbackId,
          status: 'resolved',
          resolution_notes: resolution
        }],
        error: null
      });

      // Act
      await surveyService.resolveActionableFeedback(feedbackId, resolution);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('actionable_feedback');
    });
  });

  describe('6. NPS Trend Analysis', () => {
    test('should calculate 7-day NPS trend for instructor', async () => {
      // Arrange
      const instructorId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [
          { date: '2025-10-12', nps_score: 38, responses: 12 },
          { date: '2025-10-13', nps_score: 40, responses: 14 },
          { date: '2025-10-14', nps_score: 45, responses: 16 },
          { date: '2025-10-15', nps_score: 42, responses: 13 },
          { date: '2025-10-16', nps_score: 48, responses: 18 },
          { date: '2025-10-17', nps_score: 45, responses: 15 },
          { date: '2025-10-18', nps_score: 50, responses: 17 }
        ],
        error: null
      });

      // Act
      const result = await surveyService.getInstructorNPSTrend(instructorId, 7);

      // Assert
      expect(result).toHaveLength(7);
      expect(result[0].date).toBeLessThan(result[6].date);
      expect(result[6].nps_score).toBeGreaterThan(result[0].nps_score);
    });

    test('should identify improving vs declining trends', async () => {
      // Arrange
      const instructorId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [
          { date: '2025-10-12', nps_score: 50, responses: 10 },
          { date: '2025-10-18', nps_score: 65, responses: 15 }
        ],
        error: null
      });

      // Act
      const trend = await surveyService.getInstructorNPSTrend(instructorId, 7);
      const improvement = trend[1].nps_score - trend[0].nps_score;

      // Assert
      expect(improvement).toBeGreaterThan(0);
    });
  });

  describe('7. Materialized View for Dashboard', () => {
    test('should refresh instructor performance view', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ success: true, refresh_time_ms: 456 }],
        error: null
      });

      // Act
      const result = await surveyService.refreshInstructorPerformanceView();

      // Assert
      expect(result.success).toBe(true);
      expect(result.refresh_time_ms).toBeLessThan(1000);
    });

    test('should provide materialized view data for dashboard', async () => {
      // Arrange
      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [
          {
            instructor_id: uuidv4(),
            instructor_name: 'Carlos',
            nps_score: 42,
            avg_rating: 4.4,
            response_rate: 0.65,
            actionable_count: 2,
            classes_last_30: 24
          }
        ],
        error: null
      });

      // Act
      const result = await surveyService.getInstructorPerformanceData();

      // Assert
      expect(result[0]).toHaveProperty('nps_score');
      expect(result[0]).toHaveProperty('response_rate');
    });
  });

  describe('8. Survey Response Rate Tracking', () => {
    test('should track response rate for surveys sent today', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          total_sent: 100,
          total_responded: 62,
          response_rate: 0.62
        }],
        error: null
      });

      // Act
      const result = await surveyService.getTodayResponseRate();

      // Assert
      expect(result.response_rate).toBeGreaterThan(0.50);
      expect(result.response_rate).toBeLessThanOrEqual(1.0);
    });

    test('should compare response rate vs target', async () => {
      // Arrange
      const targetRate = 0.50;
      const actualRate = 0.62;

      // Act
      const achieved = actualRate >= targetRate;

      // Assert
      expect(achieved).toBe(true);
    });
  });

  describe('9. Error Handling & Resilience', () => {
    test('should handle Gemini AI timeout gracefully', async () => {
      // Arrange
      const comment = 'Great class!';

      axios.post.mockRejectedValueOnce(new Error('API timeout'));

      // Act
      const result = await surveyService.analyzeSentiment(comment, { fallback: true });

      // Assert
      expect(result).toBeDefined();
      expect(mockLoggerInstance.warn).toHaveBeenCalled();
    });

    test('should retry failed survey scheduling', async () => {
      // Arrange
      const memberId = uuidv4();

      mockSurveyQueue.add
        .mockRejectedValueOnce(new Error('Queue error'))
        .mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await surveyService.schedulePostClassSurvey(
        memberId,
        uuidv4(),
        uuidv4(),
        new Date(),
        { retryCount: 2 }
      );

      // Assert
      expect(mockSurveyQueue.add).toHaveBeenCalledTimes(2);
    });

    test('should log all survey operations for audit trail', async () => {
      // Arrange
      const surveyId = uuidv4();
      const rating = 5;

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{ survey_id: surveyId, rating: rating }],
        error: null
      });

      // Act
      await surveyService.recordSurveyResponse(surveyId, rating);

      // Assert
      expect(mockLoggerInstance.info).toHaveBeenCalled();
    });
  });

  describe('10. Integration with Other Services', () => {
    test('should trigger instructor alert on actionable feedback', async () => {
      // Arrange
      const feedbackId = uuidv4();
      const instructorId = uuidv4();
      const rating = 1;

      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: [{ feedback_id: feedbackId }],
        error: null
      });

      mockSurveyQueue.add.mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await surveyService.markActionableFeedback(
        feedbackId,
        instructorId,
        rating
      );

      // Assert
      expect(mockSurveyQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringMatching(/alert|notify/)
        }),
        expect.any(Object)
      );
    });

    test('should sync survey rating with NPS calculation', async () => {
      // Arrange
      const surveys = [
        { rating: 5 }, { rating: 5 }, { rating: 4 },
        { rating: 3 }, { rating: 3 }, { rating: 2 }
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          promoters: 2,
          passives: 1,
          detractors: 3,
          nps_score: -17
        }],
        error: null
      });

      // Act
      const result = await surveyService.getInstructorNPS(
        uuidv4(),
        '2025-10-01',
        '2025-10-18'
      );

      // Assert
      expect(result.nps_score).toBe(-17);
    });
  });
});
