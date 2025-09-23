import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import { PerformanceMonitor } from './PerformanceMonitor';
import { WebVitalsMetric } from './types';

export interface WebVitalsConfig {
  trackCLS: boolean;
  trackFID: boolean;
  trackFCP: boolean;
  trackLCP: boolean;
  trackTTFB: boolean;
  reportAllChanges: boolean;
}

export interface WebVitalsThresholds {
  CLS: { good: number; needsImprovement: number };
  FID: { good: number; needsImprovement: number };
  FCP: { good: number; needsImprovement: number };
  LCP: { good: number; needsImprovement: number };
  TTFB: { good: number; needsImprovement: number };
}

export class WebVitalsTracker {
  private monitor: PerformanceMonitor;
  private config: WebVitalsConfig;
  private thresholds: WebVitalsThresholds;
  private vitalsData: Map<string, number> = new Map();

  constructor(monitor: PerformanceMonitor, config: Partial<WebVitalsConfig> = {}) {
    this.monitor = monitor;
    this.config = {
      trackCLS: true,
      trackFID: true,
      trackFCP: true,
      trackLCP: true,
      trackTTFB: true,
      reportAllChanges: false,
      ...config,
    };

    // Web Vitals thresholds based on Google's recommendations
    this.thresholds = {
      CLS: { good: 0.1, needsImprovement: 0.25 },
      FID: { good: 100, needsImprovement: 300 },
      FCP: { good: 1800, needsImprovement: 3000 },
      LCP: { good: 2500, needsImprovement: 4000 },
      TTFB: { good: 800, needsImprovement: 1800 },
    };

    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined') {
      console.warn('WebVitalsTracker: Window not available, skipping initialization');
      return;
    }

    this.setupWebVitalsTracking();
  }

  private setupWebVitalsTracking(): void {
    if (this.config.trackCLS) {
      getCLS((metric) => {
        this.recordWebVital('CLS', metric.value, metric.delta);
      }, { reportAllChanges: this.config.reportAllChanges });
    }

    if (this.config.trackFID) {
      getFID((metric) => {
        this.recordWebVital('FID', metric.value, metric.delta);
      }, { reportAllChanges: this.config.reportAllChanges });
    }

    if (this.config.trackFCP) {
      getFCP((metric) => {
        this.recordWebVital('FCP', metric.value, metric.delta);
      }, { reportAllChanges: this.config.reportAllChanges });
    }

    if (this.config.trackLCP) {
      getLCP((metric) => {
        this.recordWebVital('LCP', metric.value, metric.delta);
      }, { reportAllChanges: this.config.reportAllChanges });
    }

    if (this.config.trackTTFB) {
      getTTFB((metric) => {
        this.recordWebVital('TTFB', metric.value, metric.delta);
      }, { reportAllChanges: this.config.reportAllChanges });
    }
  }

  private recordWebVital(name: string, value: number, delta?: number): void {
    const rating = this.getRating(name, value);
    this.vitalsData.set(name, value);

    const webVitalMetric: WebVitalsMetric = {
      name: `web_vital_${name.toLowerCase()}`,
      value,
      timestamp: performance.now(),
      rating,
      tags: {
        vital: name,
        delta: delta?.toString() || '0',
        unit: this.getUnit(name),
        threshold_good: this.thresholds[name as keyof WebVitalsThresholds].good.toString(),
        threshold_ni: this.thresholds[name as keyof WebVitalsThresholds].needsImprovement.toString(),
      },
    };

    this.monitor.addMetric(webVitalMetric);

    // Also mark the vital for timing measurements
    this.monitor.mark(`web_vital_${name.toLowerCase()}`, {
      value: value.toString(),
      rating,
    });
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = this.thresholds[name as keyof WebVitalsThresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  private getUnit(name: string): string {
    switch (name) {
      case 'CLS':
        return 'score';
      case 'FID':
      case 'FCP':
      case 'LCP':
      case 'TTFB':
        return 'ms';
      default:
        return 'unknown';
    }
  }

  public getCurrentWebVitals(): Record<string, number> {
    return Object.fromEntries(this.vitalsData);
  }

  public getWebVitalsMetrics(): WebVitalsMetric[] {
    return this.monitor.getMetrics().filter(
      metric => 'rating' in metric
    ) as WebVitalsMetric[];
  }

  public calculateWebVitalsScore(): number {
    const vitals = this.getCurrentWebVitals();
    const scores: number[] = [];

    Object.entries(vitals).forEach(([name, value]) => {
      const rating = this.getRating(name, value);
      let score = 0;

      switch (rating) {
        case 'good':
          score = 100;
          break;
        case 'needs-improvement':
          score = 50;
          break;
        case 'poor':
          score = 0;
          break;
      }

      scores.push(score);
    });

    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  public getWebVitalsReport() {
    const vitals = this.getCurrentWebVitals();
    const metrics = this.getWebVitalsMetrics();

    const report = {
      score: this.calculateWebVitalsScore(),
      vitals: {} as Record<string, {
        value: number;
        rating: 'good' | 'needs-improvement' | 'poor';
        unit: string;
        recommendation?: string;
      }>,
      summary: {
        good: 0,
        needsImprovement: 0,
        poor: 0,
      },
      metrics,
    };

    Object.entries(vitals).forEach(([name, value]) => {
      const rating = this.getRating(name, value);
      const unit = this.getUnit(name);

      report.vitals[name] = {
        value,
        rating,
        unit,
        recommendation: this.getRecommendation(name, rating),
      };

      report.summary[rating === 'needs-improvement' ? 'needsImprovement' : rating]++;
    });

    return report;
  }

  private getRecommendation(vital: string, rating: 'good' | 'needs-improvement' | 'poor'): string {
    if (rating === 'good') return 'Performance is good!';

    const recommendations = {
      CLS: {
        'needs-improvement': 'Consider reducing layout shifts by setting dimensions for images and ads',
        'poor': 'Focus on eliminating unexpected layout shifts - set image dimensions, avoid inserting content above existing content'
      },
      FID: {
        'needs-improvement': 'Consider reducing JavaScript execution time and breaking up long tasks',
        'poor': 'Optimize JavaScript execution - reduce bundle size, defer non-critical JS, break up long tasks'
      },
      FCP: {
        'needs-improvement': 'Optimize resource loading and reduce render-blocking resources',
        'poor': 'Focus on faster initial page load - optimize critical resources, reduce server response time'
      },
      LCP: {
        'needs-improvement': 'Optimize your largest content element - images, videos, or text blocks',
        'poor': 'Critical: Optimize largest content paint - compress images, use CDN, improve server response time'
      },
      TTFB: {
        'needs-improvement': 'Consider optimizing server response time and CDN configuration',
        'poor': 'Critical server performance issue - optimize backend, database queries, and CDN setup'
      },
    };

    return recommendations[vital as keyof typeof recommendations]?.[rating] || 'Consider optimizing this metric';
  }

  public onWebVitalsChange(callback: (vitals: Record<string, number>) => void): void {
    // Set up a polling mechanism to check for changes
    const checkInterval = setInterval(() => {
      const currentVitals = this.getCurrentWebVitals();
      if (Object.keys(currentVitals).length > 0) {
        callback(currentVitals);
      }
    }, 1000);

    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        clearInterval(checkInterval);
      });
    }
  }

  public async measureCustomWebVital(
    name: string,
    measureFunction: () => Promise<number> | number
  ): Promise<void> {
    const startTime = performance.now();

    try {
      const value = await measureFunction();
      const endTime = performance.now();

      this.monitor.addMetric({
        name: `custom_web_vital_${name}`,
        value,
        timestamp: startTime,
        tags: {
          type: 'custom',
          duration: (endTime - startTime).toString(),
          custom_vital: name,
        },
      });
    } catch (error) {
      console.warn(`Failed to measure custom web vital ${name}:`, error);
    }
  }

  public destroy(): void {
    this.vitalsData.clear();
  }
}