# Changelog

All notable changes to the `@mf-examples/performance-monitor` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-09-23

### Added
- Initial release of the Module Federation Performance Monitor package
- Core `PerformanceMonitor` class for metric collection and management
- `ModuleFederationTracker` for monitoring MF-specific performance metrics
- `WebVitalsTracker` with Core Web Vitals integration (CLS, FID, FCP, LCP, TTFB)
- `BundleAnalyzer` for bundle size and performance analysis
- `PerformanceReporter` for comprehensive report generation
- React integration with `usePerformanceMonitor` hook
- `PerformanceDashboard` React component for real-time monitoring
- Multiple export formats: JSON, CSV, and HTML reports
- Persistent storage with localStorage integration
- Performance recommendations based on collected metrics
- TypeScript support with comprehensive type definitions
- Comprehensive test suite with integration and performance tests

### Features
- **Module Federation Monitoring**
  - Remote entry file load tracking
  - Webpack chunk loading performance
  - First load vs cached load differentiation
  - Module Federation success rate tracking
  - Detailed network timing metrics (DNS, TCP, SSL, TTFB)

- **Web Vitals Integration**
  - Automatic Core Web Vitals collection
  - Google-recommended thresholds and scoring
  - Real-time performance ratings (good/needs-improvement/poor)
  - Custom Web Vitals measurement support

- **Bundle Analysis**
  - Automatic bundle size categorization
  - Compression ratio analysis
  - Load time tracking per bundle
  - Optimization recommendations generation
  - Support for various bundle types (JS, CSS, MF remotes)

- **Comprehensive Reporting**
  - Multi-format export (JSON/CSV/HTML)
  - Performance recommendations
  - Historical data storage
  - Interactive HTML reports with styling
  - Configurable report components

- **React Integration**
  - Ready-to-use dashboard component
  - Performant React hook with cleanup
  - Real-time data updates
  - Configurable refresh intervals
  - Download functionality

- **Developer Experience**
  - Full TypeScript support
  - Comprehensive documentation
  - Performance optimized for production use
  - Memory efficient with configurable buffer sizes
  - Error handling and graceful degradation