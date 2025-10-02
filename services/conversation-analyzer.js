// PROMPT 23: ADVANCED AI FEATURES - CONVERSATION ANALYZER
// Sentiment analysis and intent detection for WhatsApp messages

const logger = require('../utils/logger').createLogger('conversation-analyzer');
const { getGeminiService } = require('./gemini-service');

class ConversationAnalyzer {
  /**
   * Analyze message sentiment and intent
   */
  async analyzeMessage(message, context = {}) {
    try {
      const gemini = getGeminiService();
      
      const analysis = await gemini.analyzeSentiment(message, context);

      const result = {
        message,
        sentiment: analysis.sentiment || 'neutral',
        sentiment_score: analysis.sentiment_score || 50,
        intent: analysis.intent || 'query',
        urgency: analysis.urgency || 'low',
        topic: analysis.topic || 'general',
        analyzed_at: new Date().toISOString()
      };

      logger.info('Message analyzed', {
        sentiment: result.sentiment,
        intent: result.intent,
        urgency: result.urgency
      });

      return result;
    } catch (error) {
      logger.error('Failed to analyze message', { error });
      
      // Fallback to basic analysis
      return this.basicAnalysis(message);
    }
  }

  /**
   * Batch analyze multiple messages
   */
  async analyzeConversation(messages) {
    const analyses = [];

    for (const msg of messages) {
      const analysis = await this.analyzeMessage(msg.text, {
        previous_messages: analyses.slice(-3)
      });
      
      analyses.push({
        ...msg,
        analysis
      });
    }

    // Aggregate sentiment
    const avgSentiment = analyses.reduce((sum, a) => 
      sum + a.analysis.sentiment_score, 0) / analyses.length;

    return {
      messages: analyses,
      overall_sentiment: avgSentiment > 60 ? 'positive' : avgSentiment < 40 ? 'negative' : 'neutral',
      overall_sentiment_score: avgSentiment,
      dominant_intent: this.getDominantIntent(analyses),
      requires_attention: analyses.some(a => a.analysis.urgency === 'high')
    };
  }

  /**
   * Basic rule-based analysis (fallback)
   */
  basicAnalysis(message) {
    const lowerMsg = message.toLowerCase();

    // Sentiment keywords
    const positive = ['gracias', 'excelente', 'genial', 'perfecto', 'feliz', 'encantado'];
    const negative = ['mal', 'problema', 'queja', 'cancelar', 'molesto', 'enojado'];

    let score = 50;
    positive.forEach(word => {
      if (lowerMsg.includes(word)) score += 10;
    });
    negative.forEach(word => {
      if (lowerMsg.includes(word)) score -= 15;
    });

    score = Math.max(0, Math.min(100, score));

    // Intent detection
    let intent = 'query';
    if (lowerMsg.includes('cancelar') || lowerMsg.includes('anular')) intent = 'cancellation';
    else if (lowerMsg.includes('queja') || lowerMsg.includes('problema')) intent = 'complaint';
    else if (positive.some(w => lowerMsg.includes(w))) intent = 'praise';

    // Urgency
    const urgentWords = ['urgente', 'inmediato', 'ahora', 'ya'];
    const urgency = urgentWords.some(w => lowerMsg.includes(w)) ? 'high' : 'low';

    return {
      message,
      sentiment: score > 60 ? 'positive' : score < 40 ? 'negative' : 'neutral',
      sentiment_score: score,
      intent,
      urgency,
      topic: 'general',
      analyzed_at: new Date().toISOString()
    };
  }

  getDominantIntent(analyses) {
    const intents = {};
    analyses.forEach(a => {
      const intent = a.analysis.intent;
      intents[intent] = (intents[intent] || 0) + 1;
    });

    return Object.entries(intents)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'query';
  }
}

module.exports = new ConversationAnalyzer();
