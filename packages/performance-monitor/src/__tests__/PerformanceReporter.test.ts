import { PerformanceMonitor } from '../PerformanceMonitor';
import { PerformanceReporter } from '../PerformanceReporter';
import { ModuleFederationTracker } from '../ModuleFederationTracker';
import { WebVitalsTracker } from '../WebVitalsTracker';
import { BundleAnalyzer } from '../BundleAnalyzer';

// Mock localStorage
const mockLocalStorage = {
  data: {} as Record<string, string>,
  getItem: jest.fn((key: string) => mockLocalStorage.data[key] || null),
  setItem: jest.fn((key: string, value: string) => { mockLocalStorage.data[key] = value; }),
  removeItem: jest.fn((key: string) => { delete mockLocalStorage.data[key]; }),
  clear: jest.fn(() => { mockLocalStorage.data = {}; }),
};

Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

describe('PerformanceReporter', () => {
  let monitor: PerformanceMonitor;
  let reporter: PerformanceReporter;
  let mfTracker: ModuleFederationTracker;
  let webVitalsTracker: WebVitalsTracker;
  let bundleAnalyzer: BundleAnalyzer;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ enabled: true });
    reporter = new PerformanceReporter(monitor);
    mfTracker = new ModuleFederationTracker(monitor);
    webVitalsTracker = new WebVitalsTracker(monitor);
    bundleAnalyzer = new BundleAnalyzer(monitor);

    reporter.setTrackers({
      moduleFederation: mfTracker,
      webVitals: webVitalsTracker,
      bundleAnalyzer: bundleAnalyzer,
    });

    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  afterEach(() => {
    reporter.clearSavedReports();
    mfTracker.destroy();
    webVitalsTracker.destroy();
    bundleAnalyzer.destroy();
    monitor.destroy();
  });

  describe('initialization', () => {
    it('should create reporter instance', () => {
      expect(reporter).toBeInstanceOf(PerformanceReporter);
    });

    it('should accept custom configuration', () => {
      const customReporter = new PerformanceReporter(monitor, {
        includeWebVitals: false,
        exportFormat: 'csv',
        autoSave: true,
      });
      expect(customReporter).toBeInstanceOf(PerformanceReporter);
    });
  });

  describe('report generation', () => {
    beforeEach(() => {
      // Add some test data
      monitor.addMetric({
        name: 'test_metric',
        value: 100,
        timestamp: performance.now(),
      });
    });

    it('should generate comprehensive report', () => {
      const report = reporter.generateComprehensiveReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('metadata');

      expect(report.metadata).toHaveProperty('reportId');
      expect(report.metadata).toHaveProperty('generatedAt');
      expect(report.metadata).toHaveProperty('userAgent');
      expect(report.metadata).toHaveProperty('url');
      expect(report.metadata).toHaveProperty('sessionDuration');
    });

    it('should include web vitals data when available', () => {
      const mockWebVitalsReport = {
        score: 85,
        vitals: { CLS: { value: 0.05, rating: 'good' as const, unit: 'score' } },
        summary: { good: 1, needsImprovement: 0, poor: 0 },
      };

      jest.spyOn(webVitalsTracker, 'getWebVitalsReport').mockReturnValue(mockWebVitalsReport);

      const report = reporter.generateComprehensiveReport();

      expect(report.webVitals).toEqual(mockWebVitalsReport);
    });

    it('should include module federation data when available', () => {
      const mockMFStats = {
        totalLoads: 5,
        firstLoads: 3,
        cachedLoads: 2,
        errors: 0,
        avgFirstLoadTime: 150,
        avgCachedLoadTime: 50,
        successRate: 100,
      };

      jest.spyOn(mfTracker, 'getLoadStatistics').mockReturnValue(mockMFStats);
      jest.spyOn(mfTracker, 'getModuleFederationMetrics').mockReturnValue([]);

      const report = reporter.generateComprehensiveReport();

      expect(report.moduleFederation?.statistics).toEqual(mockMFStats);
      expect(report.moduleFederation?.metrics).toEqual([]);
    });

    it('should include bundle analysis data when available', () => {
      const mockBundleStats = {
        totalBundles: 3,
        totalSize: '500 KB',
        avgLoadTime: 120,
      };

      const mockRecommendations = ['Consider code splitting for large bundles'];

      jest.spyOn(bundleAnalyzer, 'getBundleStatistics').mockReturnValue(mockBundleStats);
      jest.spyOn(bundleAnalyzer, 'getBundleMetrics').mockReturnValue([]);
      jest.spyOn(bundleAnalyzer, 'generateOptimizationRecommendations').mockReturnValue(mockRecommendations);

      const report = reporter.generateComprehensiveReport();

      expect(report.bundleAnalysis?.statistics).toEqual(mockBundleStats);
      expect(report.bundleAnalysis?.recommendations).toEqual(mockRecommendations);
      expect(report.recommendations).toContain(mockRecommendations[0]);
    });

    it('should generate performance recommendations', () => {
      // Mock slow performance to trigger recommendations
      jest.spyOn(monitor, 'generateReport').mockReturnValue({
        timestamp: Date.now(),
        duration: 35000,
        metrics: [
          { name: 'slow_metric', value: 5000, timestamp: performance.now() },
          { name: 'error_metric', value: 1, timestamp: performance.now() },
        ],
        summary: {
          totalMetrics: 2,
          avgLoadTime: 5000,
          bundleSize: 1000000,
          webVitalsScore: 0,
        },
      });

      const report = reporter.generateComprehensiveReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('load time'))).toBe(true);
    });
  });

  describe('export formats', () => {
    let testReport: any;

    beforeEach(() => {
      testReport = reporter.generateComprehensiveReport();
    });

    it('should export as JSON', () => {
      const json = reporter.exportReport(testReport, 'json');
      const parsed = JSON.parse(json);

      expect(parsed.metadata.reportId).toBe(testReport.metadata.reportId);
      expect(parsed.recommendations).toEqual(testReport.recommendations);
    });

    it('should export as CSV', () => {
      const csv = reporter.exportReport(testReport, 'csv');

      expect(csv).toContain('Type,Name,Value,Timestamp,Tags');
      expect(csv).toContain('Metric');
      expect(typeof csv).toBe('string');
    });

    it('should export as HTML', () => {
      const html = reporter.exportReport(testReport, 'html');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Performance Report');
      expect(html).toContain(testReport.metadata.reportId);
      expect(html).toContain('Summary Statistics');
    });

    it('should default to configured format', () => {
      const customReporter = new PerformanceReporter(monitor, { exportFormat: 'csv' });
      const export1 = customReporter.exportReport(testReport);
      const export2 = customReporter.exportReport(testReport, 'csv');

      expect(export1).toBe(export2);
    });
  });

  describe('report persistence', () => {
    let testReport: any;

    beforeEach(() => {
      testReport = reporter.generateComprehensiveReport();
    });

    it('should save reports to localStorage', () => {
      reporter.saveReport(testReport);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'mf-performance-reports',
        expect.stringContaining(testReport.metadata.reportId)
      );
    });

    it('should retrieve saved reports', () => {
      reporter.saveReport(testReport);
      const savedReports = reporter.getSavedReports();

      expect(savedReports).toHaveLength(1);
      expect(savedReports[0].metadata.reportId).toBe(testReport.metadata.reportId);
    });

    it('should limit saved reports to 20', () => {
      // Generate 25 reports
      for (let i = 0; i < 25; i++) {
        const report = { ...testReport, metadata: { ...testReport.metadata, reportId: `report-${i}` } };
        reporter.saveReport(report);
      }

      const savedReports = reporter.getSavedReports();
      expect(savedReports).toHaveLength(20);
      expect(savedReports[0].metadata.reportId).toBe('report-5'); // First 5 should be discarded
    });

    it('should clear saved reports', () => {
      reporter.saveReport(testReport);
      reporter.clearSavedReports();

      const savedReports = reporter.getSavedReports();
      expect(savedReports).toHaveLength(0);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mf-performance-reports');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      expect(() => reporter.saveReport(testReport)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save performance report:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('auto-save functionality', () => {
    it('should auto-save when enabled', () => {
      const autoSaveReporter = new PerformanceReporter(monitor, { autoSave: true });
      const saveSpy = jest.spyOn(autoSaveReporter, 'saveReport');

      autoSaveReporter.generateComprehensiveReport();

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should not auto-save when disabled', () => {
      const noAutoSaveReporter = new PerformanceReporter(monitor, { autoSave: false });
      const saveSpy = jest.spyOn(noAutoSaveReporter, 'saveReport');

      noAutoSaveReporter.generateComprehensiveReport();

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('report ID generation', () => {
    it('should generate unique report IDs', () => {
      const report1 = reporter.generateComprehensiveReport();
      const report2 = reporter.generateComprehensiveReport();

      expect(report1.metadata.reportId).not.toBe(report2.metadata.reportId);
      expect(report1.metadata.reportId).toMatch(/^perf-\d+-[a-z0-9]+$/);
    });
  });

  describe('byte formatting', () => {
    it('should format bytes correctly', () => {
      const formatBytes = (reporter as any).formatBytes;

      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });
});