/**
 * Main type tests for the package
 */

import { expectType } from 'tsd';
import {
  PerformanceMonitor,
  ModuleFederationTracker,
  WebVitalsTracker,
  BundleAnalyzer,
  PerformanceReporter,
  PerformanceDashboard,
  usePerformanceMonitor,
  PerformanceMetric,
  BundleInfo
} from '.';

// Test that main exports are properly typed
expectType<typeof PerformanceMonitor>(PerformanceMonitor);
expectType<typeof ModuleFederationTracker>(ModuleFederationTracker);
expectType<typeof WebVitalsTracker>(WebVitalsTracker);
expectType<typeof BundleAnalyzer>(BundleAnalyzer);
expectType<typeof PerformanceReporter>(PerformanceReporter);
expectType<typeof PerformanceDashboard>(PerformanceDashboard);
expectType<typeof usePerformanceMonitor>(usePerformanceMonitor);

// Test that interfaces are properly exported
const metric: PerformanceMetric = {
  name: 'test',
  value: 100,
  timestamp: Date.now(),
  tags: undefined
};

const bundleInfo: BundleInfo = {
  name: 'test.js',
  url: 'http://example.com/test.js',
  size: 1024,
  gzippedSize: undefined,
  loadTime: 50,
  compressionRatio: undefined,
  category: 'small',
  type: 'javascript',
  cached: false
};

expectType<PerformanceMetric>(metric);
expectType<BundleInfo>(bundleInfo);