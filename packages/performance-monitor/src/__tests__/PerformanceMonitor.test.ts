import { PerformanceMonitor } from '../PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({ enabled: true, autoReport: false });
    jest.clearAllMocks();
  });

  afterEach(() => {
    monitor.destroy();
  });

  describe('initialization', () => {
    it('should create instance with default config', () => {
      const defaultMonitor = new PerformanceMonitor();
      expect(defaultMonitor).toBeInstanceOf(PerformanceMonitor);
      defaultMonitor.destroy();
    });

    it('should respect custom config', () => {
      const customMonitor = new PerformanceMonitor({
        bufferSize: 500,
        reportInterval: 60000,
      });
      expect(customMonitor).toBeInstanceOf(PerformanceMonitor);
      customMonitor.destroy();
    });
  });

  describe('metric recording', () => {
    it('should add metrics manually', () => {
      monitor.addMetric({
        name: 'test_metric',
        value: 100,
        timestamp: Date.now(),
      });

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test_metric');
      expect(metrics[0].value).toBe(100);
    });

    it('should respect buffer size limit', () => {
      const smallBufferMonitor = new PerformanceMonitor({ bufferSize: 2 });

      // Add 3 metrics
      smallBufferMonitor.addMetric({ name: 'metric1', value: 1, timestamp: Date.now() });
      smallBufferMonitor.addMetric({ name: 'metric2', value: 2, timestamp: Date.now() });
      smallBufferMonitor.addMetric({ name: 'metric3', value: 3, timestamp: Date.now() });

      const metrics = smallBufferMonitor.getMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics[0].name).toBe('metric2');
      expect(metrics[1].name).toBe('metric3');

      smallBufferMonitor.destroy();
    });

    it('should filter metrics by name', () => {
      monitor.addMetric({ name: 'load_time', value: 100, timestamp: Date.now() });
      monitor.addMetric({ name: 'bundle_size', value: 200, timestamp: Date.now() });
      monitor.addMetric({ name: 'load_time', value: 150, timestamp: Date.now() });

      const loadMetrics = monitor.getMetricsByName('load_time');
      expect(loadMetrics).toHaveLength(2);
      expect(loadMetrics.every(m => m.name === 'load_time')).toBe(true);
    });
  });

  describe('performance marks and measures', () => {
    it('should create performance marks', () => {
      const performanceMark = jest.spyOn(performance, 'mark');

      monitor.mark('test_mark');

      expect(performanceMark).toHaveBeenCalledWith('test_mark');

      const metrics = monitor.getMetrics();
      const markMetric = metrics.find(m => m.name === 'mark_test_mark');
      expect(markMetric).toBeDefined();
    });

    it('should create performance measures', () => {
      const performanceMeasure = jest.spyOn(performance, 'measure');
      const mockMeasure = {
        name: 'test_measure',
        duration: 100,
        startTime: 0,
      };
      jest.spyOn(performance, 'getEntriesByName').mockReturnValue([mockMeasure as any]);

      const duration = monitor.measure('test_measure', 'start', 'end');

      expect(performanceMeasure).toHaveBeenCalledWith('test_measure', 'start', 'end');
      expect(duration).toBe(100);

      const metrics = monitor.getMetrics();
      const measureMetric = metrics.find(m => m.name === 'test_measure');
      expect(measureMetric).toBeDefined();
      expect(measureMetric?.value).toBe(100);
    });
  });

  describe('report generation', () => {
    it('should generate performance report', () => {
      monitor.addMetric({ name: 'test_metric', value: 100, timestamp: Date.now() });

      const report = monitor.generateReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('duration');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('summary');
      expect(report.metrics).toHaveLength(1);
      expect(report.summary.totalMetrics).toBe(1);
    });

    it('should calculate summary correctly', () => {
      monitor.addMetric({
        name: 'resource_load',
        value: 100,
        timestamp: Date.now(),
        tags: { type: 'javascript', size: '1024' }
      });
      monitor.addMetric({
        name: 'resource_load',
        value: 200,
        timestamp: Date.now(),
        tags: { type: 'javascript', size: '2048' }
      });

      const report = monitor.generateReport();
      expect(report.summary.avgLoadTime).toBe(150);
      expect(report.summary.bundleSize).toBe(3072);
    });
  });

  describe('cleanup', () => {
    it('should clear metrics', () => {
      monitor.addMetric({ name: 'test', value: 100, timestamp: Date.now() });
      expect(monitor.getMetrics()).toHaveLength(1);

      monitor.clearMetrics();
      expect(monitor.getMetrics()).toHaveLength(0);
    });

    it('should destroy cleanly', () => {
      const stopReporting = jest.spyOn(monitor as any, 'stopAutoReporting');

      monitor.destroy();

      expect(stopReporting).toHaveBeenCalled();
      expect(monitor.getMetrics()).toHaveLength(0);
    });
  });
});