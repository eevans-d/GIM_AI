// PROMPT 22: FRONTEND & MOBILE PWA - PERFORMANCE OPTIMIZER
// Lazy loading, code splitting, image optimization, and performance monitoring

const logger = require('../../utils/logger').createLogger('performance-optimizer');

// ============================================
// LAZY LOADING UTILITIES
// ============================================

class LazyLoader {
  /**
   * Lazy load images with Intersection Observer
   */
  static initializeLazyImages() {
    const images = document.querySelectorAll('img[data-src]');

    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);

            logger.info('Image lazy loaded', { src: img.dataset.src });
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });

      images.forEach(img => imageObserver.observe(img));

      logger.info('Lazy loading initialized', { imageCount: images.length });
    } else {
      // Fallback for browsers without Intersection Observer
      images.forEach(img => {
        img.src = img.dataset.src;
        img.classList.remove('lazy');
      });
    }
  }

  /**
   * Lazy load components/modules
   */
  static async loadComponent(componentPath) {
    try {
      const startTime = performance.now();
      const component = await import(componentPath);
      const loadTime = performance.now() - startTime;

      logger.info('Component loaded', { componentPath, loadTime: Math.round(loadTime) });

      return component;
    } catch (error) {
      logger.error('Failed to load component', { componentPath, error });
      throw error;
    }
  }

  /**
   * Lazy load scripts
   */
  static loadScript(src, attributes = {}) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;

      Object.keys(attributes).forEach(key => {
        script.setAttribute(key, attributes[key]);
      });

      script.onload = () => {
        logger.info('Script loaded', { src });
        resolve();
      };

      script.onerror = () => {
        logger.error('Failed to load script', { src });
        reject(new Error(`Failed to load script: ${src}`));
      };

      document.head.appendChild(script);
    });
  }
}

// ============================================
// IMAGE OPTIMIZATION
// ============================================

class ImageOptimizer {
  /**
   * Generate responsive image srcset
   */
  static generateSrcSet(baseUrl, widths = [320, 640, 960, 1280, 1920]) {
    return widths
      .map(width => `${baseUrl}?w=${width} ${width}w`)
      .join(', ');
  }

  /**
   * Generate sizes attribute
   */
  static generateSizes(breakpoints = [
    { maxWidth: 640, size: '100vw' },
    { maxWidth: 1024, size: '50vw' },
    { maxWidth: null, size: '33vw' }
  ]) {
    return breakpoints
      .map(bp => bp.maxWidth 
        ? `(max-width: ${bp.maxWidth}px) ${bp.size}`
        : bp.size
      )
      .join(', ');
  }

  /**
   * Compress image client-side
   */
  static async compressImage(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 0.85,
      outputFormat = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Calculate new dimensions
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            const originalSize = file.size;
            const compressedSize = blob.size;
            const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

            logger.info('Image compressed', {
              originalSize: (originalSize / 1024).toFixed(2) + 'KB',
              compressedSize: (compressedSize / 1024).toFixed(2) + 'KB',
              reduction: reduction + '%'
            });

            resolve(new File([blob], file.name, {
              type: outputFormat,
              lastModified: Date.now()
            }));
          }, outputFormat, quality);
        };

        img.onerror = reject;
        img.src = e.target.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert image to WebP if supported
   */
  static supportsWebP() {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
}

// ============================================
// CODE SPLITTING UTILITIES
// ============================================

class CodeSplitter {
  /**
   * Dynamic import with retry
   */
  static async importWithRetry(modulePath, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await import(modulePath);
      } catch (error) {
        if (i === retries - 1) {
          logger.error('Failed to import module after retries', { modulePath, error });
          throw error;
        }

        logger.warn('Retrying module import', { modulePath, attempt: i + 1 });
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  /**
   * Preload critical routes
   */
  static preloadRoute(routePath) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = routePath;
    document.head.appendChild(link);

    logger.info('Route prefetched', { routePath });
  }

  /**
   * Preconnect to external domains
   */
  static preconnect(domains) {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    logger.info('Domains preconnected', { count: domains.length });
  }
}

// ============================================
// PERFORMANCE MONITORING
// ============================================

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTime: 0,
      domContentLoaded: 0,
      firstPaint: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      timeToInteractive: 0
    };
  }

  /**
   * Collect Core Web Vitals
   */
  collectWebVitals() {
    // Performance Observer for LCP
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime;

          logger.info('LCP measured', {
            lcp: Math.round(this.metrics.largestContentfulPaint)
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.metrics.firstInputDelay = entry.processingStart - entry.startTime;

            logger.info('FID measured', {
              fid: Math.round(this.metrics.firstInputDelay)
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.metrics.cumulativeLayoutShift = clsValue;
            }
          });

          logger.info('CLS measured', {
            cls: this.metrics.cumulativeLayoutShift.toFixed(3)
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        logger.error('Failed to observe performance metrics', { error });
      }
    }

    // Navigation Timing API
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.timing;

        this.metrics.loadTime = perfData.loadEventEnd - perfData.navigationStart;
        this.metrics.domContentLoaded = perfData.domContentLoadedEventEnd - perfData.navigationStart;

        // Paint Timing API
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          if (entry.name === 'first-paint') {
            this.metrics.firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime;
          }
        });

        logger.info('Performance metrics collected', this.metrics);

        // Send to analytics
        this.sendToAnalytics();
      }, 0);
    });
  }

  /**
   * Measure resource timing
   */
  measureResources() {
    const resources = performance.getEntriesByType('resource');
    const resourceStats = {
      total: resources.length,
      byType: {},
      slowest: []
    };

    resources.forEach(resource => {
      const type = resource.initiatorType;
      if (!resourceStats.byType[type]) {
        resourceStats.byType[type] = { count: 0, totalDuration: 0 };
      }

      resourceStats.byType[type].count++;
      resourceStats.byType[type].totalDuration += resource.duration;
    });

    // Find slowest resources
    resourceStats.slowest = resources
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(r => ({
        name: r.name,
        duration: Math.round(r.duration),
        type: r.initiatorType
      }));

    logger.info('Resource timing analyzed', resourceStats);

    return resourceStats;
  }

  /**
   * Measure JavaScript heap size
   */
  measureMemoryUsage() {
    if (performance.memory) {
      const memory = {
        usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      };

      logger.info('Memory usage', memory);

      return memory;
    }

    return null;
  }

  /**
   * Send metrics to analytics backend
   */
  async sendToAnalytics() {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: this.metrics,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink
          } : null
        })
      });

      logger.info('Performance metrics sent to analytics');
    } catch (error) {
      logger.error('Failed to send performance metrics', { error });
    }
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore() {
    const scores = {
      lcp: this.scoreLCP(this.metrics.largestContentfulPaint),
      fid: this.scoreFID(this.metrics.firstInputDelay),
      cls: this.scoreCLS(this.metrics.cumulativeLayoutShift)
    };

    const totalScore = (scores.lcp + scores.fid + scores.cls) / 3;

    logger.info('Performance score calculated', { scores, totalScore: Math.round(totalScore) });

    return {
      total: Math.round(totalScore),
      breakdown: scores
    };
  }

  scoreLCP(lcp) {
    if (lcp <= 2500) return 100;
    if (lcp <= 4000) return 50;
    return 0;
  }

  scoreFID(fid) {
    if (fid <= 100) return 100;
    if (fid <= 300) return 50;
    return 0;
  }

  scoreCLS(cls) {
    if (cls <= 0.1) return 100;
    if (cls <= 0.25) return 50;
    return 0;
  }
}

// ============================================
// BUNDLE ANALYZER
// ============================================

class BundleAnalyzer {
  /**
   * Analyze JavaScript bundle sizes
   */
  static async analyzeBundles() {
    const resources = performance.getEntriesByType('resource');
    const jsResources = resources.filter(r => r.initiatorType === 'script');

    const bundles = jsResources.map(r => ({
      name: r.name.split('/').pop(),
      size: r.transferSize,
      duration: Math.round(r.duration)
    }));

    const totalSize = bundles.reduce((sum, b) => sum + b.size, 0);

    logger.info('Bundle analysis', {
      count: bundles.length,
      totalSize: (totalSize / 1024).toFixed(2) + ' KB',
      bundles: bundles.sort((a, b) => b.size - a.size).slice(0, 5)
    });

    return {
      totalSize,
      bundles
    };
  }
}

// ============================================
// EXPORTS
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LazyLoader,
    ImageOptimizer,
    CodeSplitter,
    PerformanceMonitor,
    BundleAnalyzer
  };
}

if (typeof window !== 'undefined') {
  window.PerformanceOptimizer = {
    LazyLoader,
    ImageOptimizer,
    CodeSplitter,
    PerformanceMonitor,
    BundleAnalyzer
  };
}
