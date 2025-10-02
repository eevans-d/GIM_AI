/**
 * PROMPT 9: Replacement API Routes
 * Endpoints para gestión de ausencias y reemplazos de instructores
 */

const express = require('express');
const router = express.Router();
const replacementService = require('../../services/replacement-service');
const { AppError, ErrorTypes } = require('../../utils/error-handler');
const logger = require('../../utils/logger');

const log = logger.createLogger('replacement-routes');

/**
 * POST /api/replacements/absence
 * Reportar ausencia de instructor (desde WhatsApp o panel)
 */
router.post('/absence', async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const { instructor_id, message, reason } = req.body;

    if (!instructor_id || !message) {
      throw new AppError(
        'instructor_id and message are required',
        ErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    log.info('Absence reported', {
      correlationId,
      instructor_id,
      reason
    });

    const result = await replacementService.reportAbsence(
      instructor_id,
      message,
      reason
    );

    res.status(200).json({
      success: true,
      message: 'Absence registered and replacement search initiated',
      data: result
    });
  } catch (error) {
    log.error('Error reporting absence', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/replacements/:id/find-candidates
 * Buscar candidatos para un reemplazo específico
 */
router.post('/:id/find-candidates', async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const { id } = req.params;
    const { max_candidates } = req.query;

    log.info('Finding replacement candidates', {
      correlationId,
      replacement_id: id
    });

    const result = await replacementService.findAndOfferReplacement(
      id,
      max_candidates ? parseInt(max_candidates) : 5
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    log.error('Error finding candidates', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/replacements/offers/:offerId/respond
 * Responder a una oferta de reemplazo (aceptar/rechazar)
 */
router.post('/offers/:offerId/respond', async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const { offerId } = req.params;
    const { accepted, decline_reason } = req.body;

    if (typeof accepted !== 'boolean') {
      throw new AppError(
        'accepted (boolean) is required',
        ErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    log.info('Processing offer response', {
      correlationId,
      offer_id: offerId,
      accepted
    });

    const result = await replacementService.processOfferResponse(
      offerId,
      accepted,
      decline_reason
    );

    res.status(200).json({
      success: true,
      message: accepted ? 'Replacement accepted' : 'Offer declined',
      data: result
    });
  } catch (error) {
    log.error('Error processing offer response', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/replacements/active
 * Listar reemplazos activos/pendientes
 */
router.get('/active', async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const { supabase } = req;

    log.info('Fetching active replacements', { correlationId });

    const { data, error } = await supabase
      .from('v_active_replacements')
      .select('*')
      .order('hours_until_class', { ascending: true });

    if (error) {
      throw new AppError(
        'Failed to fetch active replacements',
        ErrorTypes.DATABASE_ERROR,
        500,
        { error: error.message }
      );
    }

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    log.error('Error fetching active replacements', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/replacements/:id
 * Obtener detalles de un reemplazo específico
 */
router.get('/:id', async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const { id } = req.params;
    const { supabase } = req;

    log.info('Fetching replacement details', {
      correlationId,
      replacement_id: id
    });

    const { data, error } = await supabase
      .from('replacements')
      .select(`
        *,
        classes(nombre, ubicacion, capacidad_maxima),
        original_instructor:instructors!replacements_original_instructor_id_fkey(id, nombre, telefono, especialidades),
        replacement_instructor:instructors!replacements_replacement_instructor_id_fkey(id, nombre, telefono, especialidades),
        offers:replacement_offers(
          id,
          instructor_id,
          status,
          priority_score,
          sent_at,
          responded_at,
          decline_reason,
          instructors(nombre)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new AppError(
        'Replacement not found',
        ErrorTypes.NOT_FOUND,
        404,
        { replacement_id: id }
      );
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    log.error('Error fetching replacement details', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/replacements/instructor/:instructorId/stats
 * Obtener estadísticas de reemplazos de un instructor
 */
router.get('/instructor/:instructorId/stats', async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const { instructorId } = req.params;
    const { days } = req.query;

    log.info('Fetching instructor replacement stats', {
      correlationId,
      instructor_id: instructorId,
      days: days || 90
    });

    const stats = await replacementService.getInstructorReplacementStats(
      instructorId,
      days ? parseInt(days) : 90
    );

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    log.error('Error fetching instructor stats', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/replacements/metrics
 * Obtener métricas globales del sistema de reemplazos
 */
router.get('/metrics', async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const { supabase } = req;
    const { months } = req.query;

    log.info('Fetching replacement metrics', { correlationId });

    const { data, error } = await supabase
      .from('v_replacement_metrics')
      .select('*')
      .limit(months ? parseInt(months) : 6);

    if (error) {
      throw new AppError(
        'Failed to fetch metrics',
        ErrorTypes.DATABASE_ERROR,
        500,
        { error: error.message }
      );
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    log.error('Error fetching metrics', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * PUT /api/replacements/:id/cancel
 * Cancelar búsqueda de reemplazo (instructor original retoma clase)
 */
router.put('/:id/cancel', async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const { id } = req.params;
    const { supabase } = req;

    log.info('Cancelling replacement', {
      correlationId,
      replacement_id: id
    });

    // Obtener reemplazo actual
    const { data: replacement } = await supabase
      .from('replacements')
      .select('class_id, original_instructor_id, status')
      .eq('id', id)
      .single();

    if (!replacement) {
      throw new AppError(
        'Replacement not found',
        ErrorTypes.NOT_FOUND,
        404,
        { replacement_id: id }
      );
    }

    if (replacement.status === 'completed') {
      throw new AppError(
        'Cannot cancel completed replacement',
        ErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    // Restaurar instructor original en la clase
    await supabase
      .from('classes')
      .update({ instructor_id: replacement.original_instructor_id })
      .eq('id', replacement.class_id);

    // Marcar reemplazo como cancelado
    await supabase
      .from('replacements')
      .update({
        status: 'original_resumed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // Expirar ofertas pendientes
    await supabase
      .from('replacement_offers')
      .update({ status: 'expired' })
      .eq('replacement_id', id)
      .eq('status', 'sent');

    log.info('Replacement cancelled', { replacement_id: id });

    res.status(200).json({
      success: true,
      message: 'Replacement cancelled, original instructor resumed'
    });
  } catch (error) {
    log.error('Error cancelling replacement', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/replacements/offers/pending
 * Listar ofertas pendientes (para instructores)
 */
router.get('/offers/pending', async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const { instructor_id } = req.query;
    const { supabase } = req;

    if (!instructor_id) {
      throw new AppError(
        'instructor_id query parameter is required',
        ErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    log.info('Fetching pending offers', {
      correlationId,
      instructor_id
    });

    const { data, error } = await supabase
      .from('replacement_offers')
      .select(`
        *,
        replacements(
          id,
          class_type,
          scheduled_date,
          scheduled_time,
          bonus_amount,
          bonus_tier,
          hours_until_class,
          classes(nombre, ubicacion),
          instructors!replacements_original_instructor_id_fkey(nombre)
        )
      `)
      .eq('instructor_id', instructor_id)
      .eq('status', 'sent')
      .gt('expires_at', new Date().toISOString())
      .order('sent_at', { ascending: false });

    if (error) {
      throw new AppError(
        'Failed to fetch pending offers',
        ErrorTypes.DATABASE_ERROR,
        500,
        { error: error.message }
      );
    }

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    log.error('Error fetching pending offers', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/replacements/availability
 * Configurar disponibilidad de instructor para reemplazos
 */
router.post('/availability', async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const {
      instructor_id,
      day_of_week,
      start_time,
      end_time,
      can_teach_classes,
      prefers_replacements,
      min_notice_hours
    } = req.body;

    if (!instructor_id || day_of_week === undefined || !start_time || !end_time) {
      throw new AppError(
        'instructor_id, day_of_week, start_time, end_time are required',
        ErrorTypes.VALIDATION_ERROR,
        400
      );
    }

    const { supabase } = req;

    log.info('Setting instructor availability', {
      correlationId,
      instructor_id,
      day_of_week
    });

    const { data, error } = await supabase
      .from('instructor_availability')
      .upsert({
        instructor_id,
        day_of_week,
        start_time,
        end_time,
        availability_type: 'available',
        can_teach_classes: can_teach_classes || [],
        prefers_replacements: prefers_replacements !== false,
        min_notice_hours: min_notice_hours || 2
      }, {
        onConflict: 'instructor_id,day_of_week,start_time,end_time'
      })
      .select()
      .single();

    if (error) {
      throw new AppError(
        'Failed to set availability',
        ErrorTypes.DATABASE_ERROR,
        500,
        { error: error.message }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Availability set successfully',
      data
    });
  } catch (error) {
    log.error('Error setting availability', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/replacements/instructor/:instructorId/availability
 * Obtener disponibilidad configurada de un instructor
 */
router.get('/instructor/:instructorId/availability', async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const { instructorId } = req.params;
    const { supabase } = req;

    log.info('Fetching instructor availability', {
      correlationId,
      instructor_id: instructorId
    });

    const { data, error } = await supabase
      .from('instructor_availability')
      .select('*')
      .eq('instructor_id', instructorId)
      .eq('active', true)
      .order('day_of_week', { ascending: true });

    if (error) {
      throw new AppError(
        'Failed to fetch availability',
        ErrorTypes.DATABASE_ERROR,
        500,
        { error: error.message }
      );
    }

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    log.error('Error fetching availability', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

module.exports = router;
