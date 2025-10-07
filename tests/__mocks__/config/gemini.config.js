/**
 * Mock para config/gemini.config.js
 * Usado para tests unitarios
 */

module.exports = {
  apiKey: 'mock-api-key-123456789',
  models: {
    primary: 'gemini-pro',
    fallback: 'gemini-1.0-pro',
  },
  rateLimit: {
    requestsPerMinute: 60,
    tokensPerMinute: 10000
  },
  cache: {
    enabled: true,
    ttl: {
      default: 3600, // 1 hora
      churnPrediction: 86400, // 24 horas
      recommendations: 43200, // 12 horas
      coachingInsights: 86400, // 24 horas
      nutritionTips: 604800 // 7 días
    },
    prefix: 'gemini:'
  },
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    backoffMultiplier: 1.5,
    maxDelay: 10000
  },
  safetySettings: [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
  ],
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024
  },
  prompts: {
    churnPrediction: "Analiza los datos del miembro y predice su probabilidad de abandono: {member_data}",
    classRecommendation: "Basado en el historial de asistencia: {attendance_history} y las clases disponibles: {available_classes}, recomienda clases",
    coachingInsights: "Genera recomendaciones de entrenamiento basadas en estos datos de progreso: {progress_data}",
    sentimentAnalysis: "Analiza el sentimiento del siguiente mensaje: {message}",
    nutritionTips: "Proporciona consejos nutricionales para {workout_type} con los siguientes objetivos: {goals}"
  }
};