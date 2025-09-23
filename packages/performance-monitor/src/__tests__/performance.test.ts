/**
 * Performance and stress tests for the performance monitoring package
 */

import { PerformanceMonitor } from '../PerformanceMonitor';
import { ModuleFederationTracker } from '../ModuleFederationTracker';
import { BundleAnalyzer } from '../BundleAnalyzer';
import { PerformanceReporter } from '../PerformanceReporter';

describe('Performance and Stress Tests', () => {
  let monitor: PerformanceMonitor;
  let mfTracker: ModuleFederationTracker;
  let bundleAnalyzer: BundleAnalyzer;
  let reporter: PerformanceReporter;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ enabled: true, bufferSize: 10000 });
    mfTracker = new ModuleFederationTracker(monitor);
    bundleAnalyzer = new BundleAnalyzer(monitor);
    reporter = new PerformanceReporter(monitor);

    jest.clearAllMocks();
  });

  afterEach(() => {
    mfTracker.destroy();
    bundleAnalyzer.destroy();
    monitor.destroy();
  });

  describe('High Volume Metric Collection', () => {
    it('should handle rapid metric insertion efficiently', () => {
      const startTime = performance.now();
      const metricCount = 5000;

      for (let i = 0; i < metricCount; i++) {
        monitor.addMetric({
          name: `rapid_metric_${i % 10}`, // Reuse names to test filtering
          value: Math.random() * 1000,
          timestamp: performance.now(),
          tags: {
            iteration: i.toString(),
            group: Math.floor(i / 100).toString(),
          },
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (< 500ms for 5000 metrics)
      expect(duration).toBeLessThan(500);

      const metrics = monitor.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(metricCount);
    });

    it('should maintain performance with large metric buffers', () => {
      const largeBufferMonitor = new PerformanceMonitor({ bufferSize: 50000 });

      const operations = [
        () => largeBufferMonitor.addMetric({
          name: 'perf_test',
          value: Math.random() * 1000,
          timestamp: performance.now(),
        }),
        () => largeBufferMonitor.getMetrics(),
        () => largeBufferMonitor.getMetricsByName('perf_test'),
        () => largeBufferMonitor.generateReport(),
      ];

      // Add initial metrics
      for (let i = 0; i < 10000; i++) {
        operations[0]();
      }

      // Test operation performance
      operations.forEach((operation, index) => {
        const startTime = performance.now();

        for (let i = 0; i < 100; i++) {
          operation();
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Each operation should complete quickly even with large buffer
        expect(duration).toBeLessThan(100);
      });

      largeBufferMonitor.destroy();
    });

    it('should handle concurrent metric collection', async () => {
      const promises = [];
      const metricsPerPromise = 1000;
      const concurrentPromises = 10;

      for (let p = 0; p < concurrentPromises; p++) {
        promises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              for (let i = 0; i < metricsPerPromise; i++) {
                monitor.addMetric({
                  name: `concurrent_${p}_${i}`,
                  value: Math.random() * 1000,
                  timestamp: performance.now(),
                });
              }
              resolve();
            }, Math.random() * 10); // Random delay to simulate real conditions
          })
        );
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      const metrics = monitor.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.length).toBeLessThanOrEqual(concurrentPromises * metricsPerPromise);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory with buffer overflow', () => {
      const smallBufferMonitor = new PerformanceMonitor({ bufferSize: 100 });

      // Add way more metrics than buffer size
      for (let i = 0; i < 1000; i++) {
        smallBufferMonitor.addMetric({
          name: `memory_test_${i}`,
          value: i,
          timestamp: performance.now(),
          tags: {
            data: 'x'.repeat(100), // Some string data to test memory usage
          },
        });
      }

      const metrics = smallBufferMonitor.getMetrics();
      expect(metrics.length).toBe(100); // Should not exceed buffer size

      // Verify we kept the most recent ones
      expect(metrics[0].name).toBe('memory_test_900');
      expect(metrics[99].name).toBe('memory_test_999');

      smallBufferMonitor.destroy();
    });

    it('should handle large tag objects efficiently', () => {
      const largeTags = {};
      for (let i = 0; i < 100; i++) {
        (largeTags as any)[`tag_${i}`] = `value_${i}_${'x'.repeat(50)}`;
      }

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        monitor.addMetric({
          name: 'large_tags_test',
          value: i,
          timestamp: performance.now(),
          tags: largeTags,
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should still be reasonably fast

      const metrics = monitor.getMetricsByName('large_tags_test');
      expect(metrics.length).toBe(1000);
      expect(Object.keys(metrics[0].tags || {}).length).toBe(100);
    });
  });

  describe('Report Generation Performance', () => {
    it('should generate reports efficiently with large datasets', () => {
      // Add diverse metrics
      const metricTypes = ['load_time', 'bundle_size', 'web_vital', 'mf_load', 'custom'];

      for (let i = 0; i < 2000; i++) {
        monitor.addMetric({
          name: metricTypes[i % metricTypes.length],
          value: Math.random() * 1000,
          timestamp: performance.now() + i,
          tags: {
            type: metricTypes[i % metricTypes.length],
            index: i.toString(),
          },
        });
      }

      const startTime = performance.now();
      const report = reporter.generateComprehensiveReport();
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should generate quickly
      expect(report.metrics.length).toBe(2000);
      expect(report.summary.totalMetrics).toBe(2000);
    });

    it('should export large reports efficiently', () => {
      // Generate a large report
      for (let i = 0; i < 5000; i++) {
        monitor.addMetric({
          name: 'export_test',
          value: i,
          timestamp: performance.now(),
          tags: { iteration: i.toString() },
        });
      }

      const report = reporter.generateComprehensiveReport();

      // Test each export format
      const formats = ['json', 'csv', 'html'] as const;

      formats.forEach(format => {
        const startTime = performance.now();
        const exported = reporter.exportReport(report, format);
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(200); // Should export quickly
        expect(exported.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Resource Observer Performance', () => {
    it('should handle rapid resource timing entries', () => {
      const resourceCount = 1000;
      const startTime = performance.now();

      // Simulate rapid resource loading
      for (let i = 0; i < resourceCount; i++) {
        const mockResource = {
          name: `http://test.com/resource-${i}.js`,
          duration: Math.random() * 200,
          encodedBodySize: Math.random() * 100000,
          transferSize: Math.random() * 100000,
        };

        (bundleAnalyzer as any).analyzeResource(mockResource);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(300); // Should process quickly

      const bundles = bundleAnalyzer.getBundleInfo();
      expect(bundles.length).toBe(resourceCount);

      const stats = bundleAnalyzer.getBundleStatistics();
      expect(stats.totalBundles).toBe(resourceCount);
    });

    it('should maintain performance with complex bundle analysis', () => {
      const complexBundles = [];

      // Create bundles with various characteristics
      for (let i = 0; i < 500; i++) {
        complexBundles.push({
          name: `complex-bundle-${i}.js`,
          duration: Math.random() * 1000,
          encodedBodySize: Math.random() * 1000000,
          decodedBodySize: Math.random() * 2000000,
          transferSize: Math.random() * 1000000,
        });
      }

      const startTime = performance.now();

      complexBundles.forEach(bundle => {
        (bundleAnalyzer as any).analyzeResource({
          name: `http://test.com/${bundle.name}`,
          ...bundle,
        });
      });

      // Generate statistics
      const stats = bundleAnalyzer.getBundleStatistics();
      const recommendations = bundleAnalyzer.generateOptimizationRecommendations();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should analyze quickly
      expect(stats.totalBundles).toBe(500);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle invalid metric data gracefully', () => {
      const invalidMetrics = [
        { name: '', value: NaN, timestamp: -1 },
        { name: null as any, value: Infinity, timestamp: undefined as any },
        { name: 'test', value: null as any, timestamp: 'invalid' as any },
        { name: 'test', value: undefined as any, timestamp: null as any },
      ];

      expect(() => {
        invalidMetrics.forEach(metric => {
          monitor.addMetric(metric);
        });
      }).not.toThrow();

      const metrics = monitor.getMetrics();
      expect(metrics.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle extreme values efficiently', () => {
      const extremeValues = [
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        0,
        -0,
        1e100,
        1e-100,
      ];

      const startTime = performance.now();

      extremeValues.forEach((value, index) => {
        monitor.addMetric({
          name: `extreme_${index}`,
          value,
          timestamp: performance.now(),
        });
      });

      const report = monitor.generateReport();
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50);
      expect(report.metrics.length).toBe(extremeValues.length);
    });

    it('should recover from errors without affecting performance', () => {
      // Mock an error in one of the operations
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Simulate an error condition
      const mockErrorFunction = jest.fn(() => {
        throw new Error('Simulated error');
      });

      // This should not break the monitoring
      expect(() => {
        for (let i = 0; i < 100; i++) {
          try {
            if (i % 10 === 0) {
              mockErrorFunction();
            }
            monitor.addMetric({
              name: 'error_recovery_test',
              value: i,
              timestamp: performance.now(),
            });
          } catch (error) {
            // Errors should be handled gracefully
          }
        }
      }).not.toThrow();

      const metrics = monitor.getMetrics();
      expect(metrics.length).toBe(90); // 100 - 10 errors

      console.error = originalConsoleError;
    });
  });
});