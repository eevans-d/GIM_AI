// PROMPT 22: FRONTEND & MOBILE PWA - OFFLINE HANDLER
// IndexedDB-based offline data synchronization with conflict resolution

const logger = require('../../utils/logger').createLogger('offline-handler');
const { AppError, ErrorTypes } = require('../../utils/error-handler');

// ============================================
// INDEXEDDB CONFIGURATION
// ============================================

const DB_NAME = 'GIM_AI_Offline';
const DB_VERSION = 2;

const STORES = {
  PENDING_CHECKINS: 'pending_checkins',
  PENDING_RESERVATIONS: 'pending_reservations',
  CACHED_CLASSES: 'cached_classes',
  CACHED_MEMBERS: 'cached_members',
  SYNC_QUEUE: 'sync_queue',
  CONFLICT_LOG: 'conflict_log'
};

// ============================================
// OFFLINE DATA MANAGER
// ============================================

class OfflineDataManager {
  constructor() {
    this.db = null;
    this.syncInProgress = false;
    this.listeners = [];
  }

  /**
   * Initialize IndexedDB
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB', { error: request.error });
        reject(new AppError(
          'Failed to initialize offline storage',
          ErrorTypes.DATABASE_ERROR,
          500,
          { originalError: request.error }
        ));
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Pending check-ins
        if (!db.objectStoreNames.contains(STORES.PENDING_CHECKINS)) {
          const store = db.createObjectStore(STORES.PENDING_CHECKINS, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('member_id', 'member_id', { unique: false });
        }

        // Pending reservations
        if (!db.objectStoreNames.contains(STORES.PENDING_RESERVATIONS)) {
          const store = db.createObjectStore(STORES.PENDING_RESERVATIONS, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('class_id', 'class_id', { unique: false });
        }

        // Cached classes
        if (!db.objectStoreNames.contains(STORES.CACHED_CLASSES)) {
          const store = db.createObjectStore(STORES.CACHED_CLASSES, {
            keyPath: 'id'
          });
          store.createIndex('fecha_hora', 'fecha_hora', { unique: false });
        }

        // Cached members
        if (!db.objectStoreNames.contains(STORES.CACHED_MEMBERS)) {
          db.createObjectStore(STORES.CACHED_MEMBERS, {
            keyPath: 'id'
          });
        }

        // Sync queue
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const store = db.createObjectStore(STORES.SYNC_QUEUE, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Conflict log
        if (!db.objectStoreNames.contains(STORES.CONFLICT_LOG)) {
          const store = db.createObjectStore(STORES.CONFLICT_LOG, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        logger.info('IndexedDB schema created', { version: DB_VERSION });
      };
    });
  }

  /**
   * Add pending check-in
   */
  async addPendingCheckin(checkinData) {
    if (!this.db) await this.initialize();

    const transaction = this.db.transaction([STORES.PENDING_CHECKINS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_CHECKINS);

    const data = {
      ...checkinData,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const request = store.add(data);

      request.onsuccess = () => {
        logger.info('Pending check-in added', { id: request.result });
        this.notifyListeners('checkin-added', data);
        resolve(request.result);
      };

      request.onerror = () => {
        logger.error('Failed to add pending check-in', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Get all pending check-ins
   */
  async getPendingCheckins() {
    if (!this.db) await this.initialize();

    const transaction = this.db.transaction([STORES.PENDING_CHECKINS], 'readonly');
    const store = transaction.objectStore(STORES.PENDING_CHECKINS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        logger.info('Retrieved pending check-ins', { count: request.result.length });
        resolve(request.result);
      };

      request.onerror = () => {
        logger.error('Failed to get pending check-ins', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Remove pending check-in after sync
   */
  async removePendingCheckin(id) {
    if (!this.db) await this.initialize();

    const transaction = this.db.transaction([STORES.PENDING_CHECKINS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_CHECKINS);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => {
        logger.info('Pending check-in removed', { id });
        this.notifyListeners('checkin-synced', { id });
        resolve();
      };

      request.onerror = () => {
        logger.error('Failed to remove pending check-in', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Cache class data for offline access
   */
  async cacheClasses(classes) {
    if (!this.db) await this.initialize();

    const transaction = this.db.transaction([STORES.CACHED_CLASSES], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_CLASSES);

    return new Promise((resolve, reject) => {
      // Clear existing cache
      store.clear();

      // Add new classes
      classes.forEach((classData) => {
        store.add({ ...classData, cachedAt: Date.now() });
      });

      transaction.oncomplete = () => {
        logger.info('Classes cached successfully', { count: classes.length });
        resolve(classes.length);
      };

      transaction.onerror = () => {
        logger.error('Failed to cache classes', { error: transaction.error });
        reject(transaction.error);
      };
    });
  }

  /**
   * Get cached classes
   */
  async getCachedClasses() {
    if (!this.db) await this.initialize();

    const transaction = this.db.transaction([STORES.CACHED_CLASSES], 'readonly');
    const store = transaction.objectStore(STORES.CACHED_CLASSES);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        logger.info('Retrieved cached classes', { count: request.result.length });
        resolve(request.result);
      };

      request.onerror = () => {
        logger.error('Failed to get cached classes', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(action, data, priority = 1) {
    if (!this.db) await this.initialize();

    const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    const queueItem = {
      action,
      data,
      priority,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3
    };

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem);

      request.onsuccess = () => {
        logger.info('Item added to sync queue', { id: request.result, action });
        resolve(request.result);
      };

      request.onerror = () => {
        logger.error('Failed to add to sync queue', { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Process sync queue
   */
  async processSyncQueue() {
    if (this.syncInProgress) {
      logger.info('Sync already in progress, skipping');
      return;
    }

    this.syncInProgress = true;

    try {
      if (!this.db) await this.initialize();

      const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const index = store.index('priority');

      const queueItems = await new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // High priority first
        const items = [];

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            items.push(cursor.value);
            cursor.continue();
          } else {
            resolve(items);
          }
        };

        request.onerror = () => reject(request.error);
      });

      logger.info('Processing sync queue', { items: queueItems.length });

      for (const item of queueItems) {
        try {
          await this.syncItem(item);
          await this.removeSyncQueueItem(item.id);
        } catch (error) {
          logger.error('Failed to sync item', { id: item.id, error });
          await this.incrementSyncAttempt(item);
        }
      }

      logger.info('Sync queue processed successfully');
    } catch (error) {
      logger.error('Failed to process sync queue', { error });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync individual item
   */
  async syncItem(item) {
    const { action, data } = item;

    switch (action) {
      case 'checkin':
        return this.syncCheckin(data);
      case 'reservation':
        return this.syncReservation(data);
      case 'cancellation':
        return this.syncCancellation(data);
      default:
        throw new Error(`Unknown sync action: ${action}`);
    }
  }

  /**
   * Sync check-in to server
   */
  async syncCheckin(data) {
    const response = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    logger.info('Check-in synced successfully', { member_id: data.member_id });
    return response.json();
  }

  /**
   * Sync reservation to server
   */
  async syncReservation(data) {
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    logger.info('Reservation synced successfully', { class_id: data.class_id });
    return response.json();
  }

  /**
   * Sync cancellation to server
   */
  async syncCancellation(data) {
    const response = await fetch(`/api/reservations/${data.reservation_id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    logger.info('Cancellation synced successfully', { reservation_id: data.reservation_id });
    return response.json();
  }

  /**
   * Remove item from sync queue
   */
  async removeSyncQueueItem(id) {
    const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Increment sync attempt counter
   */
  async incrementSyncAttempt(item) {
    const transaction = this.db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    item.attempts++;

    if (item.attempts >= item.maxAttempts) {
      // Move to conflict log
      await this.logConflict(item, 'Max attempts reached');
      await this.removeSyncQueueItem(item.id);
    } else {
      store.put(item);
    }
  }

  /**
   * Log conflict for manual resolution
   */
  async logConflict(item, reason) {
    const transaction = this.db.transaction([STORES.CONFLICT_LOG], 'readwrite');
    const store = transaction.objectStore(STORES.CONFLICT_LOG);

    const conflict = {
      ...item,
      reason,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(conflict);
      request.onsuccess = () => {
        logger.warn('Conflict logged', { id: request.result, reason });
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Register event listener
   */
  addEventListener(event, callback) {
    this.listeners.push({ event, callback });
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, data) {
    this.listeners
      .filter(l => l.event === event)
      .forEach(l => l.callback(data));
  }

  /**
   * Clear all offline data
   */
  async clearAllData() {
    if (!this.db) await this.initialize();

    const storeNames = [
      STORES.PENDING_CHECKINS,
      STORES.PENDING_RESERVATIONS,
      STORES.CACHED_CLASSES,
      STORES.SYNC_QUEUE,
      STORES.CONFLICT_LOG
    ];

    const transaction = this.db.transaction(storeNames, 'readwrite');

    storeNames.forEach(storeName => {
      transaction.objectStore(storeName).clear();
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        logger.info('All offline data cleared');
        resolve();
      };
      transaction.onerror = () => {
        logger.error('Failed to clear offline data');
        reject(transaction.error);
      };
    });
  }
}

// ============================================
// OFFLINE STATUS MONITOR
// ============================================

class OfflineStatusMonitor {
  constructor(offlineManager) {
    this.offlineManager = offlineManager;
    this.isOnline = navigator.onLine;
    this.listeners = [];

    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.info('Connection restored - triggering sync');
      this.notifyListeners('online');
      this.offlineManager.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.warn('Connection lost - entering offline mode');
      this.notifyListeners('offline');
    });
  }

  addEventListener(event, callback) {
    this.listeners.push({ event, callback });
  }

  notifyListeners(event) {
    this.listeners
      .filter(l => l.event === event)
      .forEach(l => l.callback());
  }
}

// ============================================
// EXPORTS
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OfflineDataManager,
    OfflineStatusMonitor,
    STORES
  };
}

if (typeof window !== 'undefined') {
  window.OfflineDataManager = OfflineDataManager;
  window.OfflineStatusMonitor = OfflineStatusMonitor;
}
