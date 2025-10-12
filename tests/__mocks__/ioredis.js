/**
 * Mock para ioredis
 * Usado para tests unitarios
 */

// Mock data para los tests
const mockCache = new Map();

// Mock para Redis client
class MockRedisClient {
  constructor() {
    this.eventHandlers = {};
    this.mockSetErrorMode = false;
    this.mockGetErrorMode = false;
    this.mockDelErrorMode = false;
    this.mockHsetErrorMode = false;
    this.mockHgetErrorMode = false;
    this.mockHgetallErrorMode = false;

    // Para RateLimiterRedis compatibility
    this.client = this;

    // Simular la conexión con Redis de forma síncrona para evitar issues en tests
    this.connectCalled = false;
    if (this.eventHandlers.connect) {
      // Marcar que la conexión fue llamada sin ejecutar callbacks async
      this.connectCalled = true;
    }
  }

  // Método para simular la conexión manual en tests
  connect() {
    if (this.eventHandlers.connect && this.connectCalled) {
      this.eventHandlers.connect();
    }
  }

  // Método para limpiar callbacks y evitar logging después de tests
  cleanup() {
    this.eventHandlers = {};
    this.connectCalled = false;
  }

  on(event, handler) {
    this.eventHandlers[event] = handler;
    return this;
  }

  // Método para establecer un valor en la caché con TTL
  async setex(key, ttl, value) {
    if (this.mockSetErrorMode) {
      throw new Error('Mock Redis setex error');
    }
    
    mockCache.set(key, {
      value,
      ttl,
      timestamp: Date.now()
    });
    
    return 'OK';
  }

  // Método para establecer un valor en la caché
  async set(key, value, operation, ttl) {
    if (this.mockSetErrorMode) {
      throw new Error('Mock Redis set error');
    }
    
    mockCache.set(key, {
      value,
      ttl: ttl || 0,
      timestamp: Date.now()
    });
    
    return 'OK';
  }

  // Método para obtener un valor de la caché
  async get(key) {
    if (this.mockGetErrorMode) {
      throw new Error('Mock Redis get error');
    }
    
    const entry = mockCache.get(key);
    if (!entry) {
      return null;
    }
    
    // Si el TTL ha expirado, eliminamos la entrada
    if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl * 1000) {
      mockCache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  // Método para eliminar una clave
  async del(key) {
    if (this.mockDelErrorMode) {
      throw new Error('Mock Redis del error');
    }
    
    if (Array.isArray(key)) {
      let count = 0;
      for (const k of key) {
        if (mockCache.delete(k)) {
          count++;
        }
      }
      return count;
    } else {
      return mockCache.delete(key) ? 1 : 0;
    }
  }

  // Método para establecer un campo hash
  async hset(key, field, value) {
    if (this.mockHsetErrorMode) {
      throw new Error('Mock Redis hset error');
    }
    
    let hash = mockCache.get(key);
    if (!hash) {
      hash = { value: {}, ttl: 0, timestamp: Date.now() };
      mockCache.set(key, hash);
    }
    
    hash.value[field] = value;
    return 1;
  }

  // Método para obtener un campo hash
  async hget(key, field) {
    if (this.mockHgetErrorMode) {
      throw new Error('Mock Redis hget error');
    }
    
    const hash = mockCache.get(key);
    if (!hash) {
      return null;
    }
    
    return hash.value[field] || null;
  }

  // Método para obtener todos los campos de un hash
  async hgetall(key) {
    if (this.mockHgetallErrorMode) {
      throw new Error('Mock Redis hgetall error');
    }
    
    const hash = mockCache.get(key);
    if (!hash) {
      return {};
    }
    
    return hash.value || {};
  }

  // Método para establecer múltiples campos de un hash
  async hmset(key, fields) {
    let hash = mockCache.get(key);
    if (!hash) {
      hash = { value: {}, ttl: 0, timestamp: Date.now() };
      mockCache.set(key, hash);
    }
    
    for (let i = 0; i < fields.length; i += 2) {
      const field = fields[i];
      const value = fields[i + 1];
      hash.value[field] = value;
    }
    
    return 'OK';
  }

  // Método para eliminar un campo de un hash
  async hdel(key, fields) {
    const hash = mockCache.get(key);
    if (!hash) {
      return 0;
    }
    
    let count = 0;
    if (Array.isArray(fields)) {
      for (const field of fields) {
        if (hash.value[field] !== undefined) {
          delete hash.value[field];
          count++;
        }
      }
    } else {
      if (hash.value[fields] !== undefined) {
        delete hash.value[fields];
        count = 1;
      }
    }
    
    return count;
  }

  // Método para establecer la expiración de una clave
  async expire(key, seconds) {
    const entry = mockCache.get(key);
    if (!entry) {
      return 0;
    }
    
    entry.ttl = seconds;
    entry.timestamp = Date.now();
    return 1;
  }

  // Método para obtener información del servidor
  async info(section = 'memory') {
    return `# Memory
used_memory:1024000
used_memory_human:1000K
used_memory_rss:2048000
used_memory_peak:3072000
maxmemory:0
maxmemory_human:0
`;
  }

  // Método para buscar claves por patrón
  async keys(pattern) {
    const allKeys = Array.from(mockCache.keys());
    if (pattern === '*') return allKeys;
    
    // Convertir el patrón de Redis a regex
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return allKeys.filter(key => regex.test(key));
  }

  // Método para comprobar si una clave existe
  async exists(key) {
    return mockCache.has(key) ? 1 : 0;
  }

  // Método para limpiar todos los datos (útil entre tests)
  async flushall() {
    mockCache.clear();
    return 'OK';
  }

  // Método para verificar si un hash tiene un campo
  async hexists(key, field) {
    const hash = mockCache.get(key);
    if (!hash) {
      return 0;
    }
    
    return hash.value[field] !== undefined ? 1 : 0;
  }

  // ========================================================================
  // RATE LIMITING METHODS
  // ========================================================================

  // Incrementar el valor de una clave (para contadores de rate limiting)
  async incr(key) {
    const entry = mockCache.get(key);
    if (!entry) {
      mockCache.set(key, { value: '1', ttl: 0, timestamp: Date.now() });
      return 1;
    }
    
    const currentValue = parseInt(entry.value) || 0;
    const newValue = currentValue + 1;
    entry.value = String(newValue);
    return newValue;
  }

  // Incrementar por un valor específico
  async incrby(key, increment) {
    const entry = mockCache.get(key);
    if (!entry) {
      mockCache.set(key, { value: String(increment), ttl: 0, timestamp: Date.now() });
      return increment;
    }
    
    const currentValue = parseInt(entry.value) || 0;
    const newValue = currentValue + increment;
    entry.value = String(newValue);
    return newValue;
  }

  // Decrementar el valor de una clave
  async decr(key) {
    const entry = mockCache.get(key);
    if (!entry) {
      mockCache.set(key, { value: '-1', ttl: 0, timestamp: Date.now() });
      return -1;
    }
    
    const currentValue = parseInt(entry.value) || 0;
    const newValue = currentValue - 1;
    entry.value = String(newValue);
    return newValue;
  }

  // Obtener el TTL de una clave en segundos
  async ttl(key) {
    const entry = mockCache.get(key);
    if (!entry) {
      return -2; // Key does not exist
    }
    
    if (entry.ttl === 0) {
      return -1; // Key exists but has no expiration
    }
    
    const elapsed = Math.floor((Date.now() - entry.timestamp) / 1000);
    const remaining = entry.ttl - elapsed;
    
    return remaining > 0 ? remaining : -2;
  }

  // Obtener el TTL en milisegundos
  async pttl(key) {
    const entry = mockCache.get(key);
    if (!entry) {
      return -2;
    }
    
    if (entry.ttl === 0) {
      return -1;
    }
    
    const elapsed = Date.now() - entry.timestamp;
    const remaining = (entry.ttl * 1000) - elapsed;
    
    return remaining > 0 ? remaining : -2;
  }

  // Establecer una clave solo si no existe
  async setnx(key, value) {
    if (mockCache.has(key)) {
      return 0;
    }
    
    mockCache.set(key, { value, ttl: 0, timestamp: Date.now() });
    return 1;
  }

  // Método para evaluar scripts Lua (usado por rate-limiter-flexible)
  async eval(script, numKeys, ...args) {
    // Simulamos un script de rate limiting básico
    // En producción, esto sería ejecutado por Redis
    const key = args[0];
    const limit = parseInt(args[1]) || 10;
    const window = parseInt(args[2]) || 60;
    
    const entry = mockCache.get(key);
    const now = Date.now();
    
    if (!entry) {
      // Primera petición
      mockCache.set(key, { value: '1', ttl: window, timestamp: now });
      return [0, limit - 1, window]; // [blocked (0=no), remaining, reset time]
    }
    
    // Verificar si la ventana ha expirado
    if (entry.ttl > 0 && now - entry.timestamp > entry.ttl * 1000) {
      // Ventana expirada, resetear
      entry.value = '1';
      entry.timestamp = now;
      return [0, limit - 1, window];
    }
    
    const currentCount = parseInt(entry.value) || 0;
    
    if (currentCount >= limit) {
      // Límite excedido
      const remaining = Math.ceil((entry.timestamp + entry.ttl * 1000 - now) / 1000);
      return [1, 0, remaining]; // [blocked (1=yes), remaining (0), reset time]
    }
    
    // Incrementar contador
    entry.value = String(currentCount + 1);
    return [0, limit - currentCount - 1, window];
  }

  // ========================================================================
  // CONNECTION METHODS (for compatibility with different Redis clients)
  // ========================================================================

  // Connect method (async, auto-resolves)
  async connect() {
    console.log('[MOCK Redis] Connect called (no-op in mock)');
    return Promise.resolve();
  }

  // Quit/disconnect
  async quit() {
    console.log('[MOCK Redis] Quit called');
    this.cleanup();
    return 'OK';
  }

  async disconnect() {
    console.log('[MOCK Redis] Disconnect called');
    this.cleanup();
    return 'OK';
  }

  // Flush database methods
  async flushdb() {
    console.log('[MOCK Redis] flushdb called');
    mockCache.clear();
    return 'OK';
  }

  async flushDb() {
    // Alias for compatibility
    return this.flushdb();
  }

  async FLUSHDB() {
    // Uppercase alias
    return this.flushdb();
  }

  // Create client static method (for redis package compatibility)
  static createClient(options) {
    console.log('[MOCK Redis] createClient called with options:', options);
    return new MockRedisClient();
  }
}

// Exportamos el constructor Mock Redis
module.exports = MockRedisClient;