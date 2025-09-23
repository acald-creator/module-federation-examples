import { PerformanceMonitor } from '../PerformanceMonitor';
import { BundleAnalyzer } from '../BundleAnalyzer';

// Mock fetch
const mockFetch = jest.fn();
Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true,
});

describe('BundleAnalyzer', () => {
  let monitor: PerformanceMonitor;
  let bundleAnalyzer: BundleAnalyzer;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ enabled: true });
    bundleAnalyzer = new BundleAnalyzer(monitor);
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    bundleAnalyzer.destroy();
    monitor.destroy();
  });

  describe('initialization', () => {
    it('should create analyzer instance', () => {
      expect(bundleAnalyzer).toBeInstanceOf(BundleAnalyzer);
    });

    it('should accept custom configuration', () => {
      const customAnalyzer = new BundleAnalyzer(monitor, {
        trackBundleSizes: false,
        trackLoadTimes: true,
        sizeThresholds: {
          small: 100 * 1024,
          medium: 500 * 1024,
          large: 2 * 1024 * 1024,
        },
      });
      expect(customAnalyzer).toBeInstanceOf(BundleAnalyzer);
      customAnalyzer.destroy();
    });
  });

  describe('bundle resource detection', () => {
    it('should identify JavaScript bundles', () => {
      expect((bundleAnalyzer as any).isBundleResource('app.js')).toBe(true);
      expect((bundleAnalyzer as any).isBundleResource('chunk-123.js')).toBe(true);
      expect((bundleAnalyzer as any).isBundleResource('main.bundle.js')).toBe(true);
    });

    it('should identify CSS bundles', () => {
      expect((bundleAnalyzer as any).isBundleResource('styles.css')).toBe(true);
      expect((bundleAnalyzer as any).isBundleResource('main.bundle.css')).toBe(true);
    });

    it('should identify Module Federation resources', () => {
      expect((bundleAnalyzer as any).isBundleResource('remoteEntry.js')).toBe(true);
      expect((bundleAnalyzer as any).isBundleResource('mf-manifest.json')).toBe(true);
    });

    it('should not identify non-bundle resources', () => {
      expect((bundleAnalyzer as any).isBundleResource('image.png')).toBe(false);
      expect((bundleAnalyzer as any).isBundleResource('data.json')).toBe(false);
      expect((bundleAnalyzer as any).isBundleResource('font.woff2')).toBe(false);
    });
  });

  describe('bundle name extraction', () => {
    it('should extract filename from URL', () => {
      const name = (bundleAnalyzer as any).extractBundleName('https://example.com/js/main.bundle.js');
      expect(name).toBe('main.bundle.js');
    });

    it('should remove query parameters', () => {
      const name = (bundleAnalyzer as any).extractBundleName('https://example.com/app.js?v=123');
      expect(name).toBe('app.js');
    });
  });

  describe('bundle type classification', () => {
    it('should classify bundle types correctly', () => {
      expect((bundleAnalyzer as any).getBundleType('remoteEntry.js')).toBe('module-federation');
      expect((bundleAnalyzer as any).getBundleType('mf-manifest.json')).toBe('module-federation');
      expect((bundleAnalyzer as any).getBundleType('main.js')).toBe('javascript');
      expect((bundleAnalyzer as any).getBundleType('styles.css')).toBe('stylesheet');
      expect((bundleAnalyzer as any).getBundleType('other.txt')).toBe('other');
    });
  });

  describe('size categorization', () => {
    it('should categorize bundle sizes correctly', () => {
      expect((bundleAnalyzer as any).categorizeBundleSize(30 * 1024)).toBe('small');  // 30KB
      expect((bundleAnalyzer as any).categorizeBundleSize(100 * 1024)).toBe('medium'); // 100KB
      expect((bundleAnalyzer as any).categorizeBundleSize(500 * 1024)).toBe('large');  // 500KB
      expect((bundleAnalyzer as any).categorizeBundleSize(2 * 1024 * 1024)).toBe('huge'); // 2MB
    });
  });

  describe('compression ratio calculation', () => {
    it('should calculate compression ratio correctly', () => {
      const ratio = (bundleAnalyzer as any).calculateCompressionRatio(1000, 300);
      expect(ratio).toBe(3.33);
    });

    it('should return undefined for zero values', () => {
      expect((bundleAnalyzer as any).calculateCompressionRatio(0, 300)).toBeUndefined();
      expect((bundleAnalyzer as any).calculateCompressionRatio(1000, 0)).toBeUndefined();
    });
  });

  describe('resource analysis', () => {
    it('should analyze performance resource entries', () => {
      const mockResource = {
        name: 'https://example.com/main.bundle.js',
        duration: 150,
        encodedBodySize: 102400, // 100KB
        decodedBodySize: 204800, // 200KB
        transferSize: 102400,
      };

      (bundleAnalyzer as any).analyzeResource(mockResource);

      const bundles = bundleAnalyzer.getBundleInfo();
      expect(bundles).toHaveLength(1);
      expect(bundles[0].name).toBe('main.bundle.js');
      expect(bundles[0].size).toBe(102400);
      expect(bundles[0].loadTime).toBe(150);
      expect(bundles[0].category).toBe('medium');
      expect(bundles[0].compressionRatio).toBe(2);
    });

    it('should detect cached resources', () => {
      const mockCachedResource = {
        name: 'https://example.com/cached.js',
        duration: 5,
        encodedBodySize: 51200,
        transferSize: 0, // Indicates cached resource
      };

      (bundleAnalyzer as any).analyzeResource(mockCachedResource);

      const bundles = bundleAnalyzer.getBundleInfo();
      expect(bundles[0].cached).toBe(true);
    });
  });

  describe('fetch interception', () => {
    it('should analyze fetched bundles', async () => {
      const mockResponse = new Response('bundle content', {
        status: 200,
        headers: {
          'content-length': '51200',
          'content-encoding': 'gzip',
        },
      });
      mockFetch.mockResolvedValue(mockResponse);

      await fetch('https://example.com/app.bundle.js');

      // Wait for async analysis
      await new Promise(resolve => setTimeout(resolve, 10));

      const bundles = bundleAnalyzer.getBundleInfo();
      expect(bundles).toHaveLength(1);
      expect(bundles[0].name).toBe('app.bundle.js');
      expect(bundles[0].size).toBe(51200);
      expect(bundles[0].gzippedSize).toBe(51200);
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      try {
        await fetch('https://example.com/error.js');
      } catch (error) {
        // Expected to throw
      }

      const metrics = monitor.getMetrics();
      const errorMetric = metrics.find(m => m.name === 'bundle_load_error');
      expect(errorMetric).toBeDefined();
      expect(errorMetric?.tags?.error).toBe('Network error');
    });
  });

  describe('metrics recording', () => {
    beforeEach(() => {
      const mockResource = {
        name: 'https://example.com/test.js',
        duration: 100,
        encodedBodySize: 51200,
        transferSize: 51200,
      };
      (bundleAnalyzer as any).analyzeResource(mockResource);
    });

    it('should record bundle metrics', () => {
      const bundleMetrics = bundleAnalyzer.getBundleMetrics();
      expect(bundleMetrics.length).toBeGreaterThan(0);

      const mainMetric = bundleMetrics.find(m => m.name === 'bundle_analysis');
      expect(mainMetric).toBeDefined();
      expect(mainMetric?.bundleName).toBe('test.js');
      expect(mainMetric?.size).toBe(51200);
    });

    it('should record separate size and load time metrics', () => {
      const allMetrics = monitor.getMetrics();

      const sizeMetric = allMetrics.find(m => m.name === 'bundle_size');
      expect(sizeMetric).toBeDefined();

      const loadTimeMetric = allMetrics.find(m => m.name === 'bundle_load_time');
      expect(loadTimeMetric).toBeDefined();
    });
  });

  describe('statistics generation', () => {
    beforeEach(() => {
      // Add multiple bundles for testing
      const bundles = [
        { name: 'small.js', size: 30 * 1024, duration: 50, type: 'javascript' },
        { name: 'medium.js', size: 100 * 1024, duration: 80, type: 'javascript' },
        { name: 'large.js', size: 500 * 1024, duration: 200, type: 'javascript' },
        { name: 'styles.css', size: 20 * 1024, duration: 30, type: 'stylesheet' },
      ];

      bundles.forEach(bundle => {
        (bundleAnalyzer as any).analyzeResource({
          name: `https://example.com/${bundle.name}`,
          duration: bundle.duration,
          encodedBodySize: bundle.size,
          transferSize: bundle.size,
        });
      });
    });

    it('should generate comprehensive statistics', () => {
      const stats = bundleAnalyzer.getBundleStatistics();

      expect(stats.totalBundles).toBe(4);
      expect(stats.categoryDistribution.small).toBe(2);
      expect(stats.categoryDistribution.medium).toBe(1);
      expect(stats.categoryDistribution.large).toBe(1);
      expect(stats.typeDistribution.javascript.count).toBe(3);
      expect(stats.typeDistribution.stylesheet.count).toBe(1);
    });

    it('should calculate averages correctly', () => {
      const stats = bundleAnalyzer.getBundleStatistics();
      expect(stats.avgLoadTime).toBe(90); // (50+80+200+30)/4
    });
  });

  describe('optimization recommendations', () => {
    it('should recommend code splitting for large bundles', () => {
      (bundleAnalyzer as any).analyzeResource({
        name: 'https://example.com/huge.js',
        duration: 300,
        encodedBodySize: 2 * 1024 * 1024, // 2MB
        transferSize: 2 * 1024 * 1024,
      });

      const recommendations = bundleAnalyzer.generateOptimizationRecommendations();
      expect(recommendations.some(r => r.includes('code splitting'))).toBe(true);
    });

    it('should recommend better compression for poorly compressed bundles', () => {
      (bundleAnalyzer as any).analyzeResource({
        name: 'https://example.com/uncompressed.js',
        duration: 100,
        encodedBodySize: 100 * 1024,
        decodedBodySize: 150 * 1024, // Poor compression ratio
        transferSize: 100 * 1024,
      });

      const recommendations = bundleAnalyzer.generateOptimizationRecommendations();
      expect(recommendations.some(r => r.includes('compression'))).toBe(true);
    });

    it('should recommend bundling for too many small files', () => {
      // Add many small bundles
      for (let i = 0; i < 12; i++) {
        (bundleAnalyzer as any).analyzeResource({
          name: `https://example.com/small-${i}.js`,
          duration: 20,
          encodedBodySize: 10 * 1024, // 10KB
          transferSize: 10 * 1024,
        });
      }

      const recommendations = bundleAnalyzer.generateOptimizationRecommendations();
      expect(recommendations.some(r => r.includes('bundling'))).toBe(true);
    });

    it('should recommend caching for uncached resources', () => {
      (bundleAnalyzer as any).analyzeResource({
        name: 'https://example.com/uncached.js',
        duration: 1200,
        encodedBodySize: 100 * 1024,
        transferSize: 100 * 1024, // Not cached
      });

      const recommendations = bundleAnalyzer.generateOptimizationRecommendations();
      expect(recommendations.some(r => r.includes('caching'))).toBe(true);
    });
  });

  describe('byte formatting', () => {
    it('should format bytes correctly', () => {
      expect((bundleAnalyzer as any).formatBytes(0)).toBe('0 B');
      expect((bundleAnalyzer as any).formatBytes(1024)).toBe('1 KB');
      expect((bundleAnalyzer as any).formatBytes(1024 * 1024)).toBe('1 MB');
      expect((bundleAnalyzer as any).formatBytes(1536)).toBe('1.5 KB');
    });
  });

  describe('cleanup', () => {
    it('should clear data and disconnect observer on destroy', () => {
      bundleAnalyzer.destroy();

      const bundles = bundleAnalyzer.getBundleInfo();
      expect(bundles).toHaveLength(0);
    });
  });
});