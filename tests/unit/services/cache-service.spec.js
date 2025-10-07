/**
 * Unit Test: Cache Service - FASE 1
 * Tests del servicio de caché Redis
 */

// Mock environment variables before imports
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Auto-mock modules that are in __mocks__ directory
jest.mock('ioredis');
jest.mock('winston');

// Import service to test
const cacheService = require('../../../services/cache-service');
const { AppError } = require('../../../utils/error-handler');

describe('Cache Service Unit Tests', () => {
  
  beforeEach(() => {
    // Clear mocks between tests
    jest.clearAllMocks();
    // Ensure redis client is cleared between tests
    const Redis = require('ioredis');
    const redisClient = new Redis();
    return redisClient.flushall();
  });
  
  describe('Basic Cache Operations', () => {
    test('should set and get a value from cache', async () => {
      const key = 'test:key';
      const value = { name: 'Test Value', id: 123 };
      
      await cacheService.set(key, value);
      const result = await cacheService.get(key);
      
      expect(result).toEqual(value);
    });
    
    test('should return null for non-existent key', async () => {
      const result = await cacheService.get('non:existent:key');
      
      expect(result).toBeNull();
    });
    
    test('should delete a key from cache', async () => {
      // Arrange
      const key = 'test:delete:key';
      const value = 'test-value-for-deletion';
      
      // Act
      await cacheService.set(key, value);
      let valueBeforeDeletion = await cacheService.get(key);
      await cacheService.delete(key);
      let valueAfterDeletion = await cacheService.get(key);
      
      // Assert
      expect(valueBeforeDeletion).toBe(value);
      expect(valueAfterDeletion).toBeNull();
    });
    
    test('should set a value with TTL', async () => {
      const key = 'test:ttl:key';
      const value = 'test-value-with-ttl';
      
      await cacheService.set(key, value, { ttl: 30 });
      const result = await cacheService.get(key);
      
      expect(result).toBe(value);
    });
  });
  
  describe('Domain Cache Methods', () => {
    test('should work with member dashboard caching', async () => {
      // Arrange
      const memberId = '123e4567-e89b-12d3-a456-426614174000';
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: memberId,
            nombre: 'Juan Pérez',
            telefono: '+5491122334455',
            estado: 'activo'
          }
        })
      };
      
      // Act - set the cache
      await cacheService.cacheMemberDashboard(memberId, mockSupabase);
      
      // Use getOrCompute to retrieve data
      const key = `member:${memberId}:dashboard`;
      const computeFn = jest.fn();
      const result = await cacheService.getOrCompute(key, computeFn);
      
      // Assert
      expect(result).toBeTruthy();
      expect(computeFn).not.toHaveBeenCalled(); // Should return cached value
    });
    
    test('should work with class availability caching', async () => {
      // Arrange
      const date = '2025-10-10';
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          data: [
            {
              id: '423e4567-e89b-12d3-a456-426614174003',
              nombre: 'Yoga Matutino',
              capacidad: 20,
              disponible: 15
            }
          ]
        })
      };
      
      // Act
      await cacheService.cacheClassAvailability(date, mockSupabase);
      
      // Use direct key to get data
      const key = `classes:${date}:availability`;
      const result = await cacheService.get(key);
      
      // Assert
      expect(result).toBeTruthy();
    });
    
    test('should work with daily KPI caching', async () => {
      // Arrange
      const date = '2025-10-10';
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          data: {
            checkins: 150,
            new_members: 8,
            revenue: 45000
          }
        })
      };
      
      // Act
      await cacheService.cacheDailyKPIs(date, mockSupabase);
      
      // Use get to retrieve data
      const key = `kpi:${date}`;
      const result = await cacheService.get(key);
      
      // Assert
      expect(result).toBeTruthy();
    });
    
    test('should work with class recommendations caching', async () => {
      // Arrange
      const memberId = '123e4567-e89b-12d3-a456-426614174000';
      const mockSupabase = {
        rpc: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          data: [
            {
              class_id: '423e4567-e89b-12d3-a456-426614174003',
              nombre: 'Yoga Matutino',
              score: 0.85
            }
          ]
        })
      };
      
      // Act
      await cacheService.cacheClassRecommendations(memberId, mockSupabase);
      
      // Use get to retrieve data
      const key = `member:${memberId}:recommendations`;
      const result = await cacheService.get(key);
      
      // Assert
      expect(result).toBeTruthy();
    });
  });
  
  describe('Cache Strategies', () => {
    test('should apply REAL_TIME TTL strategy', async () => {
      // Arrange
      const key = 'test:strategy:realtime';
      const value = 'real-time-value';
      
      // Act
      await cacheService.set(key, value, { strategy: 'REAL_TIME' });
      const result = await cacheService.get(key);
      
      // Assert
      expect(result).toBe(value);
    });
    
    test('should apply FROZEN TTL strategy', async () => {
      // Arrange
      const key = 'test:strategy:frozen';
      const value = 'frozen-value';
      
      // Act
      await cacheService.set(key, value, { strategy: 'FROZEN' });
      const result = await cacheService.get(key);
      
      // Assert
      expect(result).toBe(value);
    });
    
    test('should handle invalid TTL strategy gracefully', async () => {
      // Arrange
      const key = 'test:strategy:invalid';
      const value = 'value-with-invalid-strategy';
      
      // Act
      await cacheService.set(key, value, { strategy: 'INVALID_STRATEGY' });
      const result = await cacheService.get(key);
      
      // Assert - should default to WARM strategy
      expect(result).toBe(value);
    });
  });
  
  describe('Cache Invalidation', () => {
    test('should invalidate member caches', async () => {
      // Arrange
      const memberId = '123e4567-e89b-12d3-a456-426614174000';
      const key = `member:${memberId}:dashboard`;
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
      const key = `class:${classId}:details`;
      await cacheService.set(key, { data: 'test-data' });
      
      // Verify key exists
      const beforeInvalidation = await cacheService.get(key);
      expect(beforeInvalidation).toBeTruthy();
      
      // Act
      await cacheService.invalidateClassCaches(classId);
      
      // Assert
      const afterInvalidation = await cacheService.get(key);
      expect(afterInvalidation).toBeNull();
    });
    
    test('should invalidate KPI caches', async () => {
      // Arrange
      const key = `kpi:2025-10-10`;
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
      expect(stats).toBeDefined();
    });
    
    test('should warm today cache', async () => {
      // Arrange
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          data: [
            {
              id: '423e4567-e89b-12d3-a456-426614174003',
              nombre: 'Yoga Matutino',
              capacidad: 20,
              disponible: 15
            }
          ]
        }),
        rpc: jest.fn().mockReturnThis(),
      };
      
      // Act
      await cacheService.warmTodayCache(mockSupabase);
      
      // Assert - Just check no errors thrown
      expect(true).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle set errors gracefully', async () => {
      // Simulate Redis error
      const Redis = require('ioredis');
      const redisInstance = new Redis();
      redisInstance.mockSetErrorMode = true;
      
      await expect(cacheService.set('error:key', 'value')).rejects.toThrow(AppError);
    });
    
    test('should handle get errors gracefully', async () => {
      // Simulate Redis error
      const Redis = require('ioredis');
      const redisInstance = new Redis();
      redisInstance.mockGetErrorMode = true;
      
      await expect(cacheService.get('error:key')).rejects.toThrow(AppError);
    });
  });
});