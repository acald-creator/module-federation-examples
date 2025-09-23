/**
 * Type tests using tsd to ensure interfaces work correctly
 * These tests will catch compile-time type issues
 */

import { expectType, expectAssignable, expectNotAssignable } from 'tsd';
import {
  PerformanceMetric,
  ModuleFederationMetric,
  WebVitalsMetric,
  BundleMetric,
  BundleInfo,
  Trackers,
  PerformanceReport
} from '../types';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { ModuleFederationTracker } from '../ModuleFederationTracker';
import { WebVitalsTracker } from '../WebVitalsTracker';
import { BundleAnalyzer } from '../BundleAnalyzer';

// Test PerformanceMetric with exactOptionalPropertyTypes
expectType<PerformanceMetric>({
  name: 'test',
  value: 100,
  timestamp: Date.now(),
  tags: undefined  // Should be allowed
});

expectType<PerformanceMetric>({
  name: 'test',
  value: 100,
  timestamp: Date.now(),
  tags: { type: 'custom' }  // Should be allowed
});

// Test that we can't assign incompatible types
expectNotAssignable<PerformanceMetric>({
  name: 'test',
  value: 'not-a-number' as any,
  timestamp: Date.now(),
  tags: undefined
});

// Test ModuleFederationMetric extension
expectType<ModuleFederationMetric>({
  name: 'mf_test',
  value: 150,
  timestamp: Date.now(),
  tags: undefined,
  remoteUrl: 'http://localhost:8081',
  moduleName: 'TestModule',
  loadType: 'first'
});

// Test WebVitalsMetric extension
expectType<WebVitalsMetric>({
  name: 'cls',
  value: 0.05,
  timestamp: Date.now(),
  tags: undefined,
  rating: 'good'
});

// Test BundleMetric with undefined gzippedSize
expectType<BundleMetric>({
  name: 'bundle_test',
  value: 200,
  timestamp: Date.now(),
  tags: undefined,
  bundleName: 'test.js',
  size: 1024,
  gzippedSize: undefined  // Should be allowed
});

expectType<BundleMetric>({
  name: 'bundle_test',
  value: 200,
  timestamp: Date.now(),
  tags: undefined,
  bundleName: 'test.js',
  size: 1024,
  gzippedSize: 512  // Should be allowed
});

// Test BundleInfo with proper undefined types
expectType<BundleInfo>({
  name: 'test.js',
  url: 'http://example.com/test.js',
  size: 1024,
  gzippedSize: undefined,  // Should be allowed
  loadTime: 50,
  compressionRatio: undefined,  // Should be allowed
  category: 'small',
  type: 'javascript',
  cached: false
});

expectType<BundleInfo>({
  name: 'test.js',
  url: 'http://example.com/test.js',
  size: 1024,
  gzippedSize: 512,  // Should be allowed
  loadTime: 50,
  compressionRatio: 2.0,  // Should be allowed
  category: 'medium',
  type: 'module-federation',
  cached: true
});

// Test Trackers interface with undefined handling
expectType<Trackers>({
  moduleFederation: undefined,
  webVitals: undefined,
  bundleAnalyzer: undefined
});

// Test that actual tracker instances work
declare const monitor: PerformanceMonitor;
declare const mfTracker: ModuleFederationTracker;
declare const webVitalsTracker: WebVitalsTracker;
declare const bundleAnalyzer: BundleAnalyzer;

expectType<Trackers>({
  moduleFederation: mfTracker,
  webVitals: webVitalsTracker,
  bundleAnalyzer: bundleAnalyzer
});

// Test PerformanceReport structure
expectType<PerformanceReport>({
  timestamp: Date.now(),
  duration: 1000,
  metrics: [],
  summary: {
    totalMetrics: 0,
    avgLoadTime: 0,
    bundleSize: 0,
    webVitalsScore: 0
  }
});

// Test metric arrays
const metrics: PerformanceMetric[] = [
  {
    name: 'test1',
    value: 100,
    timestamp: Date.now(),
    tags: undefined
  },
  {
    name: 'test2',
    value: 200,
    timestamp: Date.now(),
    tags: { type: 'custom' }
  }
];

expectType<PerformanceReport>({
  timestamp: Date.now(),
  duration: 1000,
  metrics,
  summary: {
    totalMetrics: metrics.length,
    avgLoadTime: 150,
    bundleSize: 1024,
    webVitalsScore: 85
  }
});

// Test that optional vs undefined distinction works
// This should catch exactOptionalPropertyTypes issues

// These should work
expectAssignable<{ tags: Record<string, string> | undefined }>({
  tags: undefined
});

expectAssignable<{ tags: Record<string, string> | undefined }>({
  tags: { type: 'test' }
});

// Test category and type enums are properly constrained
expectNotAssignable<BundleInfo['category']>('invalid' as any);
expectNotAssignable<BundleInfo['type']>('invalid' as any);
expectNotAssignable<ModuleFederationMetric['loadType']>('invalid' as any);
expectNotAssignable<WebVitalsMetric['rating']>('invalid' as any);