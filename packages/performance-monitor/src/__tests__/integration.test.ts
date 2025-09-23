/**
 * Integration tests for the performance monitoring package
 * Tests the complete workflow from initialization to reporting
 */

import { PerformanceMonitor } from '../PerformanceMonitor';
import { ModuleFederationTracker } from '../ModuleFederationTracker';
import { WebVitalsTracker } from '../WebVitalsTracker';
import { BundleAnalyzer } from '../BundleAnalyzer';
import { PerformanceReporter } from '../PerformanceReporter';

// Mock web-vitals
jest.mock('web-vitals', () => ({
  getCLS: jest.fn((callback) => setTimeout(() => callback({ value: 0.08, delta: 0.08 }), 10)),
  getFID: jest.fn((callback) => setTimeout(() => callback({ value: 120, delta: 120 }), 20)),
  getFCP: jest.fn((callback) => setTimeout(() => callback({ value: 1600, delta: 1600 }), 30)),
  getLCP: jest.fn((callback) => setTimeout(() => callback({ value: 2200, delta: 2200 }), 40)),
  getTTFB: jest.fn((callback) => setTimeout(() => callback({ value: 500, delta: 500 }), 50)),
}));

// Mock fetch
const mockFetch = jest.fn();
Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  data: {} as Record<string, string>,
  getItem: jest.fn((key: string) => mockLocalStorage.data[key] || null),
  setItem: jest.fn((key: string, value: string) => { mockLocalStorage.data[key] = value; }),
  removeItem: jest.fn((key: string) => { delete mockLocalStorage.data[key]; }),
  clear: jest.fn(() => { mockLocalStorage.data = {}; }),
};

Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

describe('Performance Monitor Integration Tests', () => {
  let monitor: PerformanceMonitor;
  let mfTracker: ModuleFederationTracker;
  let webVitalsTracker: WebVitalsTracker;
  let bundleAnalyzer: BundleAnalyzer;
  let reporter: PerformanceReporter;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ enabled: true });
    mfTracker = new ModuleFederationTracker(monitor, {
      remoteUrls: ['http://localhost:8081', 'http://localhost:8082']
    });
    webVitalsTracker = new WebVitalsTracker(monitor);
    bundleAnalyzer = new BundleAnalyzer(monitor);
    reporter = new PerformanceReporter(monitor);

    reporter.setTrackers({
      moduleFederation: mfTracker,
      webVitals: webVitalsTracker,
      bundleAnalyzer: bundleAnalyzer,
    });

    jest.clearAllMocks();
    mockLocalStorage.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    mfTracker.destroy();
    webVitalsTracker.destroy();
    bundleAnalyzer.destroy();
    monitor.destroy();
  });

  describe('Full Workflow Integration', () => {
    it('should track performance metrics across all components', async () => {
      // Simulate Module Federation load
      const mockResponse = new Response('remote content', {
        status: 200,
        headers: { 'content-length': '102400' }
      });
      mockFetch.mockResolvedValue(mockResponse);

      await fetch('http://localhost:8081/remoteEntry.js');

      // Simulate bundle resource loading
      const mockResourceEntry = {
        name: 'http://localhost:8081/main.bundle.js',
        duration: 180,
        encodedBodySize: 204800,
        transferSize: 204800,
      };

      (bundleAnalyzer as any).analyzeResource(mockResourceEntry);

      // Add some manual metrics
      monitor.addMetric({
        name: 'custom_metric',
        value: 250,
        timestamp: performance.now(),
      });

      // Wait for web vitals to be collected
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate comprehensive report
      const report = reporter.generateComprehensiveReport();

      // Verify report structure
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('webVitals');
      expect(report).toHaveProperty('moduleFederation');
      expect(report).toHaveProperty('bundleAnalysis');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('metadata');

      // Verify metrics were collected
      expect(report.metrics.length).toBeGreaterThan(0);

      // Verify Module Federation tracking
      expect(report.moduleFederation?.metrics).toBeDefined();
      expect(report.moduleFederation?.statistics).toBeDefined();

      // Verify Web Vitals tracking
      expect(report.webVitals?.vitals).toBeDefined();
      expect(report.webVitals?.score).toBeGreaterThan(0);

      // Verify Bundle Analysis
      expect(report.bundleAnalysis?.statistics).toBeDefined();
      expect(report.bundleAnalysis?.metrics).toBeDefined();

      // Verify metadata
      expect(report.metadata.reportId).toMatch(/^perf-\d+-[a-z0-9]+$/);
      expect(report.metadata.generatedAt).toBeDefined();
    });

    it('should generate appropriate recommendations based on performance data', async () => {
      // Simulate poor performance scenarios

      // Poor Web Vitals
      jest.spyOn(webVitalsTracker, 'getWebVitalsReport').mockReturnValue({
        score: 45, // Poor score
        vitals: {
          CLS: { value: 0.3, rating: 'poor', unit: 'score' },
          LCP: { value: 4500, rating: 'poor', unit: 'ms' },
        },
        summary: { good: 0, needsImprovement: 1, poor: 1 },
      });

      // Poor Module Federation performance
      jest.spyOn(mfTracker, 'getLoadStatistics').mockReturnValue({
        totalLoads: 10,
        firstLoads: 8,
        cachedLoads: 2,
        errors: 2,
        avgFirstLoadTime: 3500,
        avgCachedLoadTime: 100,
        successRate: 80,
      });

      // Poor bundle analysis
      jest.spyOn(bundleAnalyzer, 'generateOptimizationRecommendations').mockReturnValue([
        'Consider code splitting: 3 bundle(s) are over 250KB',
        'Enable better compression: 2 bundle(s) have poor compression ratios',
      ]);

      const report = reporter.generateComprehensiveReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('Web Vitals'))).toBe(true);
      expect(report.recommendations.some(r => r.includes('success rate'))).toBe(true);
      expect(report.recommendations.some(r => r.includes('code splitting'))).toBe(true);
    });

    it('should handle errors gracefully across all components', async () => {
      // Simulate fetch error
      mockFetch.mockRejectedValue(new Error('Network error'));

      try {
        await fetch('http://localhost:8081/remoteEntry.js');
      } catch (error) {
        // Expected
      }

      // Simulate malformed resource
      (bundleAnalyzer as any).analyzeResource({
        name: 'http://example.com/invalid',
        duration: NaN,
        encodedBodySize: null,
        transferSize: undefined,
      });

      // Generate report should still work
      const report = reporter.generateComprehensiveReport();
      expect(report).toBeDefined();
      expect(report.metadata).toBeDefined();

      // Should have error metrics
      const errorMetrics = report.metrics.filter(m => m.name.includes('error'));
      expect(errorMetrics.length).toBeGreaterThan(0);
    });

    it('should export reports in multiple formats', () => {
      const report = reporter.generateComprehensiveReport();

      // Test JSON export
      const jsonExport = reporter.exportReport(report, 'json');
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      // Test CSV export
      const csvExport = reporter.exportReport(report, 'csv');
      expect(csvExport).toContain('Type,Name,Value,Timestamp,Tags');

      // Test HTML export
      const htmlExport = reporter.exportReport(report, 'html');
      expect(htmlExport).toContain('<!DOCTYPE html>');
      expect(htmlExport).toContain('Performance Report');
      expect(htmlExport).toContain(report.metadata.reportId);
    });

    it('should persist and retrieve reports from storage', () => {
      const report1 = reporter.generateComprehensiveReport();
      const report2 = reporter.generateComprehensiveReport();

      reporter.saveReport(report1);
      reporter.saveReport(report2);

      const savedReports = reporter.getSavedReports();
      expect(savedReports).toHaveLength(2);
      expect(savedReports[0].metadata.reportId).toBe(report1.metadata.reportId);
      expect(savedReports[1].metadata.reportId).toBe(report2.metadata.reportId);

      // Test clearing
      reporter.clearSavedReports();
      expect(reporter.getSavedReports()).toHaveLength(0);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-frequency metric collection', () => {
      const startTime = performance.now();

      // Add many metrics rapidly
      for (let i = 0; i < 1000; i++) {
        monitor.addMetric({
          name: `metric_${i}`,
          value: Math.random() * 1000,
          timestamp: performance.now(),
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);

      // Should respect buffer size
      const metrics = monitor.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });

    it('should handle multiple simultaneous fetch requests', async () => {
      const promises = [];
      mockFetch.mockResolvedValue(new Response('test', { status: 200 }));

      // Simulate multiple simultaneous MF loads
      for (let i = 0; i < 10; i++) {
        promises.push(fetch(`http://localhost:8081/chunk-${i}.js`));
      }

      await Promise.all(promises);

      const mfMetrics = mfTracker.getModuleFederationMetrics();
      expect(mfMetrics.length).toBe(10);

      const stats = mfTracker.getLoadStatistics();
      expect(stats.totalLoads).toBe(10);
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources properly', () => {
      // Create many metrics
      for (let i = 0; i < 500; i++) {
        monitor.addMetric({
          name: `cleanup_test_${i}`,
          value: i,
          timestamp: performance.now(),
        });
      }

      expect(monitor.getMetrics().length).toBe(500);

      // Clear metrics
      monitor.clearMetrics();
      expect(monitor.getMetrics().length).toBe(0);

      // Destroy all components
      mfTracker.destroy();
      webVitalsTracker.destroy();
      bundleAnalyzer.destroy();
      monitor.destroy();

      // Should not throw errors when destroyed
      expect(() => monitor.addMetric({
        name: 'after_destroy',
        value: 1,
        timestamp: performance.now(),
      })).not.toThrow();
    });

    it('should handle buffer overflow gracefully', () => {
      const smallBufferMonitor = new PerformanceMonitor({ bufferSize: 5 });

      // Add more metrics than buffer size
      for (let i = 0; i < 10; i++) {
        smallBufferMonitor.addMetric({
          name: `overflow_${i}`,
          value: i,
          timestamp: performance.now(),
        });
      }

      const metrics = smallBufferMonitor.getMetrics();
      expect(metrics.length).toBe(5);

      // Should keep the most recent ones
      expect(metrics[0].name).toBe('overflow_5');
      expect(metrics[4].name).toBe('overflow_9');

      smallBufferMonitor.destroy();
    });
  });

  describe('Configuration Flexibility', () => {
    it('should respect disabled tracking options', () => {
      const selectiveReporter = new PerformanceReporter(monitor, {
        includeWebVitals: false,
        includeModuleFederation: false,
        includeBundleAnalysis: true,
        includeRecommendations: false,
      });

      const report = selectiveReporter.generateComprehensiveReport();

      expect(report.webVitals).toBeUndefined();
      expect(report.moduleFederation).toBeUndefined();
      expect(report.bundleAnalysis).toBeUndefined();
      expect(report.recommendations).toHaveLength(0);
    });

    it('should work with custom configuration', () => {
      const customMonitor = new PerformanceMonitor({
        bufferSize: 100,
        reportInterval: 5000,
        autoReport: false,
      });

      const customTracker = new ModuleFederationTracker(customMonitor, {
        trackRemoteLoads: false,
        trackChunkLoads: true,
        trackFailures: true,
        remoteUrls: ['http://custom:9000'],
      });

      expect(customTracker).toBeInstanceOf(ModuleFederationTracker);

      customTracker.destroy();
      customMonitor.destroy();
    });
  });
});