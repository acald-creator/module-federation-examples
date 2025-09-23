import { PerformanceMetric, PerformanceReport } from './types';

export interface PerformanceMonitorConfig {
  enabled: boolean;
  bufferSize: number;
  reportInterval: number;
  autoReport: boolean;
  storageKey: string;
}

export class PerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private startTime: number;
  private reportTimer?: NodeJS.Timeout;

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    this.config = {
      enabled: true,
      bufferSize: 1000,
      reportInterval: 30000, // 30 seconds
      autoReport: false,
      storageKey: 'mf-perf-metrics',
      ...config,
    };

    this.startTime = performance.now();

    if (this.config.enabled) {
      this.initialize();
    }
  }

  private initialize(): void {
    // Set up resource timing observer
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordResourceTiming(entry as PerformanceResourceTiming);
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);

        // Set up navigation timing observer
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordNavigationTiming(entry as PerformanceNavigationTiming);
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);

        // Set up measure observer
        const measureObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMeasure(entry as PerformanceMeasure);
          }
        });
        measureObserver.observe({ entryTypes: ['measure'] });
        this.observers.push(measureObserver);
      } catch (error) {
        console.warn('PerformanceObserver not fully supported:', error);
      }
    }

    if (this.config.autoReport) {
      this.startAutoReporting();
    }
  }

  private recordResourceTiming(entry: PerformanceResourceTiming): void {
    this.addMetric({
      name: 'resource_load',
      value: entry.duration,
      timestamp: entry.startTime,
      tags: {
        name: entry.name,
        type: this.getResourceType(entry.name),
        size: entry.transferSize?.toString() || '0',
        cached: entry.transferSize === 0 ? 'true' : 'false',
      },
    });
  }

  private recordNavigationTiming(entry: PerformanceNavigationTiming): void {
    // Record key navigation metrics
    this.addMetric({
      name: 'dom_content_loaded',
      value: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      timestamp: entry.domContentLoadedEventEnd,
    });

    this.addMetric({
      name: 'load_complete',
      value: entry.loadEventEnd - entry.loadEventStart,
      timestamp: entry.loadEventEnd,
    });

    this.addMetric({
      name: 'time_to_interactive',
      value: entry.domInteractive - entry.navigationStart,
      timestamp: entry.domInteractive,
    });
  }

  private recordMeasure(entry: PerformanceMeasure): void {
    this.addMetric({
      name: entry.name,
      value: entry.duration,
      timestamp: entry.startTime,
      tags: {
        type: 'measure',
      },
    });
  }

  private getResourceType(url: string): string {
    if (url.includes('remoteEntry.js')) return 'module-federation-remote';
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    return 'other';
  }

  public addMetric(metric: PerformanceMetric): void {
    if (!this.config.enabled) return;

    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || performance.now(),
    });

    // Keep buffer size under control
    if (this.metrics.length > this.config.bufferSize) {
      this.metrics = this.metrics.slice(-this.config.bufferSize);
    }
  }

  public mark(name: string, tags?: Record<string, string>): void {
    if (!this.config.enabled) return;

    performance.mark(name);
    this.addMetric({
      name: `mark_${name}`,
      value: performance.now(),
      timestamp: performance.now(),
      tags,
    });
  }

  public measure(name: string, startMark: string, endMark?: string, tags?: Record<string, string>): number {
    if (!this.config.enabled) return 0;

    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure').pop() as PerformanceMeasure;

      if (measure) {
        this.addMetric({
          name,
          value: measure.duration,
          timestamp: measure.startTime,
          tags: { ...tags, type: 'measure' },
        });
        return measure.duration;
      }
    } catch (error) {
      console.warn(`Failed to measure ${name}:`, error);
    }
    return 0;
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  public clearMetrics(): void {
    this.metrics = [];
  }

  public generateReport(): PerformanceReport {
    const now = performance.now();
    const metrics = this.getMetrics();

    return {
      timestamp: Date.now(),
      duration: now - this.startTime,
      metrics,
      summary: this.generateSummary(metrics),
    };
  }

  private generateSummary(metrics: PerformanceMetric[]) {
    const loadTimes = metrics
      .filter(m => m.name.includes('load') || m.name.includes('resource'))
      .map(m => m.value);

    const bundleMetrics = metrics.filter(m =>
      m.tags?.type === 'javascript' || m.tags?.type === 'module-federation-remote'
    );

    return {
      totalMetrics: metrics.length,
      avgLoadTime: loadTimes.length > 0
        ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length
        : 0,
      bundleSize: bundleMetrics.reduce((sum, m) =>
        sum + (parseInt(m.tags?.size || '0') || 0), 0
      ),
      webVitalsScore: 0, // Will be calculated when Web Vitals are integrated
    };
  }

  public startAutoReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }

    this.reportTimer = setInterval(() => {
      const report = this.generateReport();
      this.saveReport(report);
    }, this.config.reportInterval);
  }

  public stopAutoReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = undefined;
    }
  }

  private saveReport(report: PerformanceReport): void {
    try {
      const existingReports = JSON.parse(
        localStorage.getItem(this.config.storageKey) || '[]'
      );
      existingReports.push(report);

      // Keep only last 50 reports
      const reportsToKeep = existingReports.slice(-50);
      localStorage.setItem(this.config.storageKey, JSON.stringify(reportsToKeep));
    } catch (error) {
      console.warn('Failed to save performance report:', error);
    }
  }

  public getStoredReports(): PerformanceReport[] {
    try {
      return JSON.parse(localStorage.getItem(this.config.storageKey) || '[]');
    } catch {
      return [];
    }
  }

  public destroy(): void {
    this.stopAutoReporting();
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.clearMetrics();
  }
}