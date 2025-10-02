// PROMPT 22: FRONTEND & MOBILE PWA - PUSH NOTIFICATIONS HANDLER
// Web Push API integration with subscription management

const logger = require('../../utils/logger').createLogger('push-notifications');
const { AppError, ErrorTypes } = require('../../utils/error-handler');

// ============================================
// PUSH NOTIFICATION CONFIGURATION
// ============================================

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const NOTIFICATION_DEFAULTS = {
  icon: '/icons/icon-192x192.png',
  badge: '/icons/badge-72x72.png',
  vibrate: [200, 100, 200],
  requireInteraction: false
};

// ============================================
// CLIENT-SIDE: SUBSCRIPTION MANAGER
// ============================================

class PushSubscriptionManager {
  constructor() {
    this.swRegistration = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Initialize push notifications
   */
  async initialize() {
    if (!this.isSupported) {
      throw new AppError(
        'Push notifications not supported',
        ErrorTypes.NOT_SUPPORTED,
        400
      );
    }

    try {
      this.swRegistration = await navigator.serviceWorker.ready;
      logger.info('Push notification manager initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize push notifications', { error });
      throw new AppError(
        'Failed to initialize push notifications',
        ErrorTypes.EXTERNAL_API_ERROR,
        500,
        { originalError: error.message }
      );
    }
  }

  /**
   * Check current subscription status
   */
  async getSubscription() {
    if (!this.swRegistration) {
      await this.initialize();
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      logger.info('Retrieved push subscription', {
        hasSubscription: !!subscription
      });
      return subscription;
    } catch (error) {
      logger.error('Failed to get subscription', { error });
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe() {
    if (!this.swRegistration) {
      await this.initialize();
    }

    try {
      // Check if already subscribed
      let subscription = await this.swRegistration.pushManager.getSubscription();

      if (subscription) {
        logger.info('Already subscribed to push notifications');
        return subscription;
      }

      // Request permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        throw new AppError(
          'Push notification permission denied',
          ErrorTypes.PERMISSION_DENIED,
          403
        );
      }

      // Subscribe
      subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);

      logger.info('Successfully subscribed to push notifications');
      return subscription;
    } catch (error) {
      logger.error('Failed to subscribe to push notifications', { error });
      throw new AppError(
        'Failed to subscribe to push notifications',
        ErrorTypes.EXTERNAL_API_ERROR,
        500,
        { originalError: error.message }
      );
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    try {
      const subscription = await this.getSubscription();

      if (!subscription) {
        logger.info('No active subscription to unsubscribe');
        return true;
      }

      // Unsubscribe from browser
      const success = await subscription.unsubscribe();

      if (success) {
        // Remove subscription from backend
        await this.removeSubscriptionFromBackend(subscription);
        logger.info('Successfully unsubscribed from push notifications');
      }

      return success;
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications', { error });
      throw new AppError(
        'Failed to unsubscribe',
        ErrorTypes.EXTERNAL_API_ERROR,
        500,
        { originalError: error.message }
      );
    }
  }

  /**
   * Send subscription to backend
   */
  async sendSubscriptionToBackend(subscription) {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      logger.info('Subscription sent to backend');
      return true;
    } catch (error) {
      logger.error('Failed to send subscription to backend', { error });
      throw error;
    }
  }

  /**
   * Remove subscription from backend
   */
  async removeSubscriptionFromBackend(subscription) {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      logger.info('Subscription removed from backend');
      return true;
    } catch (error) {
      logger.error('Failed to remove subscription from backend', { error });
      throw error;
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Show local notification (for testing)
   */
  async showLocalNotification(title, options = {}) {
    if (!this.swRegistration) {
      await this.initialize();
    }

    const notificationOptions = {
      ...NOTIFICATION_DEFAULTS,
      ...options
    };

    try {
      await this.swRegistration.showNotification(title, notificationOptions);
      logger.info('Local notification shown', { title });
      return true;
    } catch (error) {
      logger.error('Failed to show local notification', { error, title });
      return false;
    }
  }
}

// ============================================
// SERVER-SIDE: NOTIFICATION SENDER (Node.js)
// ============================================

const webpush = require('web-push');

class PushNotificationSender {
  constructor() {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      logger.warn('VAPID keys not configured - push notifications disabled');
      this.isConfigured = false;
      return;
    }

    webpush.setVapidDetails(
      `mailto:${process.env.ADMIN_EMAIL || 'admin@gimai.com'}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    this.isConfigured = true;
    logger.info('Push notification sender initialized');
  }

  /**
   * Send push notification to single subscription
   */
  async sendNotification(subscription, payload) {
    if (!this.isConfigured) {
      throw new AppError(
        'Push notifications not configured',
        ErrorTypes.CONFIGURATION_ERROR,
        500
      );
    }

    try {
      const payloadString = JSON.stringify(payload);

      const result = await webpush.sendNotification(subscription, payloadString);

      logger.info('Push notification sent successfully', {
        endpoint: subscription.endpoint.substring(0, 50),
        statusCode: result.statusCode
      });

      return result;
    } catch (error) {
      logger.error('Failed to send push notification', {
        error: error.message,
        statusCode: error.statusCode,
        endpoint: subscription.endpoint
      });

      // Handle expired subscriptions
      if (error.statusCode === 410) {
        logger.info('Subscription expired', { endpoint: subscription.endpoint });
        return { expired: true, subscription };
      }

      throw new AppError(
        'Failed to send push notification',
        ErrorTypes.EXTERNAL_API_ERROR,
        500,
        { originalError: error.message, statusCode: error.statusCode }
      );
    }
  }

  /**
   * Send push notification to multiple subscriptions
   */
  async sendBulkNotifications(subscriptions, payload) {
    if (!this.isConfigured) {
      throw new AppError(
        'Push notifications not configured',
        ErrorTypes.CONFIGURATION_ERROR,
        500
      );
    }

    const results = {
      sent: 0,
      failed: 0,
      expired: []
    };

    const promises = subscriptions.map(async (subscription) => {
      try {
        const result = await this.sendNotification(subscription, payload);

        if (result.expired) {
          results.expired.push(subscription);
        } else {
          results.sent++;
        }
      } catch (error) {
        results.failed++;
        logger.error('Bulk notification failed for subscription', {
          endpoint: subscription.endpoint,
          error: error.message
        });
      }
    });

    await Promise.all(promises);

    logger.info('Bulk notifications completed', results);
    return results;
  }

  /**
   * Helper: Create notification payload
   */
  createPayload(title, body, options = {}) {
    return {
      title,
      body,
      icon: options.icon || NOTIFICATION_DEFAULTS.icon,
      badge: options.badge || NOTIFICATION_DEFAULTS.badge,
      vibrate: options.vibrate || NOTIFICATION_DEFAULTS.vibrate,
      data: options.data || {},
      actions: options.actions || [],
      tag: options.tag || 'default',
      requireInteraction: options.requireInteraction || false
    };
  }

  /**
   * Send class reminder notification
   */
  async sendClassReminder(subscription, className, classTime) {
    const payload = this.createPayload(
      'Recordatorio de Clase',
      `Tu clase de ${className} comienza en 1 hora (${classTime})`,
      {
        tag: 'class-reminder',
        data: { type: 'class-reminder', className, classTime },
        actions: [
          { action: 'confirm', title: 'Confirmar Asistencia' },
          { action: 'cancel', title: 'Cancelar Reserva' }
        ],
        requireInteraction: true
      }
    );

    return this.sendNotification(subscription, payload);
  }

  /**
   * Send debt reminder notification
   */
  async sendDebtReminder(subscription, amount, dueDate) {
    const payload = this.createPayload(
      'Recordatorio de Pago',
      `Tienes un saldo pendiente de $${amount}. Vence: ${dueDate}`,
      {
        tag: 'debt-reminder',
        data: { type: 'debt-reminder', amount, dueDate },
        actions: [
          { action: 'pay', title: 'Pagar Ahora' },
          { action: 'later', title: 'Recordar Después' }
        ],
        requireInteraction: true
      }
    );

    return this.sendNotification(subscription, payload);
  }

  /**
   * Send check-in confirmation notification
   */
  async sendCheckinConfirmation(subscription, memberName, className) {
    const payload = this.createPayload(
      'Check-in Exitoso',
      `¡Bienvenido ${memberName}! Check-in confirmado para ${className}`,
      {
        tag: 'checkin-confirmation',
        data: { type: 'checkin', memberName, className },
        vibrate: [200, 100, 200, 100, 200]
      }
    );

    return this.sendNotification(subscription, payload);
  }
}

// ============================================
// EXPORTS
// ============================================

// Client-side export (for browser)
if (typeof window !== 'undefined') {
  window.PushSubscriptionManager = PushSubscriptionManager;
}

// Server-side export (for Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PushNotificationSender,
    PushSubscriptionManager
  };
}
