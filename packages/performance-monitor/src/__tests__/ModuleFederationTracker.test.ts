import { PerformanceMonitor } from '../PerformanceMonitor';
import { ModuleFederationTracker } from '../ModuleFederationTracker';

// Mock fetch
const mockFetch = jest.fn();
Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true,
});

describe('ModuleFederationTracker', () => {
  let monitor: PerformanceMonitor;
  let tracker: ModuleFederationTracker;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ enabled: true });
    tracker = new ModuleFederationTracker(monitor, {
      remoteUrls: ['http://localhost:8081', 'http://localhost:8082']
    });
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    tracker.destroy();
    monitor.destroy();
  });

  describe('initialization', () => {
    it('should create tracker instance', () => {
      expect(tracker).toBeInstanceOf(ModuleFederationTracker);
    });

    it('should accept custom configuration', () => {
      const customTracker = new ModuleFederationTracker(monitor, {
        trackRemoteLoads: false,
        trackChunkLoads: false,
      });
      expect(customTracker).toBeInstanceOf(ModuleFederationTracker);
      customTracker.destroy();
    });
  });

  describe('Module Federation resource detection', () => {
    it('should identify remote entry files', () => {
      const isRemoteEntry = (tracker as any).isModuleFederationResource('http://localhost:8081/remoteEntry.js');
      expect(isRemoteEntry).toBe(true);
    });

    it('should identify manifest files', () => {
      const isManifest = (tracker as any).isModuleFederationResource('http://localhost:8081/mf-manifest.json');
      expect(isManifest).toBe(true);
    });

    it('should identify configured remote URLs', () => {
      const isConfiguredRemote = (tracker as any).isModuleFederationResource('http://localhost:8081/some-chunk.js');
      expect(isConfiguredRemote).toBe(true);
    });

    it('should not identify regular resources', () => {
      const isRegular = (tracker as any).isModuleFederationResource('http://example.com/regular.js');
      expect(isRegular).toBe(false);
    });
  });

  describe('module name extraction', () => {
    it('should extract name from remote entry URL', () => {
      const moduleName = (tracker as any).extractModuleName('http://localhost:8081/remote/remoteEntry.js');
      expect(moduleName).toBe('remote');
    });

    it('should extract name from chunk URL', () => {
      const moduleName = (tracker as any).extractModuleName('http://localhost:8081/chunk-123.js');
      expect(moduleName).toBe('chunk-123');
    });

    it('should return unknown for unrecognized patterns', () => {
      const moduleName = (tracker as any).extractModuleName('http://localhost:8081/');
      expect(moduleName).toBe('unknown');
    });
  });

  describe('fetch interception', () => {
    it('should intercept Module Federation fetches', async () => {
      const mockResponse = new Response('mock content', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      const performanceMark = jest.spyOn(performance, 'mark');
      const performanceMeasure = jest.spyOn(performance, 'measure');

      await fetch('http://localhost:8081/remoteEntry.js');

      expect(performanceMark).toHaveBeenCalledWith(expect.stringContaining('mf_fetch_start_'));
      expect(performanceMark).toHaveBeenCalledWith(expect.stringContaining('mf_fetch_end_'));
      expect(performanceMeasure).toHaveBeenCalledWith(
        expect.stringContaining('mf_fetch_'),
        expect.stringContaining('mf_fetch_start_'),
        expect.stringContaining('mf_fetch_end_')
      );

      const mfMetrics = tracker.getModuleFederationMetrics();
      expect(mfMetrics.length).toBeGreaterThan(0);
      expect(mfMetrics[0].name).toBe('module_federation_fetch');
    });

    it('should track fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      try {
        await fetch('http://localhost:8081/remoteEntry.js');
      } catch (error) {
        // Expected to throw
      }

      const mfMetrics = tracker.getModuleFederationMetrics();
      const errorMetric = mfMetrics.find(m => m.name === 'module_federation_fetch_error');
      expect(errorMetric).toBeDefined();
      expect(errorMetric?.tags?.error).toBe('Network error');
    });

    it('should not intercept non-MF fetches', async () => {
      const mockResponse = new Response('mock content');
      mockFetch.mockResolvedValue(mockResponse);

      await fetch('http://example.com/api/data');

      // Should not create MF metrics
      const mfMetrics = tracker.getModuleFederationMetrics();
      expect(mfMetrics).toHaveLength(0);
    });

    it('should track cached vs first loads', async () => {
      const mockResponse = new Response('mock content', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      // First load
      await fetch('http://localhost:8081/remoteEntry.js');
      // Second load (should be cached)
      await fetch('http://localhost:8081/remoteEntry.js');

      const mfMetrics = tracker.getModuleFederationMetrics();
      expect(mfMetrics).toHaveLength(2);
      expect(mfMetrics[0].loadType).toBe('first');
      expect(mfMetrics[1].loadType).toBe('cached');
    });
  });

  describe('statistics', () => {
    it('should calculate load statistics', async () => {
      const mockResponse = new Response('mock content', { status: 200 });
      mockFetch.mockResolvedValue(mockResponse);

      // Perform some loads
      await fetch('http://localhost:8081/remoteEntry.js');
      await fetch('http://localhost:8081/remoteEntry.js'); // cached
      await fetch('http://localhost:8082/remoteEntry.js');

      const stats = tracker.getLoadStatistics();
      expect(stats.totalLoads).toBe(3);
      expect(stats.firstLoads).toBe(2);
      expect(stats.cachedLoads).toBe(1);
      expect(stats.errors).toBe(0);
      expect(stats.successRate).toBe(100);
      expect(stats.avgFirstLoadTime).toBeGreaterThanOrEqual(0);
      expect(stats.avgCachedLoadTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle error statistics', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      try {
        await fetch('http://localhost:8081/remoteEntry.js');
      } catch (error) {
        // Expected
      }

      const stats = tracker.getLoadStatistics();
      expect(stats.totalLoads).toBe(1);
      expect(stats.errors).toBe(1);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should restore original fetch on destroy', () => {
      const originalFetch = global.fetch;
      tracker.destroy();
      expect(global.fetch).toBe(originalFetch);
    });

    it('should clear internal caches', () => {
      tracker.destroy();
      // Internal caches should be cleared (tested indirectly)
      expect(tracker.getLoadStatistics().totalLoads).toBe(0);
    });
  });
});