/**
 * PROMPT 8: Survey Service
 * Servicio de encuestas post-clase con análisis de sentimiento
 * 
 * Funcionalidades:
 * - Programar encuestas 30min después del check-in
 * - Procesar respuestas (rating + comentario)
 * - Análisis de sentimiento con Gemini API
 * - Cálculo de NPS por instructor
 * - Detección automática de feedback crítico
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const Queue = require('bull');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const log = logger.createLogger('survey-service');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const geminiAPI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// Message queue for surveys
const surveyQueue = new Queue('post-class-surveys', 
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30000
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  }
);

// Configuración
const CONFIG = {
  DELAY_MINUTES: parseInt(process.env.SURVEY_DELAY_MINUTES) || 30,
  RESPONSE_RATE_TARGET: parseFloat(process.env.SURVEY_RESPONSE_RATE_TARGET) || 0.50,
  NPS_ALERT_THRESHOLD: parseInt(process.env.SURVEY_NPS_ALERT_THRESHOLD) || 50,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-pro'
};

/**
 * Analizar sentimiento de comentario con Gemini API
 * @param {string} comment - Comentario del usuario
 * @returns {Promise<object>} {sentiment: string, score: number, category: string}
 */
async function analyzeSentiment(comment) {
  try {
    if (!geminiAPI || !comment || comment.trim().length === 0) {
      return {
        sentiment: 'neutral',
        score: 0,
        category: 'general'
      };
    }

    log.info('Analyzing sentiment with Gemini', { 
      comment_length: comment.length 
    });

    const model = geminiAPI.getGenerativeModel({ model: CONFIG.GEMINI_MODEL });

    const prompt = `
Analiza el siguiente comentario de un gimnasio y proporciona:
1. Sentimiento: positive, neutral, o negative
2. Score: número de -1.0 (muy negativo) a 1.0 (muy positivo)
3. Categoría: music, intensity, cleanliness, instructor, equipment, u other

Comentario: "${comment}"

Responde SOLO en formato JSON:
{
  "sentiment": "positive|neutral|negative",
  "score": 0.5,
  "category": "instructor|music|intensity|cleanliness|equipment|other"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log.warn('Gemini response not in JSON format', { response: text });
      return { sentiment: 'neutral', score: 0, category: 'general' };
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    log.info('Sentiment analyzed', { 
      sentiment: analysis.sentiment,
      score: analysis.score,
      category: analysis.category
    });

    return {
      sentiment: analysis.sentiment || 'neutral',
      score: parseFloat(analysis.score) || 0,
      category: analysis.category || 'general'
    };
  } catch (error) {
    log.error('Error analyzing sentiment', { 
      error: error.message,
      comment_preview: comment?.substring(0, 50)
    });
    // Fallback: análisis simple por palabras clave
    return simpleSentimentAnalysis(comment);
  }
}

/**
 * Análisis de sentimiento simple (fallback)
 */
function simpleSentimentAnalysis(comment) {
  const lowerComment = comment.toLowerCase();
  
  const positiveWords = ['excelente', 'genial', 'increíble', 'perfecto', 'buenísimo', 'fantástico', 'espectacular'];
  const negativeWords = ['malo', 'pésimo', 'horrible', 'sucio', 'roto', 'problema', 'queja'];
  
  const positiveCount = positiveWords.filter(word => lowerComment.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerComment.includes(word)).length;
  
  let sentiment = 'neutral';
  let score = 0;
  
  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    score = Math.min(positiveCount * 0.3, 1.0);
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    score = Math.max(negativeCount * -0.3, -1.0);
  }
  
  return { sentiment, score, category: 'general' };
}

/**
 * Programar encuesta post-clase
 * @param {string} checkinId - ID del check-in
 * @param {number} delayMinutes - Minutos de delay (default: 30)
 * @returns {Promise<object>} Información de la encuesta programada
 */
async function schedulePostClassSurvey(checkinId, delayMinutes = CONFIG.DELAY_MINUTES) {
  try {
    log.info('Scheduling post-class survey', {
      checkin_id: checkinId,
      delay_minutes: delayMinutes
    });

    // Verificar que el check-in existe
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .select('*, members(*), classes(*, instructors(*))')
      .eq('id', checkinId)
      .single();

    if (checkinError || !checkin) {
      throw new AppError(
        'Check-in not found',
        ErrorTypes.NOT_FOUND,
        404,
        { checkin_id: checkinId }
      );
    }

    // Verificar que hay clase e instructor
    if (!checkin.classes || !checkin.classes.instructors) {
      log.info('Check-in without class/instructor, skipping survey', {
        checkin_id: checkinId
      });
      return { skipped: true, reason: 'no_class_or_instructor' };
    }

    // Verificar consentimiento WhatsApp
    if (!checkin.members.whatsapp_opted_in) {
      log.info('Member opted out, skipping survey', {
        checkin_id: checkinId,
        member_id: checkin.member_id
      });
      return { skipped: true, reason: 'opted_out' };
    }

    // Calcular timestamp de envío
    const scheduledFor = new Date(checkin.fecha_hora);
    scheduledFor.setMinutes(scheduledFor.getMinutes() + delayMinutes);

    // Verificar si ya existe encuesta para este check-in
    const { data: existingSurvey } = await supabase
      .from('surveys')
      .select('id')
      .eq('checkin_id', checkinId)
      .single();

    let surveyId;

    if (existingSurvey) {
      surveyId = existingSurvey.id;
      log.info('Survey already exists (created by trigger)', {
        survey_id: surveyId,
        checkin_id: checkinId
      });
    } else {
      // Crear manualmente si el trigger no lo creó
      const { data: newSurvey, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          checkin_id: checkinId,
          member_id: checkin.member_id,
          instructor_id: checkin.classes.instructor_id,
          class_id: checkin.class_id,
          survey_sent_at: scheduledFor.toISOString()
        })
        .select()
        .single();

      if (surveyError) {
        throw new AppError(
          'Failed to create survey',
          ErrorTypes.DATABASE,
          500,
          { checkin_id: checkinId, error: surveyError }
        );
      }

      surveyId = newSurvey.id;
    }

    // Agregar job a la queue
    const delayMs = delayMinutes * 60 * 1000;
    await surveyQueue.add(
      'send-survey-message',
      {
        surveyId,
        memberId: checkin.member_id,
        memberName: checkin.members.first_name,
        phone: checkin.members.phone,
        className: checkin.classes.name,
        instructorName: `${checkin.classes.instructors.first_name} ${checkin.classes.instructors.last_name}`
      },
      {
        delay: delayMs,
        jobId: `survey_${surveyId}`
      }
    );

    log.info('Survey scheduled successfully', {
      survey_id: surveyId,
      checkin_id: checkinId,
      scheduled_for: scheduledFor.toISOString()
    });

    return {
      surveyId,
      scheduledFor: scheduledFor.toISOString(),
      delayMinutes
    };
  } catch (error) {
    log.error('Error scheduling survey', {
      checkin_id: checkinId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Procesar respuesta de encuesta
 * @param {string} surveyId - ID de la encuesta
 * @param {number} rating - Rating de 1-5
 * @param {string} comment - Comentario opcional
 * @returns {Promise<object>} Encuesta actualizada
 */
async function processSurveyResponse(surveyId, rating, comment = null) {
  try {
    log.info('Processing survey response', {
      survey_id: surveyId,
      rating,
      has_comment: !!comment
    });

    // Obtener survey
    const { data: survey, error: fetchError } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .single();

    if (fetchError || !survey) {
      throw new AppError(
        'Survey not found',
        ErrorTypes.NOT_FOUND,
        404,
        { survey_id: surveyId }
      );
    }

    // Validar rating
    if (rating < 1 || rating > 5) {
      throw new AppError(
        'Invalid rating (must be 1-5)',
        ErrorTypes.VALIDATION,
        400,
        { rating }
      );
    }

    // Analizar sentimiento si hay comentario
    let sentimentData = { sentiment: 'not_analyzed', score: null, category: null };
    if (comment && comment.trim().length > 0) {
      sentimentData = await analyzeSentiment(comment);
    }

    // Calcular tiempo de respuesta
    const surveyRespondedAt = new Date();
    const surveySentAt = new Date(survey.survey_sent_at);
    const responseTimeMinutes = Math.round((surveyRespondedAt - surveySentAt) / 60000);

    // Actualizar survey
    const { data: updated, error: updateError } = await supabase
      .from('surveys')
      .update({
        rating,
        comment,
        sentiment: sentimentData.sentiment,
        sentiment_score: sentimentData.score,
        feedback_category: sentimentData.category,
        survey_responded_at: surveyRespondedAt.toISOString(),
        response_time_minutes: responseTimeMinutes
      })
      .eq('id', surveyId)
      .select()
      .single();

    if (updateError) {
      throw new AppError(
        'Failed to update survey',
        ErrorTypes.DATABASE,
        500,
        { survey_id: surveyId, error: updateError }
      );
    }

    log.info('Survey response processed', {
      survey_id: surveyId,
      rating,
      sentiment: sentimentData.sentiment,
      requires_action: updated.requires_action
    });

    // Si rating bajo (<=2), enviar mensaje de seguimiento
    if (rating <= 2 && !comment) {
      await scheduleLowRatingFollowup(surveyId);
    }

    return updated;
  } catch (error) {
    log.error('Error processing survey response', {
      survey_id: surveyId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Programar mensaje de seguimiento para ratings bajos
 */
async function scheduleLowRatingFollowup(surveyId) {
  try {
    const { data: survey } = await supabase
      .from('surveys')
      .select('*, members(*), classes(*)')
      .eq('id', surveyId)
      .single();

    if (!survey) return;

    // Enviar después de 5 minutos
    await surveyQueue.add(
      'send-low-rating-followup',
      {
        surveyId: survey.id,
        memberName: survey.members.first_name,
        phone: survey.members.phone,
        className: survey.classes?.name || 'la clase'
      },
      {
        delay: 5 * 60 * 1000, // 5 minutos
        jobId: `followup_${surveyId}`
      }
    );

    log.info('Low rating followup scheduled', { survey_id: surveyId });
  } catch (error) {
    log.error('Error scheduling followup', { survey_id: surveyId, error: error.message });
  }
}

/**
 * Calcular NPS de instructor
 * @param {string} instructorId - ID del instructor
 * @param {number} days - Días a analizar (default: 30)
 * @returns {Promise<object>} Estadísticas de NPS
 */
async function calculateInstructorNPS(instructorId, days = 30) {
  try {
    const { data, error } = await supabase
      .rpc('calculate_instructor_nps', { 
        p_instructor_id: instructorId,
        p_days: days
      });

    if (error) {
      throw new AppError(
        'Failed to calculate NPS',
        ErrorTypes.DATABASE,
        500,
        { instructor_id: instructorId, error }
      );
    }

    return data[0] || {
      instructor_id: instructorId,
      total_responses: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      nps_score: 0,
      avg_rating: 0,
      response_rate: 0
    };
  } catch (error) {
    log.error('Error calculating NPS', {
      instructor_id: instructorId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtener feedback que requiere acción
 * @param {number} limit - Número máximo de resultados
 * @returns {Promise<Array>} Lista de feedback crítico
 */
async function getActionableFeedback(limit = 50) {
  try {
    const { data, error } = await supabase
      .rpc('get_actionable_feedback', { p_limit: limit });

    if (error) {
      throw new AppError(
        'Failed to get actionable feedback',
        ErrorTypes.DATABASE,
        500,
        { error }
      );
    }

    return data || [];
  } catch (error) {
    log.error('Error getting actionable feedback', { error: error.message });
    throw error;
  }
}

/**
 * Obtener tendencia de rating de instructor
 * @param {string} instructorId - ID del instructor
 * @param {number} weeks - Semanas a analizar (default: 12)
 * @returns {Promise<Array>} Tendencia semanal
 */
async function getInstructorRatingTrend(instructorId, weeks = 12) {
  try {
    const { data, error } = await supabase
      .rpc('get_instructor_rating_trend', { 
        p_instructor_id: instructorId,
        p_weeks: weeks
      });

    if (error) {
      throw new AppError(
        'Failed to get rating trend',
        ErrorTypes.DATABASE,
        500,
        { instructor_id: instructorId, error }
      );
    }

    return data || [];
  } catch (error) {
    log.error('Error getting rating trend', {
      instructor_id: instructorId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  schedulePostClassSurvey,
  processSurveyResponse,
  calculateInstructorNPS,
  getActionableFeedback,
  getInstructorRatingTrend,
  analyzeSentiment,
  surveyQueue
};
