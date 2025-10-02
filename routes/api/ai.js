// PROMPT 23: ADVANCED AI FEATURES - AI API ROUTES
// REST endpoints for AI-powered features

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger').createLogger('ai-api');
const churnPrediction = require('../../services/churn-prediction-service');
const recommendationEngine = require('../../services/recommendation-engine');
const aiCoaching = require('../../services/ai-coaching-service');
const conversationAnalyzer = require('../../services/conversation-analyzer');
const { getGeminiService } = require('../../services/gemini-service');

// Predict churn for individual member
router.post('/predict-churn', async (req, res) => {
  try {
    const { member_id } = req.body;
    
    if (!member_id) {
      return res.status(400).json({ error: 'member_id required' });
    }

    const prediction = await churnPrediction.calculateChurnScore(member_id);
    const aiInsights = await churnPrediction.getAIInsights(member_id, prediction);
    
    await churnPrediction.savePrediction(prediction);

    res.json({
      ...prediction,
      ai_insights: aiInsights
    });
  } catch (error) {
    logger.error('Churn prediction failed', { error });
    res.status(500).json({ error: error.message });
  }
});

// Get high-risk churn candidates
router.get('/churn-candidates', async (req, res) => {
  try {
    const { threshold = 70, limit = 50 } = req.query;
    
    const candidates = await churnPrediction.findHighRiskMembers(
      parseInt(threshold),
      parseInt(limit)
    );

    res.json({
      candidates,
      count: candidates.length,
      threshold: parseInt(threshold)
    });
  } catch (error) {
    logger.error('Failed to get churn candidates', { error });
    res.status(500).json({ error: error.message });
  }
});

// Get personalized class recommendations
router.post('/recommend-classes', async (req, res) => {
  try {
    const { member_id, limit = 3, use_ai = true } = req.body;
    
    if (!member_id) {
      return res.status(400).json({ error: 'member_id required' });
    }

    const recommendations = await recommendationEngine.getRecommendations(member_id, {
      limit: parseInt(limit),
      useAI: use_ai === true || use_ai === 'true'
    });

    res.json({
      member_id,
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    logger.error('Recommendations failed', { error });
    res.status(500).json({ error: error.message });
  }
});

// Get AI coaching insights
router.post('/coaching-insights', async (req, res) => {
  try {
    const { member_id } = req.body;
    
    if (!member_id) {
      return res.status(400).json({ error: 'member_id required' });
    }

    const insights = await aiCoaching.generateInsights(member_id);
    const plateau = await aiCoaching.detectPlateau(member_id);

    res.json({
      member_id,
      insights,
      plateau_detection: plateau
    });
  } catch (error) {
    logger.error('Coaching insights failed', { error });
    res.status(500).json({ error: error.message });
  }
});

// Get nutrition tips
router.post('/nutrition-tips', async (req, res) => {
  try {
    const { member_id, workout_type } = req.body;
    
    if (!member_id) {
      return res.status(400).json({ error: 'member_id required' });
    }

    const tips = await aiCoaching.getNutritionTips(member_id, workout_type);

    res.json({
      member_id,
      workout_type,
      tips
    });
  } catch (error) {
    logger.error('Nutrition tips failed', { error });
    res.status(500).json({ error: error.message });
  }
});

// Analyze conversation sentiment
router.post('/analyze-conversation', async (req, res) => {
  try {
    const { message, messages } = req.body;
    
    if (message) {
      // Single message analysis
      const analysis = await conversationAnalyzer.analyzeMessage(message);
      return res.json(analysis);
    }
    
    if (messages && Array.isArray(messages)) {
      // Batch analysis
      const analysis = await conversationAnalyzer.analyzeConversation(messages);
      return res.json(analysis);
    }

    res.status(400).json({ error: 'message or messages array required' });
  } catch (error) {
    logger.error('Conversation analysis failed', { error });
    res.status(500).json({ error: error.message });
  }
});

// Get AI service statistics
router.get('/stats', async (req, res) => {
  try {
    const gemini = getGeminiService();
    const stats = gemini.getStats();

    res.json({
      gemini: stats,
      features: {
        churn_prediction: true,
        recommendations: true,
        coaching: true,
        sentiment_analysis: true
      }
    });
  } catch (error) {
    logger.error('Failed to get AI stats', { error });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
