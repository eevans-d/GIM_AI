/**
 * PROMPT 8: Surveys API Routes
 * Endpoints para sistema de encuestas post-clase
 */

const express = require('express');
const router = express.Router();
const { createLogger } = require('../../utils/logger');
const { AppError, ErrorTypes } = require('../../utils/error-handler');
const surveyService = require('../../services/survey-service');

const log = createLogger('surveys-api');

/**
 * POST /api/surveys/schedule
 * Programar encuesta manualmente
 */
router.post('/schedule', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { checkin_id, delay_minutes } = req.body;

    if (!checkin_id) {
      throw new AppError(
        'checkin_id is required',
        ErrorTypes.VALIDATION,
        400,
        { correlationId }
      );
    }

    log.info('Manual survey schedule requested', {
      correlationId,
      checkin_id,
      delay_minutes
    });

    const result = await surveyService.schedulePostClassSurvey(
      checkin_id,
      delay_minutes
    );

    res.status(200).json({
      success: true,
      message: result.skipped 
        ? 'Survey skipped' 
        : 'Survey scheduled successfully',
      data: result
    });
  } catch (error) {
    log.error('Error scheduling survey', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/surveys/response
 * Registrar respuesta de encuesta
 */
router.post('/response', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { survey_id, rating, comment } = req.body;

    if (!survey_id || !rating) {
      throw new AppError(
        'survey_id and rating are required',
        ErrorTypes.VALIDATION,
        400,
        { correlationId }
      );
    }

    if (rating < 1 || rating > 5) {
      throw new AppError(
        'rating must be between 1 and 5',
        ErrorTypes.VALIDATION,
        400,
        { rating }
      );
    }

    log.info('Survey response received', {
      correlationId,
      survey_id,
      rating,
      has_comment: !!comment
    });

    const result = await surveyService.processSurveyResponse(
      survey_id,
      rating,
      comment
    );

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: result
    });
  } catch (error) {
    log.error('Error processing survey response', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/surveys/instructor/:instructorId/nps
 * Obtener NPS de un instructor
 */
router.get('/instructor/:instructorId/nps', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { instructorId } = req.params;
    const { days } = req.query;
    const daysInt = days ? parseInt(days) : 30;

    log.info('Instructor NPS requested', {
      correlationId,
      instructor_id: instructorId,
      days: daysInt
    });

    const nps = await surveyService.calculateInstructorNPS(instructorId, daysInt);

    res.status(200).json({
      success: true,
      data: nps,
      period_days: daysInt
    });
  } catch (error) {
    log.error('Error fetching instructor NPS', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/surveys/instructor/:instructorId/trend
 * Obtener tendencia de rating de instructor
 */
router.get('/instructor/:instructorId/trend', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { instructorId } = req.params;
    const { weeks } = req.query;
    const weeksInt = weeks ? parseInt(weeks) : 12;

    log.info('Instructor trend requested', {
      correlationId,
      instructor_id: instructorId,
      weeks: weeksInt
    });

    const trend = await surveyService.getInstructorRatingTrend(instructorId, weeksInt);

    res.status(200).json({
      success: true,
      data: trend,
      period_weeks: weeksInt
    });
  } catch (error) {
    log.error('Error fetching instructor trend', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/surveys/actionable
 * Obtener feedback que requiere atención
 */
router.get('/actionable', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { limit } = req.query;
    const limitInt = limit ? parseInt(limit) : 50;

    log.info('Actionable feedback requested', {
      correlationId,
      limit: limitInt
    });

    const feedback = await surveyService.getActionableFeedback(limitInt);

    res.status(200).json({
      success: true,
      data: feedback,
      count: feedback.length
    });
  } catch (error) {
    log.error('Error fetching actionable feedback', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/surveys/:id
 * Obtener detalles de una encuesta específica
 */
router.get('/:id', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { id } = req.params;

    log.info('Survey details requested', {
      correlationId,
      survey_id: id
    });

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase
      .from('surveys')
      .select('*, members(*), instructors(*), classes(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new AppError(
        'Survey not found',
        ErrorTypes.NOT_FOUND,
        404,
        { survey_id: id }
      );
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    log.error('Error fetching survey', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/surveys/:id/action-taken
 * Marcar feedback como atendido
 */
router.post('/:id/action-taken', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { id } = req.params;
    const { notes } = req.body;

    log.info('Marking survey action as taken', {
      correlationId,
      survey_id: id
    });

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase
      .from('surveys')
      .update({
        action_taken: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(
        'Failed to update survey',
        ErrorTypes.DATABASE,
        500,
        { survey_id: id, error }
      );
    }

    // Log action taken
    await supabase
      .from('system_logs')
      .insert({
        level: 'INFO',
        component: 'surveys',
        message: 'Action taken on survey',
        metadata: {
          survey_id: id,
          notes: notes || 'No notes provided'
        },
        correlation_id: correlationId
      });

    res.status(200).json({
      success: true,
      message: 'Survey marked as action taken',
      data
    });
  } catch (error) {
    log.error('Error marking action taken', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/surveys/analyze-sentiment
 * Endpoint de testing para análisis de sentimiento
 */
router.post('/analyze-sentiment', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { comment } = req.body;

    if (!comment) {
      throw new AppError(
        'comment is required',
        ErrorTypes.VALIDATION,
        400,
        { correlationId }
      );
    }

    log.info('Sentiment analysis requested', {
      correlationId,
      comment_length: comment.length
    });

    const result = await surveyService.analyzeSentiment(comment);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    log.error('Error analyzing sentiment', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

module.exports = router;
