/**
 * Core types for performance monitoring
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface ModuleFederationMetric extends PerformanceMetric {
  remoteUrl: string;
  moduleName: string;
  loadType: 'first' | 'cached';
}

export interface WebVitalsMetric extends PerformanceMetric {
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface BundleMetric extends PerformanceMetric {
  bundleName: string;
  size: number;
  gzippedSize?: number;
}

export interface PerformanceReport {
  timestamp: number;
  duration: number;
  metrics: PerformanceMetric[];
  summary: {
    totalMetrics: number;
    avgLoadTime: number;
    bundleSize: number;
    webVitalsScore: number;
  };
}