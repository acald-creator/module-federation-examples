import { PerformanceMonitor } from './PerformanceMonitor';
import { ModuleFederationTracker } from './ModuleFederationTracker';
import { WebVitalsTracker } from './WebVitalsTracker';
import { BundleAnalyzer } from './BundleAnalyzer';
import { PerformanceReport } from './types';

export interface ReporterConfig {
  includeWebVitals: boolean;
  includeModuleFederation: boolean;
  includeBundleAnalysis: boolean;
  includeRecommendations: boolean;
  exportFormat: 'json' | 'csv' | 'html';
  autoSave: boolean;
  storageKey: string;
}

export interface ComprehensiveReport extends PerformanceReport {
  webVitals?: {
    score: number;
    vitals: Record<string, any>;
    summary: Record<string, number>;
  };
  moduleFederation?: {
    statistics: any;
    metrics: any[];
  };
  bundleAnalysis?: {
    statistics: any;
    metrics: any[];
    recommendations: string[];
  };
  recommendations: string[];
  metadata: {
    reportId: string;
    generatedAt: string;
    userAgent: string;
    url: string;
    sessionDuration: number;
  };
}

export class PerformanceReporter {
  private monitor: PerformanceMonitor;
  private mfTracker: ModuleFederationTracker | undefined;
  private webVitalsTracker: WebVitalsTracker | undefined;
  private bundleAnalyzer: BundleAnalyzer | undefined;
  private config: ReporterConfig;
  private sessionStartTime: number;

  constructor(
    monitor: PerformanceMonitor,
    config: Partial<ReporterConfig> = {}
  ) {
    this.monitor = monitor;
    this.config = {
      includeWebVitals: true,
      includeModuleFederation: true,
      includeBundleAnalysis: true,
      includeRecommendations: true,
      exportFormat: 'json',
      autoSave: false,
      storageKey: 'mf-performance-reports',
      ...config,
    };
    this.sessionStartTime = performance.now();
  }

  public setTrackers(trackers: {
    moduleFederation: ModuleFederationTracker | undefined;
    webVitals: WebVitalsTracker | undefined;
    bundleAnalyzer: BundleAnalyzer | undefined;
  }): void {
    this.mfTracker = trackers.moduleFederation;
    this.webVitalsTracker = trackers.webVitals;
    this.bundleAnalyzer = trackers.bundleAnalyzer;
  }

  public generateComprehensiveReport(): ComprehensiveReport {
    const baseReport = this.monitor.generateReport();

    const report: ComprehensiveReport = {
      ...baseReport,
      recommendations: [],
      metadata: {
        reportId: this.generateReportId(),
        generatedAt: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
        sessionDuration: performance.now() - this.sessionStartTime,
      },
    };

    // Add Web Vitals data
    if (this.config.includeWebVitals && this.webVitalsTracker) {
      const webVitalsReport = this.webVitalsTracker.getWebVitalsReport();
      report.webVitals = webVitalsReport;

      if (webVitalsReport.score < 80) {
        report.recommendations.push(
          `Web Vitals score is ${webVitalsReport.score}/100. Focus on improving Core Web Vitals.`
        );
      }
    }

    // Add Module Federation data
    if (this.config.includeModuleFederation && this.mfTracker) {
      const mfStats = this.mfTracker.getLoadStatistics();
      const mfMetrics = this.mfTracker.getModuleFederationMetrics();

      report.moduleFederation = {
        statistics: mfStats,
        metrics: mfMetrics,
      };

      if (mfStats.successRate < 95) {
        report.recommendations.push(
          `Module Federation success rate is ${mfStats.successRate.toFixed(1)}%. Investigate failed remote loads.`
        );
      }

      if (mfStats.avgFirstLoadTime > 2000) {
        report.recommendations.push(
          `Module Federation first load time is ${mfStats.avgFirstLoadTime.toFixed(0)}ms. Consider optimizing remote entry files.`
        );
      }
    }

    // Add Bundle Analysis data
    if (this.config.includeBundleAnalysis && this.bundleAnalyzer) {
      const bundleStats = this.bundleAnalyzer.getBundleStatistics();
      const bundleMetrics = this.bundleAnalyzer.getBundleMetrics();
      const bundleRecommendations = this.bundleAnalyzer.generateOptimizationRecommendations();

      report.bundleAnalysis = {
        statistics: bundleStats,
        metrics: bundleMetrics,
        recommendations: bundleRecommendations,
      };

      report.recommendations.push(...bundleRecommendations);
    }

    // Add general performance recommendations
    if (this.config.includeRecommendations) {
      report.recommendations.push(...this.generateGeneralRecommendations(report));
    }

    if (this.config.autoSave) {
      this.saveReport(report);
    }

    return report;
  }

  private generateGeneralRecommendations(report: ComprehensiveReport): string[] {
    const recommendations: string[] = [];

    // Check overall load performance
    if (report.summary.avgLoadTime > 3000) {
      recommendations.push(
        'Average resource load time exceeds 3 seconds. Consider implementing performance optimizations.'
      );
    }

    // Check metric collection frequency
    if (report.metrics.length < 10 && report.duration > 30000) {
      recommendations.push(
        'Low metric collection frequency detected. Ensure performance monitoring is properly configured.'
      );
    }

    // Check for error rates
    const errorMetrics = report.metrics.filter(m => m.name.includes('error'));
    if (errorMetrics.length > 0) {
      recommendations.push(
        `${errorMetrics.length} error(s) detected during session. Review error logs and implement error handling.`
      );
    }

    return recommendations;
  }

  private generateReportId(): string {
    return `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public exportReport(report: ComprehensiveReport, format?: 'json' | 'csv' | 'html'): string {
    const exportFormat = format || this.config.exportFormat;

    switch (exportFormat) {
      case 'json':
        return this.exportAsJSON(report);
      case 'csv':
        return this.exportAsCSV(report);
      case 'html':
        return this.exportAsHTML(report);
      default:
        return this.exportAsJSON(report);
    }
  }

  private exportAsJSON(report: ComprehensiveReport): string {
    return JSON.stringify(report, null, 2);
  }

  private exportAsCSV(report: ComprehensiveReport): string {
    const rows: string[] = [];

    // Headers
    rows.push('Type,Name,Value,Timestamp,Tags');

    // Metrics
    report.metrics.forEach(metric => {
      const tags = metric.tags ? Object.entries(metric.tags).map(([k, v]) => `${k}:${v}`).join(';') : '';
      rows.push(`Metric,"${metric.name}",${metric.value},${metric.timestamp},"${tags}"`);
    });

    // Web Vitals
    if (report.webVitals) {
      Object.entries(report.webVitals.vitals).forEach(([name, data]) => {
        rows.push(`WebVital,"${name}",${data.value},${Date.now()},"rating:${data.rating};unit:${data.unit}"`);
      });
    }

    // Bundle Analysis
    if (report.bundleAnalysis?.statistics) {
      const stats = report.bundleAnalysis.statistics;
      rows.push(`BundleStat,"totalBundles",${stats.totalBundles},${Date.now()},""`);
      rows.push(`BundleStat,"avgLoadTime",${stats.avgLoadTime},${Date.now()},"unit:ms"`);
    }

    return rows.join('\n');
  }

  private exportAsHTML(report: ComprehensiveReport): string {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Report - ${report.metadata.reportId}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric-card { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 6px; }
        .score { font-size: 2em; font-weight: bold; }
        .good { color: #22c55e; }
        .warning { color: #f59e0b; }
        .poor { color: #ef4444; }
        .recommendations { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
        th { background: #f9fafb; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Report</h1>
        <p><strong>Report ID:</strong> ${report.metadata.reportId}</p>
        <p><strong>Generated:</strong> ${new Date(report.metadata.generatedAt).toLocaleString()}</p>
        <p><strong>URL:</strong> ${report.metadata.url}</p>
        <p><strong>Session Duration:</strong> ${Math.round(report.metadata.sessionDuration)}ms</p>
    </div>

    ${report.webVitals ? `
    <div class="section">
        <h2>Web Vitals</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="score ${report.webVitals.score >= 80 ? 'good' : report.webVitals.score >= 50 ? 'warning' : 'poor'}">
                    ${report.webVitals.score}/100
                </div>
                <div>Overall Score</div>
            </div>
            ${Object.entries(report.webVitals.vitals).map(([name, data]) => `
            <div class="metric-card">
                <div class="score ${data.rating === 'good' ? 'good' : data.rating === 'needs-improvement' ? 'warning' : 'poor'}">
                    ${data.value}${data.unit === 'score' ? '' : 'ms'}
                </div>
                <div>${name} (${data.rating})</div>
            </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    ${report.recommendations.length > 0 ? `
    <div class="section">
        <h2>Recommendations</h2>
        <div class="recommendations">
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>Summary Statistics</h2>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total Metrics Collected</td><td>${report.summary.totalMetrics}</td></tr>
            <tr><td>Average Load Time</td><td>${Math.round(report.summary.avgLoadTime)}ms</td></tr>
            <tr><td>Total Bundle Size</td><td>${this.formatBytes(report.summary.bundleSize)}</td></tr>
        </table>
    </div>
</body>
</html>`;

    return html.replace(/^\s+/gm, '').replace(/\n\s*\n/g, '\n');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  public saveReport(report: ComprehensiveReport): void {
    try {
      const existingReports = this.getSavedReports();
      existingReports.push(report);

      // Keep only last 20 reports
      const reportsToKeep = existingReports.slice(-20);
      localStorage.setItem(this.config.storageKey, JSON.stringify(reportsToKeep));
    } catch (error) {
      console.warn('Failed to save performance report:', error);
    }
  }

  public getSavedReports(): ComprehensiveReport[] {
    try {
      const saved = localStorage.getItem(this.config.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  public downloadReport(report: ComprehensiveReport, format?: 'json' | 'csv' | 'html'): void {
    const exportFormat = format || this.config.exportFormat;
    const content = this.exportReport(report, exportFormat);

    const mimeTypes = {
      json: 'application/json',
      csv: 'text/csv',
      html: 'text/html',
    };

    const blob = new Blob([content], { type: mimeTypes[exportFormat] });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${report.metadata.reportId}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  public clearSavedReports(): void {
    localStorage.removeItem(this.config.storageKey);
  }
}