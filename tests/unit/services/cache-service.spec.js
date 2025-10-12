/**
 * Cache Service Unit Tests
 */

jest.mock('ioredis');
jest.mock('winston');
jest.mock('@supabase/supabase-js');

// Import service to test
const cacheService = require('../../../services/cache-service');
const { AppError } = require('../../../utils/error-handler');

describe('Cache Service Unit Tests', () => {
  describe('Basic Cache Operations', () => {
    test('should set and get a value from cache', async () => {
      const key = 'test:key';
      const value = 'test-value';
      
      // Act
      await cacheService.set(key, value);
      const result = await cacheService.get(key);
      
      // Assert
      expect(result).toBe(value);
    });
    
    test('should return null for non-existent key', async () => {
      // Act
      const result = await cacheService.get('non-existent-key');
      
      // Assert
      expect(result).toBeNull();
    });
    
    test('should delete a key from cache', async () => {
      const key = 'test:delete';
      const value = 'test-value';
      
      // Set a value first
      await cacheService.set(key, value);
      let valueBeforeDeletion = await cacheService.get(key);
      await cacheService.del(key);
      let valueAfterDeletion = await cacheService.get(key);
      
      // Assert
      expect(valueBeforeDeletion).toBe(value);
      expect(valueAfterDeletion).toBeNull();
    });
    
    test('should set a value with TTL', async () => {
      const key = 'test:ttl';
      const value = 'ttl-value';
      const ttl = 60;
      
      // Act
      await cacheService.set(key, value, ttl);
      const result = await cacheService.get(key);
      
      // Assert
      expect(result).toBe(value);
    });
  });

  describe('Domain Cache Methods', () => {
    test('should work with member dashboard caching', async () => {
      // Arrange
      const memberId = '123e4567-e89b-12d3-a456-426614174000';
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({
          data: {
            member_id: memberId,
            total_checkins: 15,
            monthly_checkins: 8,
            favorite_class: 'Yoga',
            last_checkin: '2025-10-08T10:00:00Z'
          },
          error: null
        })
      };
      
      // Act
      const result = await cacheService.cacheMemberDashboard(memberId, mockSupabase);
      
      // Assert
      expect(result).toBeTruthy();
      expect(result.member_id).toBe(memberId);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_member_dashboard', { p_member_id: memberId });
    });

    test('should work with member tier caching', async () => {
      // Arrange
      const memberId = '123e4567-e89b-12d3-a456-426614174000';
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({
          data: { tier: 'premium', benefits: ['unlimited_classes'] },
          error: null
        })
      };
      
      // Act
      const result = await cacheService.cacheMemberTier(memberId, mockSupabase);
      
      // Assert
      expect(result).toBeTruthy();
      expect(result.tier).toBe('premium');
    });

    test('should work with class availability caching', async () => {
      // Arrange
      const date = '2025-10-08';
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({
          data: [
            {
              class_id: '423e4567-e89b-12d3-a456-426614174003',
              class_name: 'Yoga Matutino',
              available_spots: 5,
              total_capacity: 20
            }
          ],
          error: null
        })
      };
      
      // Act
      const result = await cacheService.cacheClassAvailability(date, mockSupabase);
      
      // Assert
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].class_name).toBe('Yoga Matutino');
    });

    test('should work with daily KPI caching', async () => {
      // Arrange
      const date = '2025-10-08';
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  date: date,
                  total_checkins: 25,
                  unique_members: 20,
                  revenue: 1500
                },
                error: null
              })
            })
          })
        })
      };
      
      // Act
      const result = await cacheService.cacheDailyKPIs(date, mockSupabase);
      
      // Assert
      expect(result).toBeTruthy();
      expect(result.date).toBe(date);
      expect(result.total_checkins).toBe(25);
    });

    test('should work with class recommendations caching', async () => {
      // Arrange
      const memberId = '123e4567-e89b-12d3-a456-426614174000';
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({
          data: [
            {
              class_id: '423e4567-e89b-12d3-a456-426614174003',
              class_name: 'Yoga Matutino',
              recommendation_score: 0.85
            }
          ],
          error: null
        })
      };
      
      // Act
      const result = await cacheService.cacheClassRecommendations(memberId, mockSupabase);
      
      // Assert
      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].class_name).toBe('Yoga Matutino');
    });
  });

  describe('Cache Strategies', () => {
    test('should apply REAL_TIME TTL strategy', async () => {
      // Arrange
      const key = 'test:strategy:realtime';
      const value = 'value-with-realtime-strategy';
      
      // Act
      await cacheService.set(key, value, cacheService.TTL_STRATEGIES.REAL_TIME);
      const result = await cacheService.get(key);
      
      // Assert
      expect(result).toBe(value);
    });
    
    test('should apply FROZEN TTL strategy', async () => {
      // Arrange
      const key = 'test:strategy:frozen';
      const value = 'value-with-frozen-strategy';
      
      // Act
      await cacheService.set(key, value, cacheService.TTL_STRATEGIES.FROZEN);
      const result = await cacheService.get(key);
      
      // Assert
      expect(result).toBe(value);
    });
    
    test('should handle invalid TTL strategy gracefully', async () => {
      // Arrange
      const key = 'test:strategy:invalid';
      const value = 'value-with-invalid-strategy';
      
      // Act
      await cacheService.set(key, value, 9999); // Invalid strategy
      const result = await cacheService.get(key);
      
      // Assert - should work with any numeric TTL
      expect(result).toBe(value);
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate member caches', async () => {
      // Arrange
      const memberId = '123e4567-e89b-12d3-a456-426614174000';
      const key = cacheService.CACHE_KEYS.MEMBER_DASHBOARD(memberId);
      await cacheService.set(key, { data: 'test-data' });
      
      // Verify key exists
      const beforeInvalidation = await cacheService.get(key);
      expect(beforeInvalidation).toBeTruthy();
      
      // Act
      await cacheService.invalidateMemberCaches(memberId);
      
      // Assert
      const afterInvalidation = await cacheService.get(key);
      expect(afterInvalidation).toBeNull();
    });
    
    test('should invalidate class caches', async () => {
      // Arrange
      const classId = '423e4567-e89b-12d3-a456-426614174003';
      const key = `class:availability:2025-10-08`; // Usar una clave que sea afectada por el patrón
      await cacheService.set(key, { data: 'test-data' });
      
      // Verify key exists
      const beforeInvalidation = await cacheService.get(key);
      expect(beforeInvalidation).toBeTruthy();
      
      // Act
      await cacheService.invalidateClassCaches(classId);
      
      // Assert - delPattern debería eliminar las claves con patrón
      const afterInvalidation = await cacheService.get(key);
      expect(afterInvalidation).toBeNull();
    });
    
    test('should invalidate KPI caches', async () => {
      // Arrange  
      const key = `kpis:daily:2025-10-08`; // Usar una clave que sea afectada por el patrón
      await cacheService.set(key, { data: 'test-data' });
      
      // Verify key exists
      const beforeInvalidation = await cacheService.get(key);
      expect(beforeInvalidation).toBeTruthy();
      
      // Act
      await cacheService.invalidateKPICaches();
      
      // Assert
      const afterInvalidation = await cacheService.get(key);
      expect(afterInvalidation).toBeNull();
    });
  });

  describe('Cache Utilities', () => {
    test('should get cache stats', async () => {
      // Act
      const stats = await cacheService.getCacheStats();
      
      // Assert
      expect(stats).toBeTruthy();
      expect(typeof stats).toBe('object');
      expect(stats.hits).toBeDefined();
      expect(stats.misses).toBeDefined();
      expect(stats.hit_rate).toBeDefined();
    });

    test('should warm today cache', async () => {
      // Arrange
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                data: [
                  {
                    id: '423e4567-e89b-12d3-a456-426614174003',
                    nombre: 'Yoga Matutino',
                    capacidad: 20,
                    disponible: 15
                  }
                ],
                error: null
              })
            })
          })
        })
      };
      
      // Act
      await cacheService.warmTodayCache(mockSupabase);
      
      // Assert - Just check no errors thrown
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle set errors gracefully', async () => {
      // Simulate Redis error accessing the redis instance from cacheService
      cacheService.redis.mockSetErrorMode = true;
      
      const result = await cacheService.set('error:key', 'value');
      expect(result).toBe(false);
      
      // Reset error mode
      cacheService.redis.mockSetErrorMode = false;
    });
    
    test('should handle get errors gracefully', async () => {
      // Simulate Redis error
      cacheService.redis.mockGetErrorMode = true;
      
      const result = await cacheService.get('error:key');
      expect(result).toBeNull();
      
      // Reset error mode
      cacheService.redis.mockGetErrorMode = false;
    });
  });
});