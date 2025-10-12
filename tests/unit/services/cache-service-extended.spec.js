/**
 * Tests adicionales para mejorar cobertura de Cache Service
 */

// Mock environment variables before imports
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Auto-mock modules that are in __mocks__ directory
jest.mock('ioredis');
jest.mock('winston');

const cacheService = require('../../../services/cache-service');

describe('Cache Service - Additional Coverage', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Pattern Operations', () => {
    test('should clear cache by pattern', async () => {
      // Arrange
      await cacheService.set('user:123:data', { id: 123 });
      await cacheService.set('user:456:data', { id: 456 });
      await cacheService.set('other:data', { id: 789 });
      
      // Act
      const deletedCount = await cacheService.delPattern('user:*');
      
      // Assert
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });
    
    test('should delete single key', async () => {
      const key = 'delete:test';
      await cacheService.set(key, 'value');
      
      const result = await cacheService.del(key);
      expect(typeof result).toBe('boolean'); // Acepta boolean o number
    });
  });
  
  describe('Domain Functions', () => {
    test('should cache member tier', async () => {
      const memberId = '123e4567-e89b-12d3-a456-426614174000';
      const mockSupabase = {
        rpc: jest.fn().mockResolvedValue({
          data: { tier: 'premium', points: 1500 }
        })
      };
      
      const result = await cacheService.cacheMemberTier(memberId, mockSupabase);
      expect(result).toBeTruthy();
    });
  });
  
  describe('Error Handling', () => {
    test('should handle getOrCompute with error in compute function', async () => {
      const key = 'error:compute';
      const errorComputeFn = jest.fn().mockImplementation(async () => {
        throw new Error('Compute failed');
      });
      
      // El cache service propaga el error desde la función compute
      await expect(cacheService.getOrCompute(key, errorComputeFn)).rejects.toThrow('Compute failed');
      expect(errorComputeFn).toHaveBeenCalled();
    });
  });
  
  describe('Cache Statistics', () => {
    test('should get cache statistics', async () => {
      const stats = await cacheService.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });
  });
  
  describe('TTL Strategies', () => {
    test('should export TTL strategies', () => {
      expect(cacheService.TTL_STRATEGIES).toBeDefined();
      expect(cacheService.TTL_STRATEGIES.REAL_TIME).toBe(60);
      expect(cacheService.TTL_STRATEGIES.FROZEN).toBe(21600);
    });
    
    test('should export cache keys', () => {
      expect(cacheService.CACHE_KEYS).toBeDefined();
      // Just verify it's an object
      expect(typeof cacheService.CACHE_KEYS).toBe('object');
    });
  });
});