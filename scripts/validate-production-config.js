#!/usr/bin/env node
/**
 * Script de validación de configuración de producción
 * Verifica que todas las credenciales y servicios externos funcionen correctamente
 * 
 * Uso: NODE_ENV=production node scripts/validate-production-config.js
 */

require('dotenv').config({ path: '.env.production' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

// Contadores de validaciones
let passed = 0;
let failed = 0;
let warnings = 0;

/**
 * Valida que una variable de entorno exista
 */
function validateEnvVar(name, required = true) {
  const value = process.env[name];
  
  if (!value || value.includes('YOUR_')) {
    if (required) {
      log.error(`Variable ${name} no configurada o contiene placeholder`);
      failed++;
      return false;
    } else {
      log.warning(`Variable ${name} no configurada (opcional)`);
      warnings++;
      return null;
    }
  }
  
  log.success(`${name} configurada`);
  passed++;
  return true;
}

/**
 * Valida conexión con Supabase
 */
async function validateSupabase() {
  log.section('Validando Supabase');
  
  const urlValid = validateEnvVar('SUPABASE_URL');
  const keyValid = validateEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!urlValid || !keyValid) {
    log.error('No se puede validar Supabase sin credenciales');
    return;
  }
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test query simple
    const { data, error } = await supabase
      .from('members')
      .select('count')
      .limit(1);
    
    if (error) {
      log.error(`Error conectando a Supabase: ${error.message}`);
      failed++;
      return;
    }
    
    log.success('Conexión a Supabase exitosa');
    log.info(`Base de datos accesible`);
    passed++;
    
  } catch (error) {
    log.error(`Error validando Supabase: ${error.message}`);
    failed++;
  }
}

/**
 * Valida configuración de WhatsApp Business API
 */
async function validateWhatsApp() {
  log.section('Validando WhatsApp Business API');
  
  const tokenValid = validateEnvVar('WHATSAPP_ACCESS_TOKEN');
  const phoneIdValid = validateEnvVar('WHATSAPP_PHONE_NUMBER_ID');
  
  if (!tokenValid || !phoneIdValid) {
    log.error('No se puede validar WhatsApp sin credenciales');
    return;
  }
  
  try {
    const response = await axios.get(
      `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
        },
        timeout: 10000
      }
    );
    
    log.success('Conexión a WhatsApp API exitosa');
    log.info(`Número verificado: ${response.data.display_phone_number || 'N/A'}`);
    passed++;
    
  } catch (error) {
    if (error.response) {
      log.error(`WhatsApp API error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
    } else {
      log.error(`Error validando WhatsApp: ${error.message}`);
    }
    failed++;
  }
}

/**
 * Valida Google Gemini AI
 */
async function validateGemini() {
  log.section('Validando Google Gemini AI');
  
  const apiKeyValid = validateEnvVar('GEMINI_API_KEY');
  
  if (!apiKeyValid) {
    log.error('No se puede validar Gemini sin API key');
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    
    // Test simple de generación
    const result = await model.generateContent('Responde solo: OK');
    const response = await result.response;
    const text = response.text();
    
    log.success('Conexión a Gemini AI exitosa');
    log.info(`Modelo: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}`);
    log.info(`Respuesta test: ${text.substring(0, 50)}`);
    passed++;
    
  } catch (error) {
    log.error(`Error validando Gemini: ${error.message}`);
    failed++;
  }
}

/**
 * Valida conexión a Redis
 */
async function validateRedis() {
  log.section('Validando Redis');
  
  const urlValid = validateEnvVar('REDIS_URL', false);
  
  if (!urlValid) {
    log.warning('Redis no configurado (opcional para desarrollo)');
    return;
  }
  
  try {
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000
    });
    
    await redis.ping();
    
    log.success('Conexión a Redis exitosa');
    passed++;
    
    redis.disconnect();
    
  } catch (error) {
    log.error(`Error validando Redis: ${error.message}`);
    failed++;
  }
}

/**
 * Valida variables de seguridad
 */
function validateSecurity() {
  log.section('Validando Seguridad');
  
  validateEnvVar('JWT_SECRET');
  validateEnvVar('WHATSAPP_WEBHOOK_SECRET');
  
  // Validar que JWT_SECRET tenga longitud adecuada
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    log.error('JWT_SECRET debe tener al menos 32 caracteres');
    failed++;
  } else {
    log.success('JWT_SECRET tiene longitud adecuada');
    passed++;
  }
  
  // Validar NODE_ENV
  if (process.env.NODE_ENV !== 'production') {
    log.warning(`NODE_ENV no está en 'production' (actual: ${process.env.NODE_ENV})`);
    warnings++;
  } else {
    log.success('NODE_ENV configurado correctamente');
    passed++;
  }
}

/**
 * Valida configuración de n8n
 */
function validateN8n() {
  log.section('Validando n8n Workflows');
  
  validateEnvVar('N8N_WEBHOOK_BASE_URL', false);
  validateEnvVar('N8N_WEBHOOK_COLLECTION', false);
  validateEnvVar('N8N_WEBHOOK_REMINDER', false);
  validateEnvVar('N8N_WEBHOOK_SURVEY', false);
}

/**
 * Valida configuración de monitoreo
 */
function validateMonitoring() {
  log.section('Validando Monitoreo');
  
  validateEnvVar('SENTRY_DSN', false);
  validateEnvVar('LOG_LEVEL');
  
  // Validar nivel de log
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (process.env.LOG_LEVEL && !validLogLevels.includes(process.env.LOG_LEVEL)) {
    log.error(`LOG_LEVEL inválido: ${process.env.LOG_LEVEL}`);
    failed++;
  } else {
    log.success(`LOG_LEVEL válido: ${process.env.LOG_LEVEL}`);
    passed++;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   GIM_AI - Validación de Configuración de Producción  ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  log.info(`Fecha: ${new Date().toLocaleString('es-AR')}`);
  log.info(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  
  // Validaciones síncronas
  validateSecurity();
  validateN8n();
  validateMonitoring();
  
  // Variables generales
  log.section('Validando Variables Generales');
  validateEnvVar('APP_NAME');
  validateEnvVar('APP_URL');
  validateEnvVar('PORT');
  
  // Validaciones asíncronas con servicios externos
  await validateSupabase();
  await validateWhatsApp();
  await validateGemini();
  await validateRedis();
  
  // Resumen final
  console.log(`\n${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}RESUMEN DE VALIDACIÓN${colors.reset}\n`);
  
  console.log(`${colors.green}✅ Pasadas:   ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Fallidas:  ${failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings:  ${warnings}${colors.reset}`);
  
  const total = passed + failed;
  const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  
  console.log(`\n${colors.bold}Tasa de éxito: ${percentage}%${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}${colors.bold}✅ CONFIGURACIÓN DE PRODUCCIÓN VÁLIDA${colors.reset}`);
    console.log(`${colors.green}El sistema está listo para deployment.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}❌ CONFIGURACIÓN INCOMPLETA${colors.reset}`);
    console.log(`${colors.red}Por favor, completa las credenciales faltantes en .env.production${colors.reset}\n`);
    process.exit(1);
  }
}

// Ejecutar validación
main().catch(error => {
  log.error(`Error fatal: ${error.message}`);
  console.error(error);
  process.exit(1);
});
