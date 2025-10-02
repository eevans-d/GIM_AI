/**
 * PROMPT 18: ARTILLERY PROCESSOR
 * Custom functions para Artillery load tests
 */

const { v4: uuidv4 } = require('uuid');

module.exports = {
    /**
     * Genera un member_id aleatorio
     */
    generateRandomMemberId: function(requestParams, context, ee, next) {
        context.vars.member_id = uuidv4();
        return next();
    },
    
    /**
     * Genera un class_id aleatorio
     */
    generateRandomClassId: function(requestParams, context, ee, next) {
        context.vars.class_id = uuidv4();
        return next();
    },
    
    /**
     * Genera un QR code aleatorio
     */
    generateRandomQRCode: function(requestParams, context, ee, next) {
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        context.vars.qr_code = `GIM-TEST-${random}`;
        return next();
    },
    
    /**
     * Genera rating aleatorio (1-5)
     */
    generateRandomRating: function(requestParams, context, ee, next) {
        context.vars.rating = Math.floor(Math.random() * 5) + 1;
        return next();
    },
    
    /**
     * Genera NPS score aleatorio (0-10)
     */
    generateRandomNPS: function(requestParams, context, ee, next) {
        context.vars.nps_score = Math.floor(Math.random() * 11);
        return next();
    },
    
    /**
     * Log de respuesta exitosa
     */
    logResponse: function(requestParams, response, context, ee, next) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
            console.log(`✅ ${requestParams.url} - ${response.statusCode}`);
        } else {
            console.log(`❌ ${requestParams.url} - ${response.statusCode}`);
        }
        return next();
    },
    
    /**
     * Verifica que la respuesta tenga el campo "success"
     */
    checkSuccess: function(requestParams, response, context, ee, next) {
        if (response.body) {
            const body = JSON.parse(response.body);
            if (!body.success) {
                ee.emit('error', 'Response missing success field');
            }
        }
        return next();
    }
};
