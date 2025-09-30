/**
 * QR Code Generator Service
 * Generates QR codes for member check-ins
 * Part of PROMPT 5: Check-in QR System Implementation
 */

const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const crypto = require('crypto');

const log = logger.createLogger('qr-service');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Generate QR code for a member
 * @param {number} memberId - Member ID
 * @param {object} options - QR generation options
 * @returns {Promise<object>} QR code data
 */
async function generateMemberQR(memberId, options = {}) {
  try {
    // Fetch member data
    const { data: member, error } = await supabase
      .from('members')
      .select('id, nombre, telefono, codigo_qr')
      .eq('id', memberId)
      .single();
    
    if (error || !member) {
      throw new Error(`Member not found: ${memberId}`);
    }
    
    // Generate or use existing QR code
    let qrCode = member.codigo_qr;
    if (!qrCode) {
      qrCode = generateUniqueCode(member.id, member.telefono);
      
      // Update member with QR code
      await supabase
        .from('members')
        .update({ codigo_qr: qrCode })
        .eq('id', memberId);
    }
    
    // Build check-in URL
    const baseUrl = process.env.APP_BASE_URL || 'https://gim-ai.netlify.app';
    const checkInUrl = `${baseUrl}/frontend/qr-checkin/?m=${memberId}&p=${encodeURIComponent(member.telefono)}&s=qr_cliente`;
    
    // Generate QR code image
    const qrOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: options.width || 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };
    
    const qrCodeDataUrl = await QRCode.toDataURL(checkInUrl, qrOptions);
    
    log.info('QR code generated', {
      member_id: memberId,
      qr_code: qrCode
    });
    
    return {
      memberId: member.id,
      memberName: member.nombre,
      qrCode: qrCode,
      qrCodeImage: qrCodeDataUrl,
      checkInUrl: checkInUrl
    };
    
  } catch (error) {
    log.error('Failed to generate QR code', {
      member_id: memberId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Generate generic (kiosk) QR code
 * Generic QR that prompts for phone number entry
 */
async function generateGenericQR(options = {}) {
  try {
    const baseUrl = process.env.APP_BASE_URL || 'https://gim-ai.netlify.app';
    const checkInUrl = `${baseUrl}/frontend/qr-checkin/?s=kiosk`;
    
    const qrOptions = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: options.width || 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };
    
    const qrCodeDataUrl = await QRCode.toDataURL(checkInUrl, qrOptions);
    
    log.info('Generic QR code generated');
    
    return {
      type: 'generic',
      qrCodeImage: qrCodeDataUrl,
      checkInUrl: checkInUrl
    };
    
  } catch (error) {
    log.error('Failed to generate generic QR code', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Generate class-specific QR code
 * For instructor check-in panel
 */
async function generateClassQR(classId, options = {}) {
  try {
    // Fetch class data
    const { data: classData, error } = await supabase
      .from('classes')
      .select('id, nombre, fecha_hora')
      .eq('id', classId)
      .single();
    
    if (error || !classData) {
      throw new Error(`Class not found: ${classId}`);
    }
    
    const baseUrl = process.env.APP_BASE_URL || 'https://gim-ai.netlify.app';
    const checkInUrl = `${baseUrl}/frontend/qr-checkin/?c=${classId}&s=clase`;
    
    const qrOptions = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: options.width || 300,
      color: {
        dark: '#667eea',
        light: '#FFFFFF'
      }
    };
    
    const qrCodeDataUrl = await QRCode.toDataURL(checkInUrl, qrOptions);
    
    log.info('Class QR code generated', {
      class_id: classId,
      class_name: classData.nombre
    });
    
    return {
      classId: classData.id,
      className: classData.nombre,
      classTime: classData.fecha_hora,
      qrCodeImage: qrCodeDataUrl,
      checkInUrl: checkInUrl
    };
    
  } catch (error) {
    log.error('Failed to generate class QR code', {
      class_id: classId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Batch generate QR codes for all active members
 */
async function batchGenerateQRCodes(options = {}) {
  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('id, nombre, telefono, codigo_qr')
      .eq('estado', 'activo')
      .is('codigo_qr', null);
    
    if (error) {
      throw error;
    }
    
    log.info(`Batch generating QR codes for ${members.length} members`);
    
    const results = [];
    for (const member of members) {
      try {
        const qr = await generateMemberQR(member.id, options);
        results.push(qr);
      } catch (error) {
        log.error('Failed to generate QR for member', {
          member_id: member.id,
          error: error.message
        });
      }
    }
    
    log.info(`Batch generation complete: ${results.length}/${members.length} successful`);
    
    return {
      total: members.length,
      successful: results.length,
      failed: members.length - results.length,
      results: results
    };
    
  } catch (error) {
    log.error('Batch QR generation failed', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Generate unique code for member
 * Format: GYM-XXXX-YYYY (16 chars)
 */
function generateUniqueCode(memberId, phone) {
  const hash = crypto
    .createHash('sha256')
    .update(`${memberId}-${phone}-${Date.now()}`)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
  
  return `GYM-${hash.substring(0, 4)}-${hash.substring(4, 8)}`;
}

/**
 * Verify QR code validity
 */
async function verifyQRCode(qrCode) {
  try {
    const { data: member, error } = await supabase
      .from('members')
      .select('id, nombre, estado')
      .eq('codigo_qr', qrCode)
      .single();
    
    if (error || !member) {
      return {
        valid: false,
        error: 'QR code not found'
      };
    }
    
    if (member.estado !== 'activo') {
      return {
        valid: false,
        error: 'Member not active',
        member: member
      };
    }
    
    return {
      valid: true,
      member: member
    };
    
  } catch (error) {
    log.error('QR verification failed', {
      qr_code: qrCode,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  generateMemberQR,
  generateGenericQR,
  generateClassQR,
  batchGenerateQRCodes,
  verifyQRCode
};
