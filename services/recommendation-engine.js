// PROMPT 23: ADVANCED AI FEATURES - RECOMMENDATION ENGINE
// Hybrid recommendation system (collaborative + content-based filtering)

const logger = require('../utils/logger').createLogger('recommendation-engine');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const { getGeminiService } = require('./gemini-service');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================
// RECOMMENDATION ENGINE
// ============================================

class RecommendationEngine {
  /**
   * Get personalized class recommendations
   */
  async getRecommendations(memberId, options = {}) {
    const {
      limit = 3,
      includeNovelty = true,
      useAI = true
    } = options;

    try {
      const memberProfile = await this.getMemberProfile(memberId);
      const availableClasses = await this.getAvailableClasses();

      // Collaborative filtering score
      const collaborativeScores = await this.collaborativeFiltering(memberProfile, availableClasses);

      // Content-based filtering score
      const contentScores = this.contentBasedFiltering(memberProfile, availableClasses);

      // Combine scores (hybrid approach)
      const hybridScores = availableClasses.map(classItem => {
        const collabScore = collaborativeScores.find(s => s.class_id === classItem.id)?.score || 0;
        const contentScore = contentScores.find(s => s.class_id === classItem.id)?.score || 0;
        
        // Weighted combination: 60% collaborative, 40% content-based
        const hybridScore = (collabScore * 0.6) + (contentScore * 0.4);

        return {
          ...classItem,
          score: hybridScore,
          collab_score: collabScore,
          content_score: contentScore
        };
      });

      // Sort by score and apply novelty boost
      let recommendations = hybridScores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit * 2);  // Get more for diversity

      if (includeNovelty) {
        recommendations = this.applyNoveltyBoost(recommendations, memberProfile);
      }

      recommendations = recommendations.slice(0, limit);

      // Get AI-enhanced recommendations if enabled
      if (useAI && recommendations.length > 0) {
        try {
          const aiRecommendations = await this.enhanceWithAI(memberProfile, recommendations);
          recommendations = this.mergeAIRecommendations(recommendations, aiRecommendations);
        } catch (error) {
          logger.error('AI enhancement failed, using base recommendations', { error });
        }
      }

      logger.info('Recommendations generated', {
        memberId,
        count: recommendations.length
      });

      return recommendations;
    } catch (error) {
      logger.error('Failed to generate recommendations', { memberId, error });
      throw error;
    }
  }

  /**
   * Collaborative filtering: "Users like you also enjoyed..."
   */
  async collaborativeFiltering(memberProfile, availableClasses) {
    const { data: similarMembers } = await supabase.rpc('find_similar_members', {
      p_member_id: memberProfile.id,
      p_limit: 20
    });

    if (!similarMembers || similarMembers.length === 0) {
      return availableClasses.map(c => ({ class_id: c.id, score: 50 }));
    }

    // Count class attendance by similar members
    const classPopularity = {};

    for (const similar of similarMembers) {
      const { data: checkins } = await supabase
        .from('checkins')
        .select('clase_id')
        .eq('miembro_id', similar.similar_member_id)
        .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

      checkins?.forEach(checkin => {
        classPopularity[checkin.clase_id] = (classPopularity[checkin.clase_id] || 0) + 1;
      });
    }

    // Normalize scores to 0-100
    const maxCount = Math.max(...Object.values(classPopularity), 1);

    return availableClasses.map(classItem => ({
      class_id: classItem.id,
      score: ((classPopularity[classItem.id] || 0) / maxCount) * 100
    }));
  }

  /**
   * Content-based filtering: Based on member's preferences
   */
  contentBasedFiltering(memberProfile, availableClasses) {
    const preferences = memberProfile.preferences;

    return availableClasses.map(classItem => {
      let score = 50; // Base score

      // Preferred class type
      if (preferences.favorite_class_types?.includes(classItem.tipo)) {
        score += 30;
      }

      // Preferred time slot
      const classHour = new Date(classItem.fecha_hora).getHours();
      if (preferences.favorite_time_slots?.includes(classHour)) {
        score += 20;
      }

      // Preferred instructor
      if (preferences.favorite_instructors?.includes(classItem.instructor_id)) {
        score += 15;
      }

      // Capacity check (prefer classes with availability)
      const availableSpots = classItem.capacidad_maxima - (classItem.reservas || 0);
      if (availableSpots > 5) {
        score += 10;
      } else if (availableSpots <= 2) {
        score -= 20; // Penalize nearly full classes
      }

      return {
        class_id: classItem.id,
        score: Math.min(Math.max(score, 0), 100)
      };
    });
  }

  /**
   * Apply novelty boost to introduce variety
   */
  applyNoveltyBoost(recommendations, memberProfile) {
    const attendedTypes = new Set(memberProfile.attendance_history.map(a => a.class_type));

    return recommendations.map(rec => {
      // Boost score for new class types
      if (!attendedTypes.has(rec.tipo)) {
        rec.score += 15;
        rec.novelty_boost = true;
      }

      return rec;
    });
  }

  /**
   * Enhance recommendations with AI insights
   */
  async enhanceWithAI(memberProfile, recommendations) {
    const gemini = getGeminiService();

    const attendanceHistory = {
      member_id: memberProfile.id,
      recent_classes: memberProfile.attendance_history.slice(0, 20),
      preferences: memberProfile.preferences
    };

    const availableClasses = recommendations.map(r => ({
      id: r.id,
      name: r.nombre,
      type: r.tipo,
      instructor: r.instructor_nombre,
      time: r.fecha_hora,
      current_score: r.score
    }));

    try {
      const aiResponse = await gemini.recommendClasses(attendanceHistory, availableClasses);
      return aiResponse.recommendations || [];
    } catch (error) {
      logger.error('AI enhancement failed', { error });
      return [];
    }
  }

  /**
   * Merge AI recommendations with base recommendations
   */
  mergeAIRecommendations(baseRecs, aiRecs) {
    return baseRecs.map(base => {
      const aiRec = aiRecs.find(ai => ai.class_name === base.nombre);
      
      if (aiRec) {
        return {
          ...base,
          ai_reason: aiRec.reason,
          ai_confidence: aiRec.confidence,
          score: (base.score * 0.6) + (aiRec.confidence * 0.4) // Blend scores
        };
      }

      return base;
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Get member profile with preferences
   */
  async getMemberProfile(memberId) {
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (!member) {
      throw new AppError('Member not found', ErrorTypes.NOT_FOUND, 404, { memberId });
    }

    // Get attendance history
    const { data: checkins } = await supabase
      .from('checkins')
      .select(`
        id,
        created_at,
        clases (
          id,
          tipo,
          instructor_id,
          fecha_hora
        )
      `)
      .eq('miembro_id', memberId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Extract preferences from history
    const preferences = this.extractPreferences(checkins || []);

    return {
      id: member.id,
      nombre: member.nombre,
      attendance_history: checkins?.map(c => ({
        date: c.created_at,
        class_type: c.clases?.tipo,
        class_time: c.clases?.fecha_hora,
        instructor_id: c.clases?.instructor_id
      })) || [],
      preferences
    };
  }

  /**
   * Extract preferences from attendance history
   */
  extractPreferences(checkins) {
    const classTypes = {};
    const timeSlots = {};
    const instructors = {};

    checkins.forEach(checkin => {
      const classType = checkin.clases?.tipo;
      const classTime = checkin.clases?.fecha_hora;
      const instructorId = checkin.clases?.instructor_id;

      if (classType) {
        classTypes[classType] = (classTypes[classType] || 0) + 1;
      }

      if (classTime) {
        const hour = new Date(classTime).getHours();
        timeSlots[hour] = (timeSlots[hour] || 0) + 1;
      }

      if (instructorId) {
        instructors[instructorId] = (instructors[instructorId] || 0) + 1;
      }
    });

    return {
      favorite_class_types: Object.entries(classTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type),
      favorite_time_slots: Object.entries(timeSlots)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([hour]) => parseInt(hour)),
      favorite_instructors: Object.entries(instructors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([id]) => id)
    };
  }

  /**
   * Get available classes (next 7 days)
   */
  async getAvailableClasses() {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: classes } = await supabase
      .from('clases')
      .select(`
        *,
        instructors (
          id,
          nombre
        )
      `)
      .gte('fecha_hora', now.toISOString())
      .lte('fecha_hora', sevenDaysLater.toISOString())
      .eq('activa', true)
      .order('fecha_hora', { ascending: true });

    // Get current reservations
    for (const classItem of classes || []) {
      const { count } = await supabase
        .from('reservas')
        .select('*', { count: 'exact', head: true })
        .eq('clase_id', classItem.id)
        .eq('estado', 'confirmada');

      classItem.reservas = count || 0;
      classItem.instructor_nombre = classItem.instructors?.nombre || 'Sin asignar';
    }

    return classes || [];
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = new RecommendationEngine();
