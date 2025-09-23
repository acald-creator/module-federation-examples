import { PerformanceMonitor } from './PerformanceMonitor';
import { ModuleFederationMetric } from './types';

export interface ModuleFederationConfig {
  trackRemoteLoads: boolean;
  trackChunkLoads: boolean;
  trackFailures: boolean;
  remoteUrls: string[];
}

export class ModuleFederationTracker {
  private monitor: PerformanceMonitor;
  private config: ModuleFederationConfig;
  private originalFetch: typeof fetch;
  private originalImport: typeof import;
  private loadCache = new Set<string>();
  private pendingLoads = new Map<string, number>();

  constructor(monitor: PerformanceMonitor, config: Partial<ModuleFederationConfig> = {}) {
    this.monitor = monitor;
    this.config = {
      trackRemoteLoads: true,
      trackChunkLoads: true,
      trackFailures: true,
      remoteUrls: [],
      ...config,
    };

    this.originalFetch = window.fetch;
    this.initialize();
  }

  private initialize(): void {
    this.interceptFetch();
    this.interceptDynamicImports();
    this.setupResourceObserver();
    this.trackWebpackChunks();
  }

  private interceptFetch(): void {
    if (!this.config.trackRemoteLoads) return;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (this.isModuleFederationResource(url)) {
        const startTime = performance.now();
        this.monitor.mark(`mf_fetch_start_${url}`);
        this.pendingLoads.set(url, startTime);

        try {
          const response = await this.originalFetch(input, init);
          const endTime = performance.now();
          const duration = endTime - startTime;

          this.monitor.mark(`mf_fetch_end_${url}`);
          this.monitor.measure(`mf_fetch_${url}`, `mf_fetch_start_${url}`, `mf_fetch_end_${url}`);

          this.recordModuleFederationLoad({
            name: 'module_federation_fetch',
            value: duration,
            timestamp: startTime,
            remoteUrl: url,
            moduleName: this.extractModuleName(url),
            loadType: this.loadCache.has(url) ? 'cached' : 'first',
            tags: {
              status: response.status.toString(),
              success: response.ok ? 'true' : 'false',
              size: response.headers.get('content-length') || '0',
            },
          });

          this.loadCache.add(url);
          this.pendingLoads.delete(url);

          return response;
        } catch (error) {
          const endTime = performance.now();
          const duration = endTime - startTime;

          if (this.config.trackFailures) {
            this.recordModuleFederationLoad({
              name: 'module_federation_fetch_error',
              value: duration,
              timestamp: startTime,
              remoteUrl: url,
              moduleName: this.extractModuleName(url),
              loadType: this.loadCache.has(url) ? 'cached' : 'first',
              tags: {
                error: (error as Error).message || 'Unknown error',
                success: 'false',
              },
            });
          }

          this.pendingLoads.delete(url);
          throw error;
        }
      }

      return this.originalFetch(input, init);
    };
  }

  private interceptDynamicImports(): void {
    if (!this.config.trackRemoteLoads || typeof window === 'undefined') return;

    // Intercept webpack's __webpack_require__.f.remotes function if available
    if (typeof (window as any).__webpack_require__ !== 'undefined') {
      const webpackRequire = (window as any).__webpack_require__;

      if (webpackRequire.f && webpackRequire.f.remotes) {
        const originalRemotes = webpackRequire.f.remotes;

        webpackRequire.f.remotes = (chunkId: string, promises: Promise<any>[]) => {
          const startTime = performance.now();
          this.monitor.mark(`mf_remote_start_${chunkId}`);

          const result = originalRemotes.call(this, chunkId, promises);

          // Track when promises resolve
          promises.forEach((promise, index) => {
            if (promise && typeof promise.then === 'function') {
              promise.then(() => {
                const endTime = performance.now();
                const duration = endTime - startTime;

                this.monitor.mark(`mf_remote_end_${chunkId}_${index}`);

                this.recordModuleFederationLoad({
                  name: 'module_federation_remote_load',
                  value: duration,
                  timestamp: startTime,
                  remoteUrl: `webpack://${chunkId}`,
                  moduleName: chunkId,
                  loadType: this.loadCache.has(chunkId) ? 'cached' : 'first',
                  tags: {
                    chunkId,
                    promiseIndex: index.toString(),
                  },
                });

                this.loadCache.add(chunkId);
              }).catch((error) => {
                if (this.config.trackFailures) {
                  const endTime = performance.now();
                  const duration = endTime - startTime;

                  this.recordModuleFederationLoad({
                    name: 'module_federation_remote_error',
                    value: duration,
                    timestamp: startTime,
                    remoteUrl: `webpack://${chunkId}`,
                    moduleName: chunkId,
                    loadType: this.loadCache.has(chunkId) ? 'cached' : 'first',
                    tags: {
                      error: error.message || 'Unknown error',
                      chunkId,
                      promiseIndex: index.toString(),
                    },
                  });
                }
              });
            }
          });

          return result;
        };
      }
    }
  }

  private setupResourceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;

          if (this.isModuleFederationResource(resource.name)) {
            this.recordModuleFederationLoad({
              name: 'module_federation_resource',
              value: resource.duration,
              timestamp: resource.startTime,
              remoteUrl: resource.name,
              moduleName: this.extractModuleName(resource.name),
              loadType: resource.transferSize === 0 ? 'cached' : 'first',
              tags: {
                transferSize: resource.transferSize?.toString() || '0',
                encodedSize: resource.encodedBodySize?.toString() || '0',
                decodedSize: resource.decodedBodySize?.toString() || '0',
                protocol: resource.nextHopProtocol || 'unknown',
                dns: resource.domainLookupEnd - resource.domainLookupStart,
                tcp: resource.connectEnd - resource.connectStart,
                ssl: resource.secureConnectionStart > 0
                  ? resource.connectEnd - resource.secureConnectionStart
                  : 0,
                ttfb: resource.responseStart - resource.requestStart,
                download: resource.responseEnd - resource.responseStart,
              } as Record<string, string>,
            });
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Failed to set up resource observer:', error);
    }
  }

  private trackWebpackChunks(): void {
    if (!this.config.trackChunkLoads || typeof window === 'undefined') return;

    // Monitor webpack chunk loading
    if (typeof (window as any).__webpack_require__ !== 'undefined') {
      const webpackRequire = (window as any).__webpack_require__;

      // Track chunk loading promises
      if (webpackRequire.f && webpackRequire.f.j) {
        const originalJsonp = webpackRequire.f.j;

        webpackRequire.f.j = (chunkId: string, promises: Promise<any>[]) => {
          const startTime = performance.now();
          this.monitor.mark(`webpack_chunk_start_${chunkId}`);

          const result = originalJsonp.call(this, chunkId, promises);

          promises.forEach((promise, index) => {
            if (promise && typeof promise.then === 'function') {
              promise.then(() => {
                const endTime = performance.now();
                const duration = endTime - startTime;

                this.monitor.addMetric({
                  name: 'webpack_chunk_load',
                  value: duration,
                  timestamp: startTime,
                  tags: {
                    chunkId,
                    promiseIndex: index.toString(),
                    type: 'jsonp',
                  },
                });
              }).catch((error) => {
                if (this.config.trackFailures) {
                  const endTime = performance.now();
                  const duration = endTime - startTime;

                  this.monitor.addMetric({
                    name: 'webpack_chunk_error',
                    value: duration,
                    timestamp: startTime,
                    tags: {
                      error: error.message || 'Unknown error',
                      chunkId,
                      promiseIndex: index.toString(),
                      type: 'jsonp',
                    },
                  });
                }
              });
            }
          });

          return result;
        };
      }
    }
  }

  private isModuleFederationResource(url: string): boolean {
    if (url.includes('remoteEntry.js')) return true;
    if (url.includes('mf-manifest.json')) return true;

    return this.config.remoteUrls.some(remoteUrl =>
      url.includes(remoteUrl) || url.startsWith(remoteUrl)
    );
  }

  private extractModuleName(url: string): string {
    if (url.includes('remoteEntry.js')) {
      const parts = url.split('/');
      return parts[parts.length - 2] || 'unknown';
    }

    // Try to extract from webpack chunk names
    const chunkMatch = url.match(/\/([^\/]+)\.js$/);
    if (chunkMatch) {
      return chunkMatch[1];
    }

    return 'unknown';
  }

  private recordModuleFederationLoad(metric: ModuleFederationMetric): void {
    this.monitor.addMetric(metric);
  }

  public getModuleFederationMetrics(): ModuleFederationMetric[] {
    return this.monitor.getMetrics().filter(
      metric => 'remoteUrl' in metric
    ) as ModuleFederationMetric[];
  }

  public getLoadStatistics() {
    const mfMetrics = this.getModuleFederationMetrics();

    const firstLoads = mfMetrics.filter(m => m.loadType === 'first');
    const cachedLoads = mfMetrics.filter(m => m.loadType === 'cached');
    const errors = mfMetrics.filter(m => m.name.includes('error'));

    return {
      totalLoads: mfMetrics.length,
      firstLoads: firstLoads.length,
      cachedLoads: cachedLoads.length,
      errors: errors.length,
      avgFirstLoadTime: firstLoads.length > 0
        ? firstLoads.reduce((sum, m) => sum + m.value, 0) / firstLoads.length
        : 0,
      avgCachedLoadTime: cachedLoads.length > 0
        ? cachedLoads.reduce((sum, m) => sum + m.value, 0) / cachedLoads.length
        : 0,
      successRate: mfMetrics.length > 0
        ? ((mfMetrics.length - errors.length) / mfMetrics.length) * 100
        : 100,
    };
  }

  public destroy(): void {
    // Restore original fetch
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }

    this.loadCache.clear();
    this.pendingLoads.clear();
  }
}