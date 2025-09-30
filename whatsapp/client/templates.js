/**
 * WhatsApp Business API - Templates Management
 * HSM (Highly Structured Message) templates definitions
 */

/**
 * Available WhatsApp templates
 * Note: These must be pre-approved by WhatsApp Business API
 */
const templates = {
  // Welcome message for new members
  bienvenida_nuevo_socio: {
    name: 'bienvenida_nuevo_socio',
    language: 'es',
    category: 'ACCOUNT_UPDATE',
    description: 'Mensaje de bienvenida para nuevos socios',
    components: [
      {
        type: 'BODY',
        text: '¡Bienvenido {{1}} a nuestra familia fitness! 🏋️\n\nTu código QR está listo. Úsalo en cada visita para un check-in rápido.\n\n¿Dudas? Responde este mensaje.',
      },
    ],
    parameters: ['name'],
  },

  // Check-in confirmation
  checkin_confirmado: {
    name: 'checkin_confirmado',
    language: 'es',
    category: 'ACCOUNT_UPDATE',
    description: 'Confirmación de check-in exitoso',
    components: [
      {
        type: 'BODY',
        text: '✅ Check-in confirmado, {{1}}!\n\n📍 {{2}}\n⏰ {{3}}\n\n¡Excelente entrenamiento! 💪',
      },
    ],
    parameters: ['name', 'class', 'time'],
  },

  // Class reminder 24h before
  recordatorio_clase_24h: {
    name: 'recordatorio_clase_24h',
    language: 'es',
    category: 'MARKETING',
    description: 'Recordatorio de clase 24h antes',
    components: [
      {
        type: 'BODY',
        text: '🔔 Hola {{1}}, recordatorio:\n\n📅 Mañana a las {{3}}\n🏃 {{2}}\n\nSi no podrás asistir, cancela para liberar tu cupo.\n\nResponde CANCELAR si no podrás ir.',
      },
    ],
    parameters: ['name', 'class', 'time'],
  },

  // Payment reminder D0 (due date)
  recordatorio_pago_d0: {
    name: 'recordatorio_pago_d0',
    language: 'es',
    category: 'ACCOUNT_UPDATE',
    description: 'Recordatorio de pago el día del vencimiento',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}}! 👋\n\nTu cuota de ${{2}} vence hoy.\n\nPagá en 1 clic: {{3}}\n\n¿Necesitás ayuda? Responde AYUDA',
      },
    ],
    parameters: ['name', 'amount', 'link'],
  },

  // Payment reminder D3 (3 days overdue)
  recordatorio_pago_d3: {
    name: 'recordatorio_pago_d3',
    language: 'es',
    category: 'ACCOUNT_UPDATE',
    description: 'Recordatorio de pago 3 días vencido',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nTu cuota de ${{2}} tiene 3 días de atraso.\n\nPodemos ayudarte con un plan de pago? Respondé SÍ para coordinar.',
      },
    ],
    parameters: ['name', 'amount'],
  },

  // Payment reminder D7 (7 days overdue)
  recordatorio_pago_d7: {
    name: 'recordatorio_pago_d7',
    language: 'es',
    category: 'ACCOUNT_UPDATE',
    description: 'Recordatorio de pago 7 días vencido',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nTu cuota de ${{2}} lleva 7 días de atraso.\n\nPara mantener tu membresía activa, necesitamos regularizar.\n\nContactanos al {{3}}',
      },
    ],
    parameters: ['name', 'amount', 'phone'],
  },

  // Contextual collection (post-workout)
  cobranza_contextual: {
    name: 'cobranza_contextual',
    language: 'es',
    category: 'MARKETING',
    description: 'Cobranza contextual post-entrenamiento',
    components: [
      {
        type: 'BODY',
        text: '💪 {{1}}, ¡excelente entreno!\n\nTenés pendiente tu cuota de ${{2}}.\n\n¿Querés regularizar ahora? Respondé SÍ y te ayudamos.',
      },
    ],
    parameters: ['name', 'amount'],
  },

  // Waitlist spot available
  cupo_liberado: {
    name: 'cupo_liberado',
    language: 'es',
    category: 'MARKETING',
    description: 'Notificación de cupo liberado en lista de espera',
    components: [
      {
        type: 'BODY',
        text: '🎉 {{1}}, hay un cupo disponible!\n\n📅 {{2}}\n⏰ {{3}}\n\nTenés 15 minutos para confirmar.\n\nResponde SÍ para reservar tu lugar.',
      },
    ],
    parameters: ['name', 'date', 'time'],
  },

  // Satisfaction survey
  encuesta_satisfaccion: {
    name: 'encuesta_satisfaccion',
    language: 'es',
    category: 'MARKETING',
    description: 'Encuesta de satisfacción post-clase',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}}! 👋\n\n¿Cómo estuvo tu clase de {{2}}?\n\nTu opinión nos ayuda a mejorar:\n{{3}}\n\nGracias! 🙏',
      },
    ],
    parameters: ['name', 'class', 'survey_link'],
  },

  // Reactivation D10 (inactive 10 days)
  reactivacion_d10: {
    name: 'reactivacion_d10',
    language: 'es',
    category: 'MARKETING',
    description: 'Mensaje de reactivación 10 días inactivo',
    components: [
      {
        type: 'BODY',
        text: '¡{{1}}, te extrañamos! 💙\n\nHace 10 días que no te vemos.\n\n¿Todo bien? ¿Podemos ayudarte en algo?\n\nResponde y charlamos.',
      },
    ],
    parameters: ['name'],
  },

  // Reactivation D14 (inactive 14 days)
  reactivacion_d14: {
    name: 'reactivacion_d14',
    language: 'es',
    category: 'MARKETING',
    description: 'Mensaje de reactivación 14 días inactivo',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}},\n\nNotamos que hace 2 semanas no entrenas.\n\n¿Querés pausar tu membresía? ¿O te ayudamos a retomar?\n\nEstamos para ayudarte 💪',
      },
    ],
    parameters: ['name'],
  },

  // Instructor replacement notification
  cambio_instructor: {
    name: 'cambio_instructor',
    language: 'es',
    category: 'ACCOUNT_UPDATE',
    description: 'Notificación de cambio de instructor',
    components: [
      {
        type: 'BODY',
        text: 'Hola {{1}}! 👋\n\nTu clase de {{2}} a las {{3}} tendrá un cambio:\n\n👨‍🏫 Instructor: {{4}}\n\nMantené tu reserva. ¡Te esperamos!',
      },
    ],
    parameters: ['name', 'class', 'time', 'new_instructor'],
  },

  // Valley promotion
  promo_valle: {
    name: 'promo_valle',
    language: 'es',
    category: 'MARKETING',
    description: 'Promoción para horarios valle',
    components: [
      {
        type: 'BODY',
        text: '🎁 {{1}}, oferta especial!\n\nEntrená en horarios de mañana (10-16h) y obtené:\n\n✨ {{2}}\n\nVálido hasta {{3}}.\n\n¿Te interesa? Responde SÍ',
      },
    ],
    parameters: ['name', 'benefit', 'expiry'],
  },
};

/**
 * Get template by name
 */
function getTemplate(name) {
  return templates[name] || null;
}

/**
 * Get all template names
 */
function getAllTemplateNames() {
  return Object.keys(templates);
}

/**
 * Validate template parameters
 */
function validateParameters(templateName, params) {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template ${templateName} not found`);
  }

  const required = template.parameters;
  const missing = required.filter(param => !params[param]);

  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }

  return true;
}

/**
 * Build template payload for WhatsApp API
 */
function buildTemplatePayload(templateName, params) {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template ${templateName} not found`);
  }

  validateParameters(templateName, params);

  // Build components with parameters
  const components = template.components.map(component => {
    if (component.type === 'BODY') {
      return {
        type: 'body',
        parameters: template.parameters.map(param => ({
          type: 'text',
          text: String(params[param]),
        })),
      };
    }
    return component;
  });

  return {
    name: template.name,
    language: { code: template.language },
    components,
  };
}

/**
 * Get template preview text
 */
function getTemplatePreview(templateName, params) {
  const template = templates[templateName];
  if (!template) {
    return null;
  }

  let text = template.components.find(c => c.type === 'BODY').text;

  // Replace placeholders
  template.parameters.forEach((param, index) => {
    const placeholder = `{{${index + 1}}}`;
    text = text.replace(placeholder, params[param] || `[${param}]`);
  });

  return text;
}

module.exports = {
  templates,
  getTemplate,
  getAllTemplateNames,
  validateParameters,
  buildTemplatePayload,
  getTemplatePreview,
};
