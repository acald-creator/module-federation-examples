import { PerformanceMonitor } from './PerformanceMonitor';
import { BundleMetric } from './types';

export interface BundleAnalyzerConfig {
  trackBundleSizes: boolean;
  trackLoadTimes: boolean;
  trackCompressionRatio: boolean;
  sizeThresholds: {
    small: number;    // < 50KB
    medium: number;   // < 250KB
    large: number;    // < 1MB
    // > 1MB = huge
  };
}

export interface BundleInfo {
  name: string;
  url: string;
  size: number;
  gzippedSize?: number;
  loadTime: number;
  compressionRatio?: number;
  category: 'small' | 'medium' | 'large' | 'huge';
  type: 'javascript' | 'stylesheet' | 'module-federation' | 'other';
  cached: boolean;
}

export class BundleAnalyzer {
  private monitor: PerformanceMonitor;
  private config: BundleAnalyzerConfig;
  private bundles: Map<string, BundleInfo> = new Map();
  private observer?: PerformanceObserver;

  constructor(monitor: PerformanceMonitor, config: Partial<BundleAnalyzerConfig> = {}) {
    this.monitor = monitor;
    this.config = {
      trackBundleSizes: true,
      trackLoadTimes: true,
      trackCompressionRatio: true,
      sizeThresholds: {
        small: 50 * 1024,     // 50KB
        medium: 250 * 1024,   // 250KB
        large: 1024 * 1024,   // 1MB
      },
      ...config,
    };

    this.initialize();
  }

  private initialize(): void {
    this.setupResourceObserver();
    this.interceptFetch();
  }

  private setupResourceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          this.analyzeResource(resource);
        }
      });

      this.observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Failed to set up resource observer for bundle analysis:', error);
    }
  }

  private interceptFetch(): void {
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const startTime = performance.now();

      try {
        const response = await originalFetch(input, init);
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        if (this.isBundleResource(url)) {
          await this.analyzeFetchedBundle(url, response, loadTime);
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        if (this.isBundleResource(url)) {
          this.recordBundleError(url, loadTime, error as Error);
        }

        throw error;
      }
    };
  }

  private analyzeResource(resource: PerformanceResourceTiming): void {
    if (!this.isBundleResource(resource.name)) return;

    const bundleInfo: BundleInfo = {
      name: this.extractBundleName(resource.name),
      url: resource.name,
      size: resource.encodedBodySize || resource.transferSize || 0,
      gzippedSize: resource.transferSize || undefined,
      loadTime: resource.duration,
      compressionRatio: this.calculateCompressionRatio(
        resource.decodedBodySize || 0,
        resource.encodedBodySize || 0
      ),
      category: this.categorizeBundleSize(resource.encodedBodySize || resource.transferSize || 0),
      type: this.getBundleType(resource.name),
      cached: resource.transferSize === 0,
    };

    this.bundles.set(resource.name, bundleInfo);
    this.recordBundleMetric(bundleInfo);
  }

  private async analyzeFetchedBundle(
    url: string,
    response: Response,
    loadTime: number
  ): Promise<void> {
    const contentLength = response.headers.get('content-length');
    const contentEncoding = response.headers.get('content-encoding');
    const size = contentLength ? parseInt(contentLength, 10) : 0;

    const bundleInfo: BundleInfo = {
      name: this.extractBundleName(url),
      url,
      size,
      gzippedSize: contentEncoding ? size : undefined,
      loadTime,
      compressionRatio: contentEncoding ? undefined : 1,
      category: this.categorizeBundleSize(size),
      type: this.getBundleType(url),
      cached: false, // Fetch requests are typically not cached in this context
    };

    this.bundles.set(url, bundleInfo);
    this.recordBundleMetric(bundleInfo);
  }

  private recordBundleError(url: string, loadTime: number, error: Error): void {
    this.monitor.addMetric({
      name: 'bundle_load_error',
      value: loadTime,
      timestamp: performance.now(),
      tags: {
        url,
        bundleName: this.extractBundleName(url),
        error: error.message,
        type: this.getBundleType(url),
      },
    });
  }

  private isBundleResource(url: string): boolean {
    const bundlePatterns = [
      /\.js$/,
      /\.css$/,
      /\.mjs$/,
      /remoteEntry\.js$/,
      /mf-manifest\.json$/,
      /webpack.*\.js$/,
      /chunk.*\.js$/,
      /main.*\.js$/,
      /vendor.*\.js$/,
      /runtime.*\.js$/,
    ];

    return bundlePatterns.some(pattern => pattern.test(url));
  }

  private extractBundleName(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('?')[0]; // Remove query parameters
  }

  private getBundleType(url: string): BundleInfo['type'] {
    if (url.includes('remoteEntry.js') || url.includes('mf-manifest.json')) {
      return 'module-federation';
    }
    if (url.endsWith('.css')) return 'stylesheet';
    if (url.endsWith('.js') || url.endsWith('.mjs')) return 'javascript';
    return 'other';
  }

  private categorizeBundleSize(size: number): BundleInfo['category'] {
    if (size < this.config.sizeThresholds.small) return 'small';
    if (size < this.config.sizeThresholds.medium) return 'medium';
    if (size < this.config.sizeThresholds.large) return 'large';
    return 'huge';
  }

  private calculateCompressionRatio(decodedSize: number, encodedSize: number): number | undefined {
    if (decodedSize === 0 || encodedSize === 0) return undefined;
    return Math.round((decodedSize / encodedSize) * 100) / 100;
  }

  private recordBundleMetric(bundleInfo: BundleInfo): void {
    const bundleMetric: BundleMetric = {
      name: 'bundle_analysis',
      value: bundleInfo.loadTime,
      timestamp: performance.now(),
      bundleName: bundleInfo.name,
      size: bundleInfo.size,
      gzippedSize: bundleInfo.gzippedSize,
      tags: {
        bundleType: bundleInfo.type,
        category: bundleInfo.category,
        cached: bundleInfo.cached.toString(),
        compressionRatio: bundleInfo.compressionRatio?.toString() || 'unknown',
        url: bundleInfo.url,
      },
    };

    this.monitor.addMetric(bundleMetric);

    // Also create specific metrics for different aspects
    if (this.config.trackBundleSizes) {
      this.monitor.addMetric({
        name: 'bundle_size',
        value: bundleInfo.size,
        timestamp: performance.now(),
        tags: {
          bundleName: bundleInfo.name,
          category: bundleInfo.category,
          type: bundleInfo.type,
        },
      });
    }

    if (this.config.trackLoadTimes) {
      this.monitor.addMetric({
        name: 'bundle_load_time',
        value: bundleInfo.loadTime,
        timestamp: performance.now(),
        tags: {
          bundleName: bundleInfo.name,
          cached: bundleInfo.cached.toString(),
          type: bundleInfo.type,
        },
      });
    }

    if (this.config.trackCompressionRatio && bundleInfo.compressionRatio) {
      this.monitor.addMetric({
        name: 'bundle_compression_ratio',
        value: bundleInfo.compressionRatio,
        timestamp: performance.now(),
        tags: {
          bundleName: bundleInfo.name,
          type: bundleInfo.type,
        },
      });
    }
  }

  public getBundleMetrics(): BundleMetric[] {
    return this.monitor.getMetrics().filter(
      metric => 'bundleName' in metric
    ) as BundleMetric[];
  }

  public getBundleInfo(bundleName?: string): BundleInfo[] {
    const bundles = Array.from(this.bundles.values());
    return bundleName
      ? bundles.filter(bundle => bundle.name === bundleName)
      : bundles;
  }

  public getBundleStatistics() {
    const bundles = this.getBundleInfo();
    const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);
    const totalGzippedSize = bundles.reduce((sum, bundle) => sum + (bundle.gzippedSize || 0), 0);

    const byCategory = {
      small: bundles.filter(b => b.category === 'small').length,
      medium: bundles.filter(b => b.category === 'medium').length,
      large: bundles.filter(b => b.category === 'large').length,
      huge: bundles.filter(b => b.category === 'huge').length,
    };

    const byType = {
      javascript: bundles.filter(b => b.type === 'javascript'),
      stylesheet: bundles.filter(b => b.type === 'stylesheet'),
      'module-federation': bundles.filter(b => b.type === 'module-federation'),
      other: bundles.filter(b => b.type === 'other'),
    };

    return {
      totalBundles: bundles.length,
      totalSize: this.formatBytes(totalSize),
      totalGzippedSize: this.formatBytes(totalGzippedSize),
      avgSize: bundles.length > 0 ? this.formatBytes(totalSize / bundles.length) : '0 B',
      avgLoadTime: bundles.length > 0
        ? Math.round(bundles.reduce((sum, b) => sum + b.loadTime, 0) / bundles.length)
        : 0,
      compressionSavings: totalSize > 0 && totalGzippedSize > 0
        ? Math.round(((totalSize - totalGzippedSize) / totalSize) * 100)
        : 0,
      categoryDistribution: byCategory,
      typeDistribution: {
        javascript: {
          count: byType.javascript.length,
          size: this.formatBytes(byType.javascript.reduce((sum, b) => sum + b.size, 0)),
        },
        stylesheet: {
          count: byType.stylesheet.length,
          size: this.formatBytes(byType.stylesheet.reduce((sum, b) => sum + b.size, 0)),
        },
        'module-federation': {
          count: byType['module-federation'].length,
          size: this.formatBytes(byType['module-federation'].reduce((sum, b) => sum + b.size, 0)),
        },
        other: {
          count: byType.other.length,
          size: this.formatBytes(byType.other.reduce((sum, b) => sum + b.size, 0)),
        },
      },
    };
  }

  public generateOptimizationRecommendations(): string[] {
    const bundles = this.getBundleInfo();
    const recommendations: string[] = [];

    // Check for large bundles
    const largeBundles = bundles.filter(b => b.category === 'large' || b.category === 'huge');
    if (largeBundles.length > 0) {
      recommendations.push(
        `Consider code splitting: ${largeBundles.length} bundle(s) are over 250KB (${largeBundles.map(b => b.name).join(', ')})`
      );
    }

    // Check compression ratios
    const poorCompression = bundles.filter(b =>
      b.compressionRatio && b.compressionRatio < 2 && b.size > 50000
    );
    if (poorCompression.length > 0) {
      recommendations.push(
        `Enable better compression: ${poorCompression.length} bundle(s) have poor compression ratios`
      );
    }

    // Check for too many small bundles
    const smallBundles = bundles.filter(b => b.category === 'small');
    if (smallBundles.length > 10) {
      recommendations.push(
        `Consider bundling: ${smallBundles.length} small bundles could be combined to reduce HTTP requests`
      );
    }

    // Check load times
    const slowBundles = bundles.filter(b => b.loadTime > 1000);
    if (slowBundles.length > 0) {
      recommendations.push(
        `Optimize loading: ${slowBundles.length} bundle(s) take over 1s to load (${slowBundles.map(b => b.name).join(', ')})`
      );
    }

    // Check for uncached resources
    const uncachedBundles = bundles.filter(b => !b.cached);
    if (uncachedBundles.length === bundles.length && bundles.length > 0) {
      recommendations.push(
        'Consider implementing proper caching headers for better performance on repeat visits'
      );
    }

    return recommendations;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.bundles.clear();
  }
}