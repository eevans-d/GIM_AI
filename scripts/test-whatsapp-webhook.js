#!/usr/bin/env node
/**
 * Script de testing para WhatsApp Webhook
 * Valida configuración y simula eventos de WhatsApp
 * 
 * Uso: node scripts/test-whatsapp-webhook.js [--live]
 */

const axios = require('axios');
const crypto = require('crypto');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}═══ ${msg} ═══${colors.reset}\n`)
};

// Configuración
const isLive = process.argv.includes('--live');
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const WEBHOOK_PATH = '/whatsapp/webhook';
const WEBHOOK_URL = `${BASE_URL}${WEBHOOK_PATH}`;
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'gim_ai_webhook_2025';
const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET;

let passed = 0;
let failed = 0;

/**
 * Generar firma HMAC-SHA256
 */
function generateSignature(payload) {
  if (!WEBHOOK_SECRET) {
    log.warning('WHATSAPP_WEBHOOK_SECRET no configurado, firma omitida');
    return null;
  }
  
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256=${signature}`;
}

/**
 * Test 1: Verificación del webhook (GET)
 */
async function testWebhookVerification() {
  log.section('Test 1: Verificación de Webhook (GET)');
  
  const challenge = 'TEST_CHALLENGE_' + Date.now();
  const params = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': VERIFY_TOKEN,
    'hub.challenge': challenge
  });
  
  try {
    log.info(`Testing: ${WEBHOOK_URL}?${params}`);
    
    const response = await axios.get(`${WEBHOOK_URL}?${params}`, {
      timeout: 5000,
      validateStatus: null
    });
    
    if (response.status === 200 && response.data === challenge) {
      log.success('Webhook verificado correctamente');
      log.info(`Challenge recibido: ${response.data}`);
      passed++;
      return true;
    } else {
      log.error(`Respuesta incorrecta: ${response.status} - ${response.data}`);
      failed++;
      return false;
    }
  } catch (error) {
    log.error(`Error en verificación: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      log.warning('Servidor no accesible. ¿Está corriendo la aplicación?');
    }
    failed++;
    return false;
  }
}

/**
 * Test 2: Verificación con token incorrecto (debe fallar)
 */
async function testWebhookVerificationInvalidToken() {
  log.section('Test 2: Token Inválido (debe rechazar)');
  
  const params = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': 'WRONG_TOKEN',
    'hub.challenge': 'TEST_CHALLENGE'
  });
  
  try {
    const response = await axios.get(`${WEBHOOK_URL}?${params}`, {
      timeout: 5000,
      validateStatus: null
    });
    
    if (response.status === 403) {
      log.success('Token inválido rechazado correctamente (403)');
      passed++;
      return true;
    } else {
      log.error(`Debería rechazar con 403, recibió: ${response.status}`);
      failed++;
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    failed++;
    return false;
  }
}

/**
 * Test 3: Mensaje entrante simple
 */
async function testIncomingMessage() {
  log.section('Test 3: Mensaje Entrante (POST)');
  
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'TEST_BUSINESS_ACCOUNT_ID',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: 'TEST_PHONE_ID'
          },
          contacts: [{
            profile: { name: 'Juan Test' },
            wa_id: '5491112345678'
          }],
          messages: [{
            from: '5491112345678',
            id: 'wamid.TEST_' + Date.now(),
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: { body: 'Hola, esto es un mensaje de prueba' },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Agregar firma si está en modo live
  if (isLive && WEBHOOK_SECRET) {
    headers['X-Hub-Signature-256'] = generateSignature(payload);
    log.info('Firma incluida en request');
  }
  
  try {
    log.info(`Enviando mensaje a: ${WEBHOOK_URL}`);
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers,
      timeout: 10000,
      validateStatus: null
    });
    
    if (response.status === 200) {
      log.success('Mensaje procesado correctamente');
      passed++;
      return true;
    } else {
      log.error(`Respuesta inesperada: ${response.status}`);
      log.info(`Body: ${JSON.stringify(response.data)}`);
      failed++;
      return false;
    }
  } catch (error) {
    log.error(`Error procesando mensaje: ${error.message}`);
    failed++;
    return false;
  }
}

/**
 * Test 4: Actualización de estado de mensaje
 */
async function testMessageStatus() {
  log.section('Test 4: Actualización de Estado');
  
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'TEST_BUSINESS_ACCOUNT_ID',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: 'TEST_PHONE_ID'
          },
          statuses: [{
            id: 'wamid.TEST_STATUS_' + Date.now(),
            status: 'delivered',
            timestamp: Math.floor(Date.now() / 1000).toString(),
            recipient_id: '5491112345678'
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (isLive && WEBHOOK_SECRET) {
    headers['X-Hub-Signature-256'] = generateSignature(payload);
  }
  
  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers,
      timeout: 10000,
      validateStatus: null
    });
    
    if (response.status === 200) {
      log.success('Estado de mensaje procesado');
      passed++;
      return true;
    } else {
      log.error(`Respuesta inesperada: ${response.status}`);
      failed++;
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    failed++;
    return false;
  }
}

/**
 * Test 5: Mensaje interactivo (botón)
 */
async function testInteractiveMessage() {
  log.section('Test 5: Mensaje Interactivo (Botón)');
  
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'TEST_BUSINESS_ACCOUNT_ID',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: 'TEST_PHONE_ID'
          },
          contacts: [{
            profile: { name: 'Juan Test' },
            wa_id: '5491112345678'
          }],
          messages: [{
            from: '5491112345678',
            id: 'wamid.TEST_INTERACTIVE_' + Date.now(),
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'interactive',
            interactive: {
              type: 'button_reply',
              button_reply: {
                id: 'confirm_attendance',
                title: 'Confirmar'
              }
            }
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (isLive && WEBHOOK_SECRET) {
    headers['X-Hub-Signature-256'] = generateSignature(payload);
  }
  
  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers,
      timeout: 10000,
      validateStatus: null
    });
    
    if (response.status === 200) {
      log.success('Botón interactivo procesado');
      passed++;
      return true;
    } else {
      log.error(`Respuesta inesperada: ${response.status}`);
      failed++;
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    failed++;
    return false;
  }
}

/**
 * Test 6: Payload vacío (debe aceptar)
 */
async function testEmptyPayload() {
  log.section('Test 6: Payload Vacío (heartbeat)');
  
  const payload = {
    object: 'whatsapp_business_account',
    entry: []
  };
  
  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
      validateStatus: null
    });
    
    if (response.status === 200) {
      log.success('Heartbeat aceptado');
      passed++;
      return true;
    } else {
      log.error(`Respuesta inesperada: ${response.status}`);
      failed++;
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    failed++;
    return false;
  }
}

/**
 * Test 7: Firma inválida (solo en modo live)
 */
async function testInvalidSignature() {
  if (!isLive || !WEBHOOK_SECRET) {
    log.warning('Test de firma omitido (modo local o sin secret)');
    return;
  }
  
  log.section('Test 7: Firma Inválida (debe rechazar)');
  
  const payload = {
    object: 'whatsapp_business_account',
    entry: []
  };
  
  try {
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=INVALID_SIGNATURE'
      },
      timeout: 5000,
      validateStatus: null
    });
    
    if (response.status === 403) {
      log.success('Firma inválida rechazada correctamente');
      passed++;
      return true;
    } else {
      log.error(`Debería rechazar con 403, recibió: ${response.status}`);
      failed++;
      return false;
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    failed++;
    return false;
  }
}

/**
 * Validar configuración
 */
function validateConfig() {
  log.section('Validación de Configuración');
  
  if (!VERIFY_TOKEN) {
    log.error('WHATSAPP_WEBHOOK_VERIFY_TOKEN no configurado');
    return false;
  }
  log.success(`VERIFY_TOKEN: ${VERIFY_TOKEN}`);
  
  if (isLive && !WEBHOOK_SECRET) {
    log.warning('WHATSAPP_WEBHOOK_SECRET no configurado (modo live)');
  } else if (WEBHOOK_SECRET) {
    log.success(`WEBHOOK_SECRET configurado (${WEBHOOK_SECRET.length} chars)`);
  }
  
  log.info(`Base URL: ${BASE_URL}`);
  log.info(`Webhook URL: ${WEBHOOK_URL}`);
  log.info(`Modo: ${isLive ? 'LIVE (con firma)' : 'LOCAL (sin firma)'}`);
  
  return true;
}

/**
 * Función principal
 */
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║      WhatsApp Webhook - Testing Suite                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  log.info(`Fecha: ${new Date().toLocaleString('es-AR')}`);
  
  // Validar configuración
  if (!validateConfig()) {
    log.error('Configuración inválida. Abortando tests.');
    process.exit(1);
  }
  
  // Ejecutar tests
  await testWebhookVerification();
  await testWebhookVerificationInvalidToken();
  await testIncomingMessage();
  await testMessageStatus();
  await testInteractiveMessage();
  await testEmptyPayload();
  
  if (isLive) {
    await testInvalidSignature();
  }
  
  // Resumen
  console.log(`\n${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}RESUMEN DE TESTS${colors.reset}\n`);
  
  console.log(`${colors.green}✅ Pasados:   ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Fallidos:  ${failed}${colors.reset}`);
  
  const total = passed + failed;
  const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  
  console.log(`\n${colors.bold}Tasa de éxito: ${percentage}%${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}${colors.bold}✅ WEBHOOK FUNCIONANDO CORRECTAMENTE${colors.reset}`);
    console.log(`${colors.green}El webhook está listo para recibir eventos de WhatsApp.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}❌ ALGUNOS TESTS FALLARON${colors.reset}`);
    console.log(`${colors.red}Revisa la configuración y los logs del servidor.${colors.reset}\n`);
    process.exit(1);
  }
}

// Ejecutar tests
main().catch(error => {
  log.error(`Error fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});
