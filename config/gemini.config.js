// PROMPT 23: ADVANCED AI FEATURES - GEMINI API CONFIGURATION
// Centralized configuration for Google Gemini AI integration

module.exports = {
  // API Configuration
  apiKey: process.env.GEMINI_API_KEY || '',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  
  // Model Configuration
  models: {
    primary: 'gemini-1.5-pro',      // Best for complex reasoning
    fallback: 'gemini-1.5-flash',   // Faster, more economical
    embedding: 'text-embedding-004'  // For vector embeddings
  },
  
  // Rate Limiting
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerDay: 1500,
    burstSize: 10
  },
  
  // Generation Parameters
  generationConfig: {
    temperature: 0.7,        // Creativity level (0-1)
    topK: 40,               // Top-K sampling
    topP: 0.95,             // Nucleus sampling
    maxOutputTokens: 2048,  // Max response length
    candidateCount: 1       // Number of candidates to generate
  },
  
  // Safety Settings
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ],
  
  // Prompt Templates
  prompts: {
    churnPrediction: `Eres un experto en retención de clientes de gimnasios. 
Analiza los siguientes datos del miembro y proporciona:
1. Probabilidad de abandono (0-100)
2. Razones principales
3. Recomendaciones de intervención

Datos del miembro:
{member_data}

Responde en formato JSON con: { "churn_score": number, "reasons": string[], "interventions": string[] }`,

    classRecommendation: `Eres un entrenador personal experto. 
Basándote en el historial de asistencia y preferencias del miembro, recomienda 3 clases que maximicen su engagement.

Historial:
{attendance_history}

Clases disponibles:
{available_classes}

Responde en formato JSON con: { "recommendations": [{ "class_name": string, "reason": string, "confidence": number }] }`,

    coachingInsights: `Eres un coach de fitness experimentado.
Analiza el progreso del miembro en las últimas 4 semanas y proporciona:
1. Insights clave sobre su progreso
2. Áreas de mejora
3. Consejos motivacionales personalizados

Datos de progreso:
{progress_data}

Responde en formato JSON con: { "insights": string[], "improvements": string[], "motivation": string }`,

    sentimentAnalysis: `Analiza el siguiente mensaje de WhatsApp y determina:
1. Sentimiento (positive/neutral/negative)
2. Intención (query/complaint/praise/cancellation)
3. Nivel de urgencia (low/medium/high)
4. Tema principal

Mensaje: "{message}"

Responde en formato JSON con: { "sentiment": string, "sentiment_score": number, "intent": string, "urgency": string, "topic": string }`,

    nutritionTips: `Eres un nutricionista deportivo.
Basándote en el tipo de entrenamiento y objetivos del miembro, proporciona 3 tips de nutrición prácticos y específicos.

Tipo de entrenamiento: {workout_type}
Objetivos: {goals}

Responde en formato JSON con: { "tips": [{ "category": string, "tip": string, "impact": string }] }`
  },
  
  // Cache Configuration
  cache: {
    enabled: true,
    ttl: {
      churnPrediction: 3600,      // 1 hour
      recommendations: 1800,       // 30 minutes
      coachingInsights: 7200,     // 2 hours
      sentimentAnalysis: 300,     // 5 minutes
      nutritionTips: 86400        // 24 hours
    }
  },
  
  // Retry Configuration
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,    // 1 second
    maxDelay: 10000,    // 10 seconds
    backoffMultiplier: 2
  },
  
  // Timeout Configuration
  timeout: {
    default: 30000,     // 30 seconds
    streaming: 60000    // 60 seconds for streaming
  },
  
  // Feature Flags
  features: {
    churnPrediction: true,
    recommendations: true,
    coachingInsights: true,
    sentimentAnalysis: true,
    nutritionTips: true,
    conversationSummary: false  // Future feature
  }
};
