/**
 * Mock para @google/generative-ai
 * Usado para tests unitarios
 */

// Constantes para mocks
const MOCK_TEXT_RESPONSE = "Este es un texto generado por Gemini AI (simulado)";
const MOCK_CHURN_RESPONSE = {
  likelihood: 0.65,
  reasons: ["Asistencia irregular", "No ha renovado membresía"],
  recommendations: ["Enviar mensaje personalizado", "Ofrecer descuento en renovación"]
};
const MOCK_CLASS_RECOMMENDATIONS = [
  {
    className: "Yoga",
    score: 0.85,
    reason: "Basado en historial de asistencia"
  },
  {
    className: "Pilates",
    score: 0.75,
    reason: "Complementa las clases anteriores"
  }
];
const MOCK_COACHING_INSIGHTS = {
  strengths: ["Constancia en cardio", "Progresión de peso en fuerza"],
  weaknesses: ["Falta de estiramiento", "Desbalance entre grupos musculares"],
  recommendations: ["Añadir 10 minutos de estiramiento", "Incluir día de piernas"]
};
const MOCK_SENTIMENT = {
  score: 0.75,
  label: "positivo",
  explanation: "El mensaje contiene palabras positivas y satisfacción"
};
const MOCK_NUTRITION_TIPS = [
  "Consume proteínas dentro de los 30 minutos después de entrenar",
  "Mantén la hidratación antes, durante y después del ejercicio",
  "Incluye carbohidratos complejos para energía sostenida"
];

// Mock para GenerationConfig
class MockGenerationConfig {
  constructor(config) {
    this.temperature = config?.temperature || 0.7;
    this.topK = config?.topK || 40;
    this.topP = config?.topP || 0.95;
    this.maxOutputTokens = config?.maxOutputTokens || 1024;
  }
}

// Mock para los límites de contexto
class MockCountTokensResult {
  constructor(prompt) {
    this.totalTokens = prompt ? prompt.length / 4 : 0;
    this.truncated = false;
  }
}

// Mock para Content
class MockContent {
  constructor(parts) {
    this.parts = parts || [];
  }
  
  static text(text) {
    return new MockContent([{ text }]);
  }
}

// Mock para GenerativeModel
class MockGenerativeModel {
  constructor(modelName, options = {}) {
    this.modelName = modelName;
    this.options = options;
    this.shouldFail = false;
    this.responseType = options.responseType || "default";
  }
  
  // Simular error
  setShouldFail(fail) {
    this.shouldFail = fail;
  }
  
  // Simular tipo de respuesta
  setResponseType(type) {
    this.responseType = type;
  }
  
  // Método para generar contenido
  async generateContent(prompt) {
    if (this.shouldFail) {
      throw new Error("Gemini API error (mock)");
    }
    
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 50));
    
    let response;
    
    switch(this.responseType) {
      case "churn":
        response = JSON.stringify(MOCK_CHURN_RESPONSE);
        break;
      case "classes":
        response = JSON.stringify(MOCK_CLASS_RECOMMENDATIONS);
        break;
      case "coaching":
        response = JSON.stringify(MOCK_COACHING_INSIGHTS);
        break;
      case "sentiment":
        response = JSON.stringify(MOCK_SENTIMENT);
        break;
      case "nutrition":
        response = JSON.stringify(MOCK_NUTRITION_TIPS);
        break;
      default:
        response = MOCK_TEXT_RESPONSE;
    }
    
    // El método generateContent del servicio espera la respuesta en este formato
    return {
      response: {
        text: () => response,
        candidates: [
          {
            content: {
              parts: [
                { text: response }
              ]
            },
            finishReason: "STOP",
            safetyRatings: []
          }
        ],
        usageMetadata: {
          promptTokenCount: 50,
          candidatesTokenCount: 200,
          totalTokenCount: 250
        }
      }
    };
  }
  
  // Contar tokens
  async countTokens(prompt) {
    return new MockCountTokensResult(prompt);
  }
  
  // Configuraciones
  withGenerationConfig(config) {
    this.generationConfig = new MockGenerationConfig(config);
    return this;
  }
  
  withSafetySettings(settings) {
    this.safetySettings = settings;
    return this;
  }
}

// Mock para GoogleGenerativeAI
class MockGoogleGenerativeAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.shouldFailInit = false;
  }
  
  setShouldFailInit(fail) {
    this.shouldFailInit = fail;
  }
  
  getGenerativeModel(modelOptions) {
    if (this.shouldFailInit) {
      throw new Error("Failed to initialize Gemini model (mock)");
    }
    
    // Asegurar que siempre tenemos un modelo, incluso si no se proporciona
    const model = modelOptions && modelOptions.model ? modelOptions.model : 'gemini-pro';
    return new MockGenerativeModel(model, modelOptions || {});
  }
}

// Exportar el mock
module.exports = {
  GoogleGenerativeAI: MockGoogleGenerativeAI,
  Content: MockContent,
  GenerationConfig: MockGenerationConfig,
  
  // Utilidades para testing
  MOCK_TEXT_RESPONSE,
  MOCK_CHURN_RESPONSE,
  MOCK_CLASS_RECOMMENDATIONS,
  MOCK_COACHING_INSIGHTS,
  MOCK_SENTIMENT,
  MOCK_NUTRITION_TIPS
};