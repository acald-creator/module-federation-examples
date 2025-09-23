/**
 * Core types for performance monitoring
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string> | undefined;
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
  gzippedSize: number | undefined;
}

export interface BundleInfo {
  name: string;
  url: string;
  size: number;
  gzippedSize: number | undefined;
  loadTime: number;
  compressionRatio: number | undefined;
  category: 'small' | 'medium' | 'large' | 'huge';
  type: 'javascript' | 'stylesheet' | 'other' | 'module-federation';
  cached: boolean;
}

export interface Trackers {
  moduleFederation: import('./ModuleFederationTracker').ModuleFederationTracker | undefined;
  webVitals: import('./WebVitalsTracker').WebVitalsTracker | undefined;
  bundleAnalyzer: import('./BundleAnalyzer').BundleAnalyzer | undefined;
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