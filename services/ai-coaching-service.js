// PROMPT 23: ADVANCED AI FEATURES - AI COACHING SERVICE
// Personalized coaching insights and progress analysis

const logger = require('../utils/logger').createLogger('ai-coaching');
const { getGeminiService } = require('./gemini-service');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class AICoachingService {
  /**
   * Generate personalized coaching insights
   */
  async generateInsights(memberId) {
    try {
      const progressData = await this.getProgressData(memberId);
      const gemini = getGeminiService();
      
      const insights = await gemini.generateCoachingInsights({
        member_id: memberId,
        weekly_checkins: progressData.weekly_checkins,
        class_distribution: progressData.class_distribution,
        consistency_score: progressData.consistency_score,
        progress_trend: progressData.progress_trend
      });

      logger.info('Coaching insights generated', { memberId });

      return {
        insights: insights.insights || [],
        improvements: insights.improvements || [],
        motivation: insights.motivation || 'Sigue adelante!',
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to generate coaching insights', { memberId, error });
      throw error;
    }
  }

  /**
   * Get nutrition tips based on workout type
   */
  async getNutritionTips(memberId, workoutType = null) {
    try {
      const memberData = await this.getMemberWorkoutPattern(memberId);
      const workout = workoutType || memberData.primary_workout_type;
      const goals = memberData.fitness_goals || 'bienestar general';

      const gemini = getGeminiService();
      const tips = await gemini.generateNutritionTips(workout, goals);

      logger.info('Nutrition tips generated', { memberId, workoutType: workout });

      return tips;
    } catch (error) {
      logger.error('Failed to generate nutrition tips', { memberId, error });
      throw error;
    }
  }

  /**
   * Detect training plateau
   */
  async detectPlateau(memberId) {
    const progressData = await this.getProgressData(memberId);
    
    // Check if last 4 weeks show stagnation
    const recentWeeks = progressData.weekly_checkins.slice(0, 4);
    const avgCheckins = recentWeeks.reduce((sum, w) => sum + w.count, 0) / 4;
    const variance = recentWeeks.reduce((sum, w) => sum + Math.pow(w.count - avgCheckins, 2), 0) / 4;

    const isPlateau = variance < 1 && avgCheckins < 3;

    if (isPlateau) {
      logger.info('Training plateau detected', { memberId, avgCheckins });
      
      return {
        detected: true,
        weeks_duration: 4,
        avg_weekly_attendance: avgCheckins,
        recommendation: 'Considera variar tu rutina con nuevas clases'
      };
    }

    return { detected: false };
  }

  /**
   * Get member progress data
   */
  async getProgressData(memberId) {
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

    const { data: checkins } = await supabase
      .from('checkins')
      .select('id, created_at, clases(tipo)')
      .eq('miembro_id', memberId)
      .gte('created_at', fourWeeksAgo.toISOString())
      .order('created_at', { ascending: false });

    // Group by week
    const weeklyCheckins = this.groupByWeek(checkins || []);
    
    // Class distribution
    const classTypes = {};
    checkins?.forEach(c => {
      const type = c.clases?.tipo || 'unknown';
      classTypes[type] = (classTypes[type] || 0) + 1;
    });

    // Consistency score (0-100)
    const consistency = this.calculateConsistency(weeklyCheckins);

    // Trend (improving/stable/declining)
    const trend = this.calculateTrend(weeklyCheckins);

    return {
      weekly_checkins: weeklyCheckins,
      class_distribution: classTypes,
      consistency_score: consistency,
      progress_trend: trend,
      total_checkins: checkins?.length || 0
    };
  }

  /**
   * Get member workout pattern
   */
  async getMemberWorkoutPattern(memberId) {
    const { data: checkins } = await supabase
      .from('checkins')
      .select('clases(tipo)')
      .eq('miembro_id', memberId)
      .order('created_at', { ascending: false })
      .limit(50);

    const workoutTypes = {};
    checkins?.forEach(c => {
      const type = c.clases?.tipo;
      if (type) workoutTypes[type] = (workoutTypes[type] || 0) + 1;
    });

    const primaryType = Object.entries(workoutTypes)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'cardio';

    return {
      primary_workout_type: primaryType,
      fitness_goals: 'bienestar general'  // TODO: Add member goals table
    };
  }

  groupByWeek(checkins) {
    const weeks = [{},{},{},{}];  // Last 4 weeks
    const now = Date.now();

    checkins.forEach(c => {
      const age = (now - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const weekIndex = Math.floor(age / 7);
      
      if (weekIndex < 4) {
        weeks[weekIndex][c.id] = true;
      }
    });

    return weeks.map((week, i) => ({
      week: 4 - i,
      count: Object.keys(week).length
    })).reverse();
  }

  calculateConsistency(weeklyCheckins) {
    if (weeklyCheckins.length === 0) return 0;
    
    const target = 3;  // 3 sessions per week
    const avgDeviation = weeklyCheckins.reduce((sum, w) => 
      sum + Math.abs(w.count - target), 0) / weeklyCheckins.length;
    
    return Math.max(0, 100 - (avgDeviation * 20));
  }

  calculateTrend(weeklyCheckins) {
    if (weeklyCheckins.length < 2) return 'stable';
    
    const first = weeklyCheckins[0].count;
    const last = weeklyCheckins[weeklyCheckins.length - 1].count;
    const diff = last - first;

    if (diff >= 2) return 'improving';
    if (diff <= -2) return 'declining';
    return 'stable';
  }
}

module.exports = new AICoachingService();
