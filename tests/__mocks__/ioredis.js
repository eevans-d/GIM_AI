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

    // Simular la conexión con Redis después de un pequeño retraso
    setTimeout(() => {
      if (this.eventHandlers.connect) {
        this.eventHandlers.connect();
      }
    }, 0);
  }

  on(event, handler) {
    this.eventHandlers[event] = handler;
    return this;
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
}

// Exportamos el constructor Mock Redis
module.exports = MockRedisClient;