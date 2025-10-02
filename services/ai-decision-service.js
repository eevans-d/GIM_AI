/**
 * PROMPT 15: AI DECISION SERVICE
 * Servicio para generar decisiones prioritarias usando Google Gemini AI
 * Analiza KPIs y genera recomendaciones ejecutivas con IA
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const logger = require('../utils/logger').createLogger('ai-decision-service');

// Configuración
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-pro' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Generar decisiones prioritarias del día usando IA
 * @param {UUID} snapshotId - ID del snapshot diario
 * @param {Object} kpis - KPIs actuales
 * @param {Object} context - Contexto adicional (trends, alerts)
 * @returns {Array} Top 3-5 decisiones prioritarias ordenadas
 */
async function generatePriorityDecisions(snapshotId, kpis, context = {}, correlationId) {
    try {
        logger.info('Generando decisiones prioritarias con IA', {
            correlationId,
            snapshotId,
            kpis: Object.keys(kpis)
        });

        // Construir prompt para Gemini
        const prompt = buildDecisionPrompt(kpis, context);

        // Llamar a Gemini AI
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        logger.info('Respuesta de Gemini AI recibida', {
            correlationId,
            responseLength: text.length
        });

        // Parsear respuesta JSON de Gemini
        const decisions = parseAIResponse(text);

        // Guardar decisiones en base de datos
        const savedDecisions = await saveDecisions(snapshotId, decisions, correlationId);

        logger.info('Decisiones prioritarias generadas exitosamente', {
            correlationId,
            decisionsCount: savedDecisions.length
        });

        return savedDecisions;

    } catch (error) {
        logger.error('Error al generar decisiones prioritarias', {
            correlationId,
            error: error.message
        });
        throw new AppError(
            'Error al generar decisiones con IA',
            ErrorTypes.EXTERNAL_API_ERROR,
            500,
            { originalError: error.message }
        );
    }
}

/**
 * Construir prompt optimizado para Gemini
 */
function buildDecisionPrompt(kpis, context) {
    const prompt = `Eres un consultor experto en gestión de gimnasios. Analiza los siguientes KPIs y genera las 3 decisiones más prioritarias que debe tomar la gerencia HOY.

**KPIs ACTUALES:**
📊 FINANCIEROS:
- Ingresos del día: $${kpis.revenue_total || 0}
  - Membresías: $${kpis.revenue_memberships || 0}
  - Clases: $${kpis.revenue_classes || 0}
- Deuda total: $${kpis.total_debt || 0} (${kpis.debt_percentage || 0}% de miembros)

📈 OPERACIONALES:
- Check-ins del día: ${kpis.total_checkins || 0}
- Miembros únicos: ${kpis.unique_members_attended || 0}
- Clases realizadas: ${kpis.classes_held || 0}
- Ocupación promedio: ${kpis.avg_class_occupancy || 0}%

😊 SATISFACCIÓN:
- NPS (últimos 7 días): ${kpis.nps_score || 0}
- Rating promedio clases: ${kpis.avg_class_rating || 0}/5
- Encuestas completadas: ${kpis.surveys_completed || 0}
- Quejas: ${kpis.complaints_count || 0}

👥 RETENCIÓN:
- Miembros activos: ${kpis.active_members || 0}
- Nuevos (30 días): ${kpis.new_members || 0}
- Bajas (30 días): ${kpis.churned_members || 0}
- Tasa de retención: ${kpis.retention_rate || 0}%

${context.trends ? `
**TENDENCIAS (últimos 7 días):**
${context.trends}
` : ''}

${context.alerts ? `
**ALERTAS ACTIVAS:**
${context.alerts}
` : ''}

**INSTRUCCIONES:**
Genera exactamente 3 decisiones prioritarias en formato JSON array. Cada decisión debe incluir:

1. **category**: una de [financial, operational, satisfaction, retention, staff, marketing]
2. **title**: título corto y accionable (máx 50 caracteres)
3. **description**: descripción concisa del problema/oportunidad (máx 150 caracteres)
4. **rationale**: por qué es importante AHORA (máx 200 caracteres)
5. **recommended_action**: acción específica y ejecutable (máx 200 caracteres)
6. **action_owner**: quién debería ejecutar (ej: "Gerente General", "Director de Operaciones")
7. **estimated_time_minutes**: tiempo estimado en minutos (número)
8. **impact_score**: impacto potencial 0-100 (número)
9. **urgency_level**: una de [low, medium, high, critical]
10. **related_kpis**: objeto con KPIs relevantes (ej: {"revenue": -15, "nps": 45})

RESPONDE SOLO CON EL JSON ARRAY, SIN TEXTO ADICIONAL:`;

    return prompt;
}

/**
 * Parsear respuesta de IA y extraer JSON
 */
function parseAIResponse(text) {
    try {
        // Limpiar markdown code blocks si existen
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/```\n?/g, '');
        }

        // Parsear JSON
        const decisions = JSON.parse(cleanText);

        // Validar estructura
        if (!Array.isArray(decisions)) {
            throw new Error('La respuesta de IA no es un array');
        }

        // Validar cada decisión
        decisions.forEach((decision, index) => {
            if (!decision.category || !decision.title || !decision.description) {
                throw new Error(`Decisión ${index + 1} tiene estructura inválida`);
            }
        });

        return decisions;

    } catch (error) {
        logger.error('Error al parsear respuesta de IA', {
            error: error.message,
            responseText: text.substring(0, 500)
        });
        
        // Fallback: generar decisiones genéricas basadas en KPIs
        return generateFallbackDecisions();
    }
}

/**
 * Generar decisiones fallback si IA falla
 */
function generateFallbackDecisions() {
    return [
        {
            category: 'operational',
            title: 'Revisar ocupación de clases',
            description: 'Analizar clases con baja ocupación y tomar acciones correctivas',
            rationale: 'La ocupación promedio requiere análisis para optimizar recursos',
            recommended_action: 'Reunión con instructores para revisar horarios y contenido de clases',
            action_owner: 'Director de Operaciones',
            estimated_time_minutes: 60,
            impact_score: 70,
            urgency_level: 'medium',
            related_kpis: { avg_occupancy: 65 }
        },
        {
            category: 'financial',
            title: 'Revisar estrategia de cobros',
            description: 'Evaluar y mejorar proceso de cobro de deudas pendientes',
            rationale: 'La deuda actual requiere atención para mantener flujo de caja',
            recommended_action: 'Implementar recordatorios automatizados y plan de pagos',
            action_owner: 'Gerente de Finanzas',
            estimated_time_minutes: 90,
            impact_score: 85,
            urgency_level: 'high',
            related_kpis: { debt_percentage: 12 }
        },
        {
            category: 'satisfaction',
            title: 'Mejorar experiencia del cliente',
            description: 'Implementar acciones para aumentar satisfacción de miembros',
            rationale: 'El NPS actual indica oportunidades de mejora en servicio',
            recommended_action: 'Encuesta detallada de satisfacción y plan de mejoras',
            action_owner: 'Gerente de Servicio',
            estimated_time_minutes: 120,
            impact_score: 75,
            urgency_level: 'medium',
            related_kpis: { nps: 45 }
        }
    ];
}

/**
 * Guardar decisiones en base de datos
 */
async function saveDecisions(snapshotId, decisions, correlationId) {
    try {
        const savedDecisions = [];

        for (let i = 0; i < decisions.length; i++) {
            const decision = decisions[i];
            
            const { data, error } = await supabase
                .from('priority_decisions')
                .insert({
                    snapshot_id: snapshotId,
                    decision_date: new Date().toISOString().split('T')[0],
                    priority_rank: i + 1,
                    decision_category: decision.category,
                    decision_title: decision.title,
                    decision_description: decision.description,
                    decision_rationale: decision.rationale,
                    related_kpis: decision.related_kpis || {},
                    impact_score: decision.impact_score || 50,
                    urgency_level: decision.urgency_level || 'medium',
                    recommended_action: decision.recommended_action,
                    action_owner: decision.action_owner,
                    estimated_time_minutes: decision.estimated_time_minutes || 60,
                    status: 'pending',
                    generated_by_ai: true,
                    ai_model: process.env.GEMINI_MODEL || 'gemini-pro',
                    ai_confidence: 85 // Default confidence
                })
                .select()
                .single();

            if (error) {
                logger.error('Error al guardar decisión', {
                    correlationId,
                    decision: decision.title,
                    error: error.message
                });
                continue;
            }

            savedDecisions.push(data);
        }

        return savedDecisions;

    } catch (error) {
        logger.error('Error al guardar decisiones', {
            correlationId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtener decisiones pendientes del día
 */
async function getTodayDecisions(correlationId) {
    try {
        const { data, error } = await supabase
            .from('priority_decisions')
            .select('*')
            .eq('decision_date', new Date().toISOString().split('T')[0])
            .order('priority_rank', { ascending: true });

        if (error) {
            throw new AppError(
                'Error al obtener decisiones',
                ErrorTypes.DATABASE_ERROR,
                500,
                { error: error.message }
            );
        }

        return data || [];

    } catch (error) {
        logger.error('Error al obtener decisiones del día', {
            correlationId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Marcar decisión como completada
 */
async function completeDecision(decisionId, completionNotes, correlationId) {
    try {
        const { data, error } = await supabase
            .from('priority_decisions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                completion_notes: completionNotes
            })
            .eq('id', decisionId)
            .select()
            .single();

        if (error) {
            throw new AppError(
                'Error al completar decisión',
                ErrorTypes.DATABASE_ERROR,
                500
            );
        }

        logger.info('Decisión completada', {
            correlationId,
            decisionId,
            title: data.decision_title
        });

        return data;

    } catch (error) {
        logger.error('Error al completar decisión', {
            correlationId,
            decisionId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Descartar decisión con justificación
 */
async function dismissDecision(decisionId, reason, correlationId) {
    try {
        const { data, error } = await supabase
            .from('priority_decisions')
            .update({
                status: 'dismissed',
                completion_notes: `Descartada: ${reason}`
            })
            .eq('id', decisionId)
            .select()
            .single();

        if (error) {
            throw new AppError(
                'Error al descartar decisión',
                ErrorTypes.DATABASE_ERROR,
                500
            );
        }

        logger.info('Decisión descartada', {
            correlationId,
            decisionId,
            reason
        });

        return data;

    } catch (error) {
        logger.error('Error al descartar decisión', {
            correlationId,
            error: error.message
        });
        throw error;
    }
}

module.exports = {
    generatePriorityDecisions,
    getTodayDecisions,
    completeDecision,
    dismissDecision
};
