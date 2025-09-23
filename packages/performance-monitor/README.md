# @mf-examples/performance-monitor

A comprehensive performance monitoring package specifically designed for Module Federation applications. Track Web Vitals, Module Federation loading performance, bundle analysis, and generate detailed reports.

## Features

- 🚀 **Module Federation Tracking**: Monitor remote entry loading, chunk loading, and federation-specific metrics
- 📊 **Web Vitals Integration**: Track Core Web Vitals (CLS, FID, FCP, LCP, TTFB) with automatic scoring
- 📦 **Bundle Analysis**: Analyze bundle sizes, load times, and compression ratios
- 📈 **Comprehensive Reporting**: Generate detailed reports in JSON, CSV, or HTML formats
- ⚛️ **React Integration**: Ready-to-use React components and hooks
- 💾 **Persistent Storage**: Automatic report persistence with configurable retention
- 🎯 **Performance Recommendations**: AI-powered suggestions for optimization

## Installation

```bash
npm install @mf-examples/performance-monitor
# or
pnpm add @mf-examples/performance-monitor
# or
yarn add @mf-examples/performance-monitor
```

## Quick Start

### Basic Usage

```typescript
import {
  PerformanceMonitor,
  ModuleFederationTracker,
  WebVitalsTracker,
  BundleAnalyzer,
  PerformanceReporter
} from '@mf-examples/performance-monitor';

// Initialize core monitor
const monitor = new PerformanceMonitor({
  enabled: true,
  bufferSize: 1000,
  autoReport: false
});

// Add Module Federation tracking
const mfTracker = new ModuleFederationTracker(monitor, {
  remoteUrls: ['http://localhost:8081', 'http://localhost:8082'],
  trackRemoteLoads: true,
  trackChunkLoads: true,
  trackFailures: true
});

// Add Web Vitals tracking
const webVitalsTracker = new WebVitalsTracker(monitor, {
  trackCLS: true,
  trackFID: true,
  trackFCP: true,
  trackLCP: true,
  trackTTFB: true
});

// Add Bundle Analysis
const bundleAnalyzer = new BundleAnalyzer(monitor, {
  trackBundleSizes: true,
  trackLoadTimes: true,
  trackCompressionRatio: true
});

// Create reporter
const reporter = new PerformanceReporter(monitor, {
  includeWebVitals: true,
  includeModuleFederation: true,
  includeBundleAnalysis: true,
  exportFormat: 'json',
  autoSave: false
});

reporter.setTrackers({
  moduleFederation: mfTracker,
  webVitals: webVitalsTracker,
  bundleAnalyzer: bundleAnalyzer
});

// Generate report
const report = reporter.generateComprehensiveReport();
console.log('Performance Report:', report);

// Export report
reporter.downloadReport(report, 'html');
```

### React Integration

```tsx
import React from 'react';
import { PerformanceDashboard } from '@mf-examples/performance-monitor';

function App() {
  return (
    <div>
      <h1>My Module Federation App</h1>

      <PerformanceDashboard
        includeWebVitals={true}
        includeModuleFederation={true}
        includeBundleAnalysis={true}
        remoteUrls={['http://localhost:8081', 'http://localhost:8082']}
        autoReport={true}
        reportInterval={30000}
        title="Performance Dashboard"
        showDownloadButton={true}
        showClearButton={true}
      />

      {/* Your app content */}
    </div>
  );
}
```

### Using the Hook

```tsx
import React from 'react';
import { usePerformanceMonitor } from '@mf-examples/performance-monitor';

function CustomDashboard() {
  const { data, isLoading, generateReport, downloadReport, clearData } = usePerformanceMonitor({
    enabled: true,
    includeWebVitals: true,
    includeModuleFederation: true,
    includeBundleAnalysis: true,
    remoteUrls: ['http://localhost:8081', 'http://localhost:8082'],
    autoReport: true,
    reportInterval: 15000
  });

  if (isLoading) return <div>Loading performance data...</div>;
  if (!data) return <div>No performance data available</div>;

  return (
    <div>
      <h2>Web Vitals Score: {data.webVitalsScore}/100</h2>
      <p>Module Federation Loads: {data.moduleFederation.totalLoads}</p>
      <p>Bundle Count: {data.bundleAnalysis.totalBundles}</p>
      <p>Bundle Size: {data.bundleAnalysis.totalSize}</p>

      <button onClick={() => downloadReport('json')}>Download JSON Report</button>
      <button onClick={() => downloadReport('html')}>Download HTML Report</button>
      <button onClick={clearData}>Clear Data</button>

      {data.recommendations.length > 0 && (
        <div>
          <h3>Recommendations:</h3>
          <ul>
            {data.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## API Reference

### PerformanceMonitor

Core class for collecting and managing performance metrics.

```typescript
const monitor = new PerformanceMonitor({
  enabled: true,              // Enable/disable monitoring
  bufferSize: 1000,          // Maximum metrics to keep in memory
  reportInterval: 30000,     // Auto-report interval (ms)
  autoReport: false,         // Enable auto-reporting
  storageKey: 'mf-perf-metrics' // localStorage key
});

// Add custom metrics
monitor.addMetric({
  name: 'custom_metric',
  value: 150,
  timestamp: performance.now(),
  tags: { type: 'custom', source: 'user' }
});

// Create performance marks and measures
monitor.mark('operation_start');
// ... do work ...
monitor.mark('operation_end');
const duration = monitor.measure('operation_duration', 'operation_start', 'operation_end');

// Get metrics
const allMetrics = monitor.getMetrics();
const specificMetrics = monitor.getMetricsByName('custom_metric');

// Generate basic report
const report = monitor.generateReport();
```

### ModuleFederationTracker

Specialized tracker for Module Federation performance metrics.

```typescript
const mfTracker = new ModuleFederationTracker(monitor, {
  trackRemoteLoads: true,    // Track remote entry loads
  trackChunkLoads: true,     // Track webpack chunk loads
  trackFailures: true,       // Track loading failures
  remoteUrls: [              // URLs to identify as MF resources
    'http://localhost:8081',
    'http://localhost:8082'
  ]
});

// Get Module Federation specific metrics
const mfMetrics = mfTracker.getModuleFederationMetrics();
const stats = mfTracker.getLoadStatistics();

console.log('MF Stats:', {
  totalLoads: stats.totalLoads,
  avgFirstLoadTime: stats.avgFirstLoadTime,
  avgCachedLoadTime: stats.avgCachedLoadTime,
  successRate: stats.successRate,
  errors: stats.errors
});
```

### WebVitalsTracker

Track Core Web Vitals with automatic scoring and recommendations.

```typescript
const webVitalsTracker = new WebVitalsTracker(monitor, {
  trackCLS: true,            // Cumulative Layout Shift
  trackFID: true,            // First Input Delay
  trackFCP: true,            // First Contentful Paint
  trackLCP: true,            // Largest Contentful Paint
  trackTTFB: true,           // Time to First Byte
  reportAllChanges: false    // Report intermediate values
});

// Get current Web Vitals data
const vitals = webVitalsTracker.getCurrentWebVitals();
const score = webVitalsTracker.calculateWebVitalsScore();
const report = webVitalsTracker.getWebVitalsReport();

// Listen for changes
webVitalsTracker.onWebVitalsChange((vitals) => {
  console.log('Web Vitals updated:', vitals);
});

// Measure custom Web Vitals
await webVitalsTracker.measureCustomWebVital('time_to_interactive', async () => {
  // Return the measured value
  return performance.now() - navigationStart;
});
```

### BundleAnalyzer

Analyze bundle sizes, load times, and provide optimization recommendations.

```typescript
const bundleAnalyzer = new BundleAnalyzer(monitor, {
  trackBundleSizes: true,
  trackLoadTimes: true,
  trackCompressionRatio: true,
  sizeThresholds: {
    small: 50 * 1024,      // 50KB
    medium: 250 * 1024,    // 250KB
    large: 1024 * 1024     // 1MB
  }
});

// Get bundle information
const bundles = bundleAnalyzer.getBundleInfo();
const bundleMetrics = bundleAnalyzer.getBundleMetrics();
const stats = bundleAnalyzer.getBundleStatistics();

console.log('Bundle Stats:', {
  totalBundles: stats.totalBundles,
  totalSize: stats.totalSize,
  avgLoadTime: stats.avgLoadTime,
  compressionSavings: stats.compressionSavings
});

// Get optimization recommendations
const recommendations = bundleAnalyzer.generateOptimizationRecommendations();
recommendations.forEach(rec => console.log('💡', rec));
```

### PerformanceReporter

Generate comprehensive reports combining all tracking data.

```typescript
const reporter = new PerformanceReporter(monitor, {
  includeWebVitals: true,
  includeModuleFederation: true,
  includeBundleAnalysis: true,
  includeRecommendations: true,
  exportFormat: 'json',     // 'json' | 'csv' | 'html'
  autoSave: false,
  storageKey: 'mf-performance-reports'
});

// Set trackers
reporter.setTrackers({
  moduleFederation: mfTracker,
  webVitals: webVitalsTracker,
  bundleAnalyzer: bundleAnalyzer
});

// Generate comprehensive report
const report = reporter.generateComprehensiveReport();

// Export in different formats
const jsonReport = reporter.exportReport(report, 'json');
const csvReport = reporter.exportReport(report, 'csv');
const htmlReport = reporter.exportReport(report, 'html');

// Download report
reporter.downloadReport(report, 'html');

// Save/retrieve reports
reporter.saveReport(report);
const savedReports = reporter.getSavedReports();
reporter.clearSavedReports();
```

## Configuration

### Environment Detection

The package automatically detects Module Federation resources based on:
- URLs containing `remoteEntry.js`
- URLs containing `mf-manifest.json`
- URLs matching configured `remoteUrls`
- Webpack chunk patterns

### Performance Thresholds

Web Vitals thresholds follow Google's recommendations:
- **CLS**: Good ≤ 0.1, Poor > 0.25
- **FID**: Good ≤ 100ms, Poor > 300ms
- **FCP**: Good ≤ 1.8s, Poor > 3.0s
- **LCP**: Good ≤ 2.5s, Poor > 4.0s
- **TTFB**: Good ≤ 800ms, Poor > 1.8s

Bundle size categories:
- **Small**: < 50KB
- **Medium**: 50KB - 250KB
- **Large**: 250KB - 1MB
- **Huge**: > 1MB

## Best Practices

### 1. Initialize Early
```typescript
// Initialize monitoring as early as possible in your application
const monitor = new PerformanceMonitor({ enabled: true });
```

### 2. Configure Remote URLs
```typescript
// Provide all your Module Federation remote URLs
const mfTracker = new ModuleFederationTracker(monitor, {
  remoteUrls: [
    'http://localhost:8081',
    'http://localhost:8082',
    'https://cdn.example.com/remotes'
  ]
});
```

### 3. Use Reasonable Buffer Sizes
```typescript
// Balance memory usage with data retention
const monitor = new PerformanceMonitor({
  bufferSize: 1000  // Adjust based on your needs
});
```

### 4. Handle Errors Gracefully
```typescript
try {
  const report = reporter.generateComprehensiveReport();
  // Process report
} catch (error) {
  console.warn('Performance reporting failed:', error);
}
```

### 5. Clean Up Resources
```typescript
// Always clean up when done
useEffect(() => {
  return () => {
    mfTracker.destroy();
    webVitalsTracker.destroy();
    bundleAnalyzer.destroy();
    monitor.destroy();
  };
}, []);
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  PerformanceMetric,
  ModuleFederationMetric,
  WebVitalsMetric,
  BundleMetric,
  PerformanceReport,
  ComprehensiveReport
} from '@mf-examples/performance-monitor';

// All interfaces are fully typed
const metric: PerformanceMetric = {
  name: 'custom_metric',
  value: 100,
  timestamp: performance.now(),
  tags: { source: 'user' }
};
```

## Examples

See the `/examples` directory for complete working examples:
- Basic monitoring setup
- React integration
- Next.js + Module Federation
- Custom metrics and reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- 📚 [Documentation](https://github.com/acald-creator/module-federations-examples)
- 🐛 [Issue Tracker](https://github.com/acald-creator/module-federations-examples/issues)
- 💬 [Discussions](https://github.com/acald-creator/module-federations-examples/discussions)