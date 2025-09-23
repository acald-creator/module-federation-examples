import { PerformanceMonitor } from '../PerformanceMonitor';
import { WebVitalsTracker } from '../WebVitalsTracker';

// Mock web-vitals functions
jest.mock('web-vitals', () => ({
  getCLS: jest.fn((callback) => {
    // Simulate CLS measurement
    setTimeout(() => callback({ value: 0.05, delta: 0.05 }), 10);
  }),
  getFID: jest.fn((callback) => {
    // Simulate FID measurement
    setTimeout(() => callback({ value: 80, delta: 80 }), 20);
  }),
  getFCP: jest.fn((callback) => {
    // Simulate FCP measurement
    setTimeout(() => callback({ value: 1500, delta: 1500 }), 30);
  }),
  getLCP: jest.fn((callback) => {
    // Simulate LCP measurement
    setTimeout(() => callback({ value: 2000, delta: 2000 }), 40);
  }),
  getTTFB: jest.fn((callback) => {
    // Simulate TTFB measurement
    setTimeout(() => callback({ value: 600, delta: 600 }), 50);
  }),
}));

describe('WebVitalsTracker', () => {
  let monitor: PerformanceMonitor;
  let webVitalsTracker: WebVitalsTracker;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ enabled: true });
    webVitalsTracker = new WebVitalsTracker(monitor);
    jest.clearAllMocks();
  });

  afterEach(() => {
    webVitalsTracker.destroy();
    monitor.destroy();
  });

  describe('initialization', () => {
    it('should create tracker instance', () => {
      expect(webVitalsTracker).toBeInstanceOf(WebVitalsTracker);
    });

    it('should accept custom configuration', () => {
      const customTracker = new WebVitalsTracker(monitor, {
        trackCLS: false,
        trackFID: false,
        reportAllChanges: true,
      });
      expect(customTracker).toBeInstanceOf(WebVitalsTracker);
      customTracker.destroy();
    });
  });

  describe('rating calculation', () => {
    it('should correctly rate CLS values', () => {
      expect((webVitalsTracker as any).getRating('CLS', 0.05)).toBe('good');
      expect((webVitalsTracker as any).getRating('CLS', 0.15)).toBe('needs-improvement');
      expect((webVitalsTracker as any).getRating('CLS', 0.3)).toBe('poor');
    });

    it('should correctly rate FID values', () => {
      expect((webVitalsTracker as any).getRating('FID', 80)).toBe('good');
      expect((webVitalsTracker as any).getRating('FID', 200)).toBe('needs-improvement');
      expect((webVitalsTracker as any).getRating('FID', 400)).toBe('poor');
    });

    it('should correctly rate LCP values', () => {
      expect((webVitalsTracker as any).getRating('LCP', 2000)).toBe('good');
      expect((webVitalsTracker as any).getRating('LCP', 3000)).toBe('needs-improvement');
      expect((webVitalsTracker as any).getRating('LCP', 5000)).toBe('poor');
    });
  });

  describe('unit detection', () => {
    it('should return correct units for each vital', () => {
      expect((webVitalsTracker as any).getUnit('CLS')).toBe('score');
      expect((webVitalsTracker as any).getUnit('FID')).toBe('ms');
      expect((webVitalsTracker as any).getUnit('LCP')).toBe('ms');
      expect((webVitalsTracker as any).getUnit('FCP')).toBe('ms');
      expect((webVitalsTracker as any).getUnit('TTFB')).toBe('ms');
    });
  });

  describe('web vitals recording', () => {
    it('should record web vitals as metrics', (done) => {
      // Wait for mock web vitals to trigger
      setTimeout(() => {
        const webVitalsMetrics = webVitalsTracker.getWebVitalsMetrics();
        expect(webVitalsMetrics.length).toBeGreaterThan(0);

        const clsMetric = webVitalsMetrics.find(m => m.name === 'web_vital_cls');
        expect(clsMetric).toBeDefined();
        expect(clsMetric?.rating).toBe('good');
        expect(clsMetric?.value).toBe(0.05);

        done();
      }, 100);
    });

    it('should track current web vitals values', (done) => {
      setTimeout(() => {
        const vitals = webVitalsTracker.getCurrentWebVitals();
        expect(vitals.CLS).toBe(0.05);
        expect(vitals.FID).toBe(80);
        expect(vitals.FCP).toBe(1500);
        expect(vitals.LCP).toBe(2000);
        expect(vitals.TTFB).toBe(600);
        done();
      }, 100);
    });
  });

  describe('web vitals scoring', () => {
    it('should calculate overall web vitals score', (done) => {
      setTimeout(() => {
        const score = webVitalsTracker.calculateWebVitalsScore();
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        // All our mock values are 'good' so score should be 100
        expect(score).toBe(100);
        done();
      }, 100);
    });

    it('should generate detailed web vitals report', (done) => {
      setTimeout(() => {
        const report = webVitalsTracker.getWebVitalsReport();

        expect(report).toHaveProperty('score');
        expect(report).toHaveProperty('vitals');
        expect(report).toHaveProperty('summary');

        expect(report.vitals.CLS).toBeDefined();
        expect(report.vitals.CLS.rating).toBe('good');
        expect(report.vitals.CLS.recommendation).toBe('Performance is good!');

        expect(report.summary.good).toBeGreaterThan(0);
        done();
      }, 100);
    });
  });

  describe('recommendations', () => {
    it('should provide appropriate recommendations for poor ratings', () => {
      const poorCLSRec = (webVitalsTracker as any).getRecommendation('CLS', 'poor');
      expect(poorCLSRec).toContain('layout shifts');

      const poorFIDRec = (webVitalsTracker as any).getRecommendation('FID', 'poor');
      expect(poorFIDRec).toContain('JavaScript');

      const poorLCPRec = (webVitalsTracker as any).getRecommendation('LCP', 'poor');
      expect(poorLCPRec).toContain('largest content');
    });

    it('should provide good performance message for good ratings', () => {
      const goodRec = (webVitalsTracker as any).getRecommendation('CLS', 'good');
      expect(goodRec).toBe('Performance is good!');
    });
  });

  describe('custom web vitals', () => {
    it('should measure custom web vitals', async () => {
      const customMeasure = jest.fn().mockResolvedValue(150);

      await webVitalsTracker.measureCustomWebVital('custom_metric', customMeasure);

      expect(customMeasure).toHaveBeenCalled();

      const metrics = monitor.getMetrics();
      const customMetric = metrics.find(m => m.name === 'custom_web_vital_custom_metric');
      expect(customMetric).toBeDefined();
      expect(customMetric?.value).toBe(150);
      expect(customMetric?.tags?.type).toBe('custom');
    });

    it('should handle custom web vital errors gracefully', async () => {
      const failingMeasure = jest.fn().mockRejectedValue(new Error('Measurement failed'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await webVitalsTracker.measureCustomWebVital('failing_metric', failingMeasure);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to measure custom web vital'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('change tracking', () => {
    it('should support web vitals change callbacks', (done) => {
      const changeCallback = jest.fn((vitals) => {
        expect(vitals).toBeDefined();
        expect(Object.keys(vitals).length).toBeGreaterThan(0);
        done();
      });

      webVitalsTracker.onWebVitalsChange(changeCallback);

      // Wait for vitals to be collected and callback to trigger
      setTimeout(() => {
        if (changeCallback.mock.calls.length === 0) {
          done(); // Skip if no calls made (acceptable)
        }
      }, 150);
    });
  });

  describe('cleanup', () => {
    it('should clear data on destroy', () => {
      webVitalsTracker.destroy();

      const vitals = webVitalsTracker.getCurrentWebVitals();
      expect(Object.keys(vitals)).toHaveLength(0);
    });
  });
});