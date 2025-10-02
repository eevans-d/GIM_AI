// PROMPT 22: FRONTEND & MOBILE PWA - RESPONSIVE UTILITIES
// Mobile-first design utilities with touch gestures and viewport management

const logger = require('../../utils/logger').createLogger('responsive-utils');

// ============================================
// BREAKPOINT MANAGER
// ============================================

class BreakpointManager {
  constructor() {
    this.breakpoints = {
      xs: 0,      // Extra small devices (phones, 0px and up)
      sm: 640,    // Small devices (landscape phones, 640px and up)
      md: 768,    // Medium devices (tablets, 768px and up)
      lg: 1024,   // Large devices (desktops, 1024px and up)
      xl: 1280,   // Extra large devices (large desktops, 1280px and up)
      '2xl': 1536 // 2X Extra large devices (1536px and up)
    };

    this.listeners = [];
    this.currentBreakpoint = this.getCurrentBreakpoint();

    this.setupResizeListener();
  }

  /**
   * Get current breakpoint
   */
  getCurrentBreakpoint() {
    const width = window.innerWidth;

    for (const [name, minWidth] of Object.entries(this.breakpoints).reverse()) {
      if (width >= minWidth) {
        return name;
      }
    }

    return 'xs';
  }

  /**
   * Check if current viewport matches breakpoint
   */
  matches(breakpoint) {
    const width = window.innerWidth;
    return width >= this.breakpoints[breakpoint];
  }

  /**
   * Check if mobile device
   */
  isMobile() {
    return !this.matches('md');
  }

  /**
   * Check if tablet device
   */
  isTablet() {
    return this.matches('md') && !this.matches('lg');
  }

  /**
   * Check if desktop device
   */
  isDesktop() {
    return this.matches('lg');
  }

  /**
   * Setup resize listener
   */
  setupResizeListener() {
    let resizeTimer;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {
        const newBreakpoint = this.getCurrentBreakpoint();

        if (newBreakpoint !== this.currentBreakpoint) {
          const oldBreakpoint = this.currentBreakpoint;
          this.currentBreakpoint = newBreakpoint;

          logger.info('Breakpoint changed', {
            from: oldBreakpoint,
            to: newBreakpoint,
            width: window.innerWidth
          });

          this.notifyListeners(oldBreakpoint, newBreakpoint);
        }
      }, 150); // Debounce
    });
  }

  /**
   * Add breakpoint change listener
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(oldBreakpoint, newBreakpoint) {
    this.listeners.forEach(callback => {
      callback(newBreakpoint, oldBreakpoint);
    });
  }

  /**
   * Get media query for breakpoint
   */
  getMediaQuery(breakpoint) {
    return `(min-width: ${this.breakpoints[breakpoint]}px)`;
  }
}

// ============================================
// VIEWPORT UTILITIES
// ============================================

class ViewportUtils {
  /**
   * Get viewport dimensions
   */
  static getDimensions() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      aspectRatio: (window.innerWidth / window.innerHeight).toFixed(2)
    };
  }

  /**
   * Get viewport size category
   */
  static getSizeCategory() {
    const width = window.innerWidth;

    if (width < 640) return 'xs';
    if (width < 768) return 'sm';
    if (width < 1024) return 'md';
    if (width < 1280) return 'lg';
    if (width < 1536) return 'xl';
    return '2xl';
  }

  /**
   * Check if portrait orientation
   */
  static isPortrait() {
    return window.innerHeight > window.innerWidth;
  }

  /**
   * Check if landscape orientation
   */
  static isLandscape() {
    return window.innerWidth > window.innerHeight;
  }

  /**
   * Get safe area insets (for notched devices)
   */
  static getSafeAreaInsets() {
    const style = getComputedStyle(document.documentElement);

    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0,
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0,
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)')) || 0
    };
  }

  /**
   * Set viewport height variable (fixes iOS vh issue)
   */
  static setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    logger.info('Viewport height variable set', { vh });
  }

  /**
   * Lock scroll (useful for modals)
   */
  static lockScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  /**
   * Unlock scroll
   */
  static unlockScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
}

// ============================================
// TOUCH GESTURE HANDLER
// ============================================

class TouchGestureHandler {
  constructor(element) {
    this.element = element;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.startTime = 0;
    this.isSwiping = false;

    this.listeners = {
      swipeLeft: [],
      swipeRight: [],
      swipeUp: [],
      swipeDown: [],
      tap: [],
      doubleTap: [],
      longPress: []
    };

    this.setupTouchListeners();
  }

  /**
   * Setup touch event listeners
   */
  setupTouchListeners() {
    let tapCount = 0;
    let tapTimer;
    let longPressTimer;

    this.element.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.startTime = Date.now();
      this.isSwiping = true;

      // Long press detection
      longPressTimer = setTimeout(() => {
        if (this.isSwiping) {
          this.triggerEvent('longPress', {
            x: this.startX,
            y: this.startY
          });
        }
      }, 500);

      // Tap detection
      tapCount++;
      if (tapCount === 1) {
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 300);
      }
    });

    this.element.addEventListener('touchmove', (e) => {
      if (!this.isSwiping) return;

      const touch = e.touches[0];
      this.currentX = touch.clientX;
      this.currentY = touch.clientY;

      clearTimeout(longPressTimer);
    });

    this.element.addEventListener('touchend', (e) => {
      if (!this.isSwiping) return;

      clearTimeout(longPressTimer);

      const deltaX = this.currentX - this.startX;
      const deltaY = this.currentY - this.startY;
      const duration = Date.now() - this.startTime;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Swipe detection (min 50px, max 300ms)
      if (distance > 50 && duration < 300) {
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

        if (angle > -45 && angle <= 45) {
          this.triggerEvent('swipeRight', { distance, duration, deltaX, deltaY });
        } else if (angle > 45 && angle <= 135) {
          this.triggerEvent('swipeDown', { distance, duration, deltaX, deltaY });
        } else if (angle > 135 || angle <= -135) {
          this.triggerEvent('swipeLeft', { distance, duration, deltaX, deltaY });
        } else {
          this.triggerEvent('swipeUp', { distance, duration, deltaX, deltaY });
        }
      }

      // Tap detection (max 10px movement, max 200ms)
      if (distance < 10 && duration < 200) {
        if (tapCount === 2) {
          clearTimeout(tapTimer);
          tapCount = 0;
          this.triggerEvent('doubleTap', { x: this.startX, y: this.startY });
        } else {
          this.triggerEvent('tap', { x: this.startX, y: this.startY });
        }
      }

      this.isSwiping = false;
      this.currentX = 0;
      this.currentY = 0;
    });
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Trigger event
   */
  triggerEvent(event, data) {
    logger.info('Touch gesture detected', { event, data });

    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Remove all listeners
   */
  destroy() {
    this.listeners = {
      swipeLeft: [],
      swipeRight: [],
      swipeUp: [],
      swipeDown: [],
      tap: [],
      doubleTap: [],
      longPress: []
    };
  }
}

// ============================================
// DEVICE DETECTION
// ============================================

class DeviceDetector {
  /**
   * Detect device type
   */
  static getDeviceType() {
    const ua = navigator.userAgent;

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }

    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }

    return 'desktop';
  }

  /**
   * Detect OS
   */
  static getOS() {
    const ua = navigator.userAgent;

    if (/windows phone/i.test(ua)) return 'Windows Phone';
    if (/android/i.test(ua)) return 'Android';
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'iOS';
    if (/Win/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'MacOS';
    if (/Linux/i.test(ua)) return 'Linux';

    return 'Unknown';
  }

  /**
   * Detect browser
   */
  static getBrowser() {
    const ua = navigator.userAgent;

    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
    if (/Opera\/|OPR\//.test(ua)) return 'Opera';

    return 'Unknown';
  }

  /**
   * Check if touch device
   */
  static isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Check if standalone PWA
   */
  static isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  /**
   * Get device capabilities
   */
  static getCapabilities() {
    return {
      deviceType: this.getDeviceType(),
      os: this.getOS(),
      browser: this.getBrowser(),
      isTouch: this.isTouchDevice(),
      isStandalone: this.isStandalone(),
      supportsServiceWorker: 'serviceWorker' in navigator,
      supportsPushNotifications: 'PushManager' in window,
      supportsWebP: this.supportsWebP(),
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      } : null
    };
  }

  /**
   * Check WebP support
   */
  static supportsWebP() {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
}

// ============================================
// RESPONSIVE IMAGE LOADER
// ============================================

class ResponsiveImageLoader {
  /**
   * Load appropriate image based on device pixel ratio
   */
  static getOptimalImageSrc(baseSrc, dpr = window.devicePixelRatio) {
    const multiplier = Math.min(Math.ceil(dpr), 3); // Max 3x

    if (multiplier === 1) return baseSrc;

    const extension = baseSrc.split('.').pop();
    const baseWithoutExt = baseSrc.slice(0, -extension.length - 1);

    return `${baseWithoutExt}@${multiplier}x.${extension}`;
  }

  /**
   * Preload images
   */
  static preloadImages(urls) {
    urls.forEach(url => {
      const img = new Image();
      img.src = url;
    });

    logger.info('Images preloaded', { count: urls.length });
  }
}

// ============================================
// EXPORTS
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BreakpointManager,
    ViewportUtils,
    TouchGestureHandler,
    DeviceDetector,
    ResponsiveImageLoader
  };
}

if (typeof window !== 'undefined') {
  window.ResponsiveUtils = {
    BreakpointManager,
    ViewportUtils,
    TouchGestureHandler,
    DeviceDetector,
    ResponsiveImageLoader
  };
}
