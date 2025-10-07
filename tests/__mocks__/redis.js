/**
 * Mock para redis
 * Usado para tests unitarios
 */

// Mock cache para almacenamiento en memoria durante tests
const mockCache = new Map();

// Cliente mock de Redis
class MockRedisClient {
  constructor() {
    this.connected = false;
    this.mockError = false;
    this.eventHandlers = {};
  }

  // Simular conexión
  async connect() {
    this.connected = true;
    if (this.mockError) {
      throw new Error('Redis connection error (mock)');
    }
    if (this.eventHandlers['connect']) {
      this.eventHandlers['connect']();
    }
    return this;
  }
  
  // Registrar manejadores de eventos
  on(event, handler) {
    this.eventHandlers[event] = handler;
    return this;
  }
  
  // Simular error
  setMockError(error) {
    this.mockError = error;
    if (error && this.eventHandlers['error']) {
      this.eventHandlers['error'](new Error('Redis error (mock)'));
    }
  }
  
  // Métodos de caché
  async get(key) {
    if (this.mockError) throw new Error('Redis GET error (mock)');
    
    const item = mockCache.get(key);
    if (!item) return null;
    
    // Verificar expiración
    if (item.expiresAt && item.expiresAt < Date.now()) {
      mockCache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  async set(key, value, options = {}) {
    if (this.mockError) throw new Error('Redis SET error (mock)');
    
    let expiresAt = null;
    if (options.EX) {
      expiresAt = Date.now() + (options.EX * 1000);
    }
    
    mockCache.set(key, { value, expiresAt });
    return 'OK';
  }
  
  async setEx(key, ttl, value) {
    if (this.mockError) throw new Error('Redis SET error (mock)');
    
    const expiresAt = Date.now() + (ttl * 1000);
    mockCache.set(key, { value, expiresAt });
    return 'OK';
  }
  
  async keys(pattern) {
    if (this.mockError) throw new Error('Redis KEYS error (mock)');
    
    const patternRegex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...mockCache.keys()].filter(key => patternRegex.test(key));
  }
  
  async del(key) {
    if (this.mockError) throw new Error('Redis DEL error (mock)');
    
    if (Array.isArray(key)) {
      let count = 0;
      for (const k of key) {
        if (mockCache.delete(k)) count++;
      }
      return count;
    }
    
    return mockCache.delete(key) ? 1 : 0;
  }
  
  async scan(cursor, options = {}) {
    if (this.mockError) throw new Error('Redis SCAN error (mock)');
    
    const pattern = options.MATCH || '*';
    const patternRegex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    
    const keys = [...mockCache.keys()].filter(key => patternRegex.test(key));
    
    // Simular cursor para paginación
    const batchSize = 10;
    const start = cursor === 0 ? 0 : cursor;
    const end = start + batchSize;
    const batch = keys.slice(start, end);
    const nextCursor = end < keys.length ? end : 0;
    
    return [nextCursor.toString(), batch];
  }
  
  async quit() {
    this.connected = false;
    mockCache.clear();
    return 'OK';
  }
}

// Factory function para crear cliente
function createClient() {
  return new MockRedisClient();
}

// Exportar el módulo mock
module.exports = {
  createClient,
  MockRedisClient
};