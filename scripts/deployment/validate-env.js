/**
 * VALIDATE ENVIRONMENT VARIABLES FOR PRODUCTION DEPLOYMENT
 * 
 * Este script valida que todas las variables de entorno necesarias
 * estén configuradas correctamente antes del deployment.
 * 
 * Uso: node scripts/deployment/validate-env.js
 */

const fs = require('fs');
const path = require('path');

// Colores para terminal
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Función para imprimir con color
function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

// Definición de variables requeridas y opcionales
const requiredVars = {
    'NODE_ENV': {
        description: 'Entorno de ejecución',
        validator: (val) => val === 'production',
        errorMsg: 'Debe ser "production"'
    },
    'SUPABASE_URL': {
        description: 'URL del proyecto Supabase',
        validator: (val) => val.startsWith('https://') && val.includes('supabase.co'),
        errorMsg: 'Debe ser una URL válida de Supabase'
    },
    'SUPABASE_SERVICE_KEY': {
        description: 'Service Role Key de Supabase',
        validator: (val) => val.startsWith('eyJ') && val.length > 100,
        errorMsg: 'Debe ser un JWT válido de Supabase'
    },
    'WHATSAPP_PHONE_NUMBER_ID': {
        description: 'Phone Number ID de WhatsApp Business',
        validator: (val) => /^\d+$/.test(val),
        errorMsg: 'Debe ser numérico'
    },
    'WHATSAPP_ACCESS_TOKEN': {
        description: 'Access Token de WhatsApp',
        validator: (val) => val.startsWith('EAA') && val.length > 50,
        errorMsg: 'Debe ser un token válido de Meta'
    },
    'WHATSAPP_WEBHOOK_VERIFY_TOKEN': {
        description: 'Token de verificación del webhook',
        validator: (val) => val.length >= 20,
        errorMsg: 'Debe tener al menos 20 caracteres'
    },
    'GEMINI_API_KEY': {
        description: 'API Key de Google Gemini',
        validator: (val) => val.startsWith('AIzaSy') && val.length > 30,
        errorMsg: 'Debe ser una API key válida de Google'
    },
    'JWT_SECRET': {
        description: 'Secret para JWT',
        validator: (val) => val.length >= 32,
        errorMsg: 'Debe tener al menos 32 caracteres'
    }
};

const optionalVars = {
    'PORT': {
        description: 'Puerto del servidor',
        default: '3000'
    },
    'LOG_LEVEL': {
        description: 'Nivel de logs',
        default: 'info'
    },
    'REDIS_URL': {
        description: 'URL de Redis',
        default: 'Railway lo provee automáticamente'
    },
    'SENTRY_DSN': {
        description: 'DSN de Sentry para error tracking',
        default: 'No configurado'
    },
    'N8N_WEBHOOK_URL': {
        description: 'URL de n8n',
        default: 'No configurado'
    }
};

// Función principal de validación
async function validateEnvironment() {
    log('\n═══════════════════════════════════════════════════════', colors.cyan);
    log('  VALIDACIÓN DE VARIABLES DE ENTORNO - GIM_AI', colors.cyan);
    log('═══════════════════════════════════════════════════════\n', colors.cyan);

    // Cargar archivo .env.production si existe
    const envProductionPath = path.join(__dirname, '../../.env.production');
    const envExamplePath = path.join(__dirname, '../../.env.production.example');

    if (!fs.existsSync(envProductionPath)) {
        log('❌ ERROR: Archivo .env.production no encontrado\n', colors.red);
        log('Para crear tu .env.production:', colors.yellow);
        log('1. Copia .env.production.example a .env.production', colors.yellow);
        log('2. Completa todas las variables con valores reales\n', colors.yellow);
        log(`   cp ${envExamplePath} ${envProductionPath}`, colors.cyan);
        log('   nano .env.production\n', colors.cyan);
        process.exit(1);
    }

    // Cargar variables
    require('dotenv').config({ path: envProductionPath });

    let errors = 0;
    let warnings = 0;
    let success = 0;

    // Validar variables requeridas
    log('📋 VARIABLES REQUERIDAS\n', colors.blue);

    for (const [key, config] of Object.entries(requiredVars)) {
        const value = process.env[key];
        
        if (!value) {
            log(`  ❌ ${key}`, colors.red);
            log(`     ${config.description}`, colors.reset);
            log(`     ERROR: Variable no definida\n`, colors.red);
            errors++;
        } else if (!config.validator(value)) {
            log(`  ❌ ${key}`, colors.red);
            log(`     ${config.description}`, colors.reset);
            log(`     ERROR: ${config.errorMsg}`, colors.red);
            log(`     Valor actual: ${value.substring(0, 20)}...\n`, colors.yellow);
            errors++;
        } else {
            log(`  ✅ ${key}`, colors.green);
            log(`     ${config.description}`, colors.reset);
            log(`     Valor: ${value.substring(0, 30)}...\n`, colors.cyan);
            success++;
        }
    }

    // Validar variables opcionales
    log('\n📦 VARIABLES OPCIONALES\n', colors.blue);

    for (const [key, config] of Object.entries(optionalVars)) {
        const value = process.env[key];
        
        if (!value) {
            log(`  ⚠️  ${key}`, colors.yellow);
            log(`     ${config.description}`, colors.reset);
            log(`     Usando default: ${config.default}\n`, colors.yellow);
            warnings++;
        } else {
            log(`  ✅ ${key}`, colors.green);
            log(`     ${config.description}`, colors.reset);
            log(`     Valor: ${value.substring(0, 30)}...\n`, colors.cyan);
            success++;
        }
    }

    // Tests de conexión adicionales
    log('\n🔗 TESTS DE CONEXIÓN\n', colors.blue);

    // Test Supabase
    try {
        log('  🔄 Testing Supabase connection...', colors.cyan);
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        
        // Test simple query
        const { data, error } = await supabase.from('members').select('count').limit(1);
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = table not found (ok si no hay datos)
            throw error;
        }
        
        log('  ✅ Supabase: Conectado\n', colors.green);
        success++;
    } catch (error) {
        log('  ❌ Supabase: Error de conexión', colors.red);
        log(`     ${error.message}\n`, colors.red);
        errors++;
    }

    // Test Redis (si está configurado)
    if (process.env.REDIS_URL) {
        try {
            log('  🔄 Testing Redis connection...', colors.cyan);
            const redis = require('redis');
            const client = redis.createClient({ url: process.env.REDIS_URL });
            
            await client.connect();
            await client.ping();
            await client.quit();
            
            log('  ✅ Redis: Conectado\n', colors.green);
            success++;
        } catch (error) {
            log('  ❌ Redis: Error de conexión', colors.red);
            log(`     ${error.message}\n`, colors.red);
            errors++;
        }
    }

    // Resumen final
    log('\n═══════════════════════════════════════════════════════', colors.cyan);
    log('  RESUMEN DE VALIDACIÓN', colors.cyan);
    log('═══════════════════════════════════════════════════════\n', colors.cyan);

    log(`  ✅ Exitosos:  ${success}`, colors.green);
    log(`  ⚠️  Warnings:  ${warnings}`, colors.yellow);
    log(`  ❌ Errores:   ${errors}`, colors.red);
    log('');

    if (errors > 0) {
        log('❌ VALIDACIÓN FALLIDA', colors.red);
        log('Corrige los errores antes de hacer deployment.\n', colors.yellow);
        process.exit(1);
    } else if (warnings > 0) {
        log('⚠️  VALIDACIÓN CON WARNINGS', colors.yellow);
        log('Puedes continuar, pero considera configurar variables opcionales.\n', colors.cyan);
        process.exit(0);
    } else {
        log('✅ VALIDACIÓN EXITOSA', colors.green);
        log('Tu configuración está lista para deployment.\n', colors.cyan);
        
        log('Próximos pasos:', colors.blue);
        log('1. Ejecuta: git push origin main', colors.cyan);
        log('2. Deploy en Railway: railway up', colors.cyan);
        log('3. Verifica health: curl https://your-app.railway.app/health\n', colors.cyan);
        
        process.exit(0);
    }
}

// Ejecutar validación
validateEnvironment().catch((error) => {
    log(`\n❌ ERROR INESPERADO: ${error.message}\n`, colors.red);
    console.error(error);
    process.exit(1);
});
