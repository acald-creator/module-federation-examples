import { useEffect, useState, useRef, useCallback } from 'react';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { ModuleFederationTracker } from '../ModuleFederationTracker';
import { WebVitalsTracker } from '../WebVitalsTracker';
import { BundleAnalyzer } from '../BundleAnalyzer';
import { PerformanceReporter, ComprehensiveReport } from '../PerformanceReporter';

export interface UsePerformanceMonitorConfig {
  enabled?: boolean;
  autoReport?: boolean;
  reportInterval?: number;
  includeWebVitals?: boolean;
  includeModuleFederation?: boolean;
  includeBundleAnalysis?: boolean;
  remoteUrls?: string[];
}

export interface PerformanceData {
  webVitals: Record<string, number>;
  webVitalsScore: number;
  moduleFederation: {
    totalLoads: number;
    avgLoadTime: number;
    successRate: number;
    errors: number;
  };
  bundleAnalysis: {
    totalBundles: number;
    totalSize: string;
    avgLoadTime: number;
  };
  recommendations: string[];
}

export interface UsePerformanceMonitorReturn {
  data: PerformanceData | null;
  isLoading: boolean;
  generateReport: () => ComprehensiveReport | null;
  downloadReport: (format?: 'json' | 'csv' | 'html') => void;
  clearData: () => void;
}

export function usePerformanceMonitor(
  config: UsePerformanceMonitorConfig = {}
): UsePerformanceMonitorReturn {
  const {
    enabled = true,
    autoReport = true,
    reportInterval = 30000,
    includeWebVitals = true,
    includeModuleFederation = true,
    includeBundleAnalysis = true,
    remoteUrls = [],
  } = config;

  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const mfTrackerRef = useRef<ModuleFederationTracker | null>(null);
  const webVitalsTrackerRef = useRef<WebVitalsTracker | null>(null);
  const bundleAnalyzerRef = useRef<BundleAnalyzer | null>(null);
  const reporterRef = useRef<PerformanceReporter | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const initializeMonitoring = useCallback(() => {
    if (!enabled || monitorRef.current) return;

    try {
      // Initialize core monitor
      monitorRef.current = new PerformanceMonitor({
        enabled: true,
        bufferSize: 1000,
        autoReport: false,
      });

      // Initialize trackers based on config
      if (includeModuleFederation) {
        mfTrackerRef.current = new ModuleFederationTracker(monitorRef.current, {
          remoteUrls,
          trackRemoteLoads: true,
          trackChunkLoads: true,
          trackFailures: true,
        });
      }

      if (includeWebVitals) {
        webVitalsTrackerRef.current = new WebVitalsTracker(monitorRef.current, {
          trackCLS: true,
          trackFID: true,
          trackFCP: true,
          trackLCP: true,
          trackTTFB: true,
          reportAllChanges: false,
        });
      }

      if (includeBundleAnalysis) {
        bundleAnalyzerRef.current = new BundleAnalyzer(monitorRef.current, {
          trackBundleSizes: true,
          trackLoadTimes: true,
          trackCompressionRatio: true,
        });
      }

      // Initialize reporter
      reporterRef.current = new PerformanceReporter(monitorRef.current, {
        includeWebVitals,
        includeModuleFederation,
        includeBundleAnalysis,
        includeRecommendations: true,
        autoSave: false,
      });

      reporterRef.current.setTrackers({
        moduleFederation: mfTrackerRef.current || undefined,
        webVitals: webVitalsTrackerRef.current || undefined,
        bundleAnalyzer: bundleAnalyzerRef.current || undefined,
      });

      setIsLoading(false);
    } catch (error) {
      console.warn('Failed to initialize performance monitoring:', error);
      setIsLoading(false);
    }
  }, [enabled, includeWebVitals, includeModuleFederation, includeBundleAnalysis, remoteUrls]);

  const updateData = useCallback(() => {
    if (!monitorRef.current || !reporterRef.current) return;

    try {
      const webVitals = webVitalsTrackerRef.current?.getCurrentWebVitals() || {};
      const webVitalsScore = webVitalsTrackerRef.current?.calculateWebVitalsScore() || 0;

      const mfStats = mfTrackerRef.current?.getLoadStatistics() || {
        totalLoads: 0,
        avgFirstLoadTime: 0,
        successRate: 100,
        errors: 0,
      };

      const bundleStats = bundleAnalyzerRef.current?.getBundleStatistics() || {
        totalBundles: 0,
        totalSize: '0 B',
        avgLoadTime: 0,
      };

      const bundleRecommendations = bundleAnalyzerRef.current?.generateOptimizationRecommendations() || [];

      setData({
        webVitals,
        webVitalsScore,
        moduleFederation: {
          totalLoads: mfStats.totalLoads,
          avgLoadTime: Math.round(mfStats.avgFirstLoadTime || 0),
          successRate: Math.round(mfStats.successRate),
          errors: mfStats.errors,
        },
        bundleAnalysis: {
          totalBundles: bundleStats.totalBundles,
          totalSize: bundleStats.totalSize,
          avgLoadTime: bundleStats.avgLoadTime,
        },
        recommendations: bundleRecommendations,
      });
    } catch (error) {
      console.warn('Failed to update performance data:', error);
    }
  }, []);

  const generateReport = useCallback((): ComprehensiveReport | null => {
    if (!reporterRef.current) return null;

    try {
      return reporterRef.current.generateComprehensiveReport();
    } catch (error) {
      console.warn('Failed to generate performance report:', error);
      return null;
    }
  }, []);

  const downloadReport = useCallback((format: 'json' | 'csv' | 'html' = 'json') => {
    const report = generateReport();
    if (!report || !reporterRef.current) return;

    try {
      reporterRef.current.downloadReport(report, format);
    } catch (error) {
      console.warn('Failed to download performance report:', error);
    }
  }, [generateReport]);

  const clearData = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.clearMetrics();
    }
    setData(null);
  }, []);

  // Initialize monitoring
  useEffect(() => {
    initializeMonitoring();

    return () => {
      // Cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      mfTrackerRef.current?.destroy();
      webVitalsTrackerRef.current?.destroy();
      bundleAnalyzerRef.current?.destroy();
      monitorRef.current?.destroy();

      mfTrackerRef.current = null;
      webVitalsTrackerRef.current = null;
      bundleAnalyzerRef.current = null;
      monitorRef.current = null;
      reporterRef.current = null;
    };
  }, [initializeMonitoring]);

  // Set up auto-reporting
  useEffect(() => {
    if (!autoReport || !enabled || isLoading) return;

    intervalRef.current = setInterval(updateData, reportInterval);

    // Initial data update
    const timer = setTimeout(updateData, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearTimeout(timer);
    };
  }, [autoReport, enabled, isLoading, reportInterval, updateData]);

  return {
    data,
    isLoading,
    generateReport,
    downloadReport,
    clearData,
  };
}