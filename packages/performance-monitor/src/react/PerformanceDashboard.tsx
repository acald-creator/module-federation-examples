import React from 'react';
import { usePerformanceMonitor, UsePerformanceMonitorConfig } from './usePerformanceMonitor';

interface PerformanceDashboardProps extends UsePerformanceMonitorConfig {
  title?: string;
  showDownloadButton?: boolean;
  showClearButton?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '10px',
  } as React.CSSProperties,
  title: {
    margin: 0,
    color: '#1a202c',
    fontSize: '1.5rem',
    fontWeight: 600,
  } as React.CSSProperties,
  buttons: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  button: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  } as React.CSSProperties,
  buttonHover: {
    backgroundColor: '#f3f4f6',
    borderColor: '#9ca3af',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,
  cardTitle: {
    margin: '0 0 12px 0',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#374151',
  } as React.CSSProperties,
  metric: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  } as React.CSSProperties,
  metricLabel: {
    color: '#6b7280',
    fontSize: '0.875rem',
  } as React.CSSProperties,
  metricValue: {
    fontWeight: 600,
    fontSize: '0.875rem',
  } as React.CSSProperties,
  good: { color: '#059669' },
  warning: { color: '#d97706' },
  poor: { color: '#dc2626' },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#6b7280',
  },
  recommendations: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '20px',
  } as React.CSSProperties,
  recommendationsTitle: {
    margin: '0 0 12px 0',
    color: '#92400e',
    fontSize: '1rem',
    fontWeight: 600,
  } as React.CSSProperties,
  recommendationsList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#92400e',
  } as React.CSSProperties,
  noData: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#6b7280',
    fontStyle: 'italic' as const,
  },
};

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  title = 'Performance Monitor',
  showDownloadButton = true,
  showClearButton = true,
  className,
  style,
  ...config
}) => {
  const { data, isLoading, downloadReport, clearData } = usePerformanceMonitor(config);

  const getScoreColor = (score: number) => {
    if (score >= 80) return styles.good;
    if (score >= 50) return styles.warning;
    return styles.poor;
  };

  const getWebVitalColor = (vital: string, value: number) => {
    const thresholds: Record<string, { good: number; poor: number }> = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[vital];
    if (!threshold) return styles.good;

    if (value <= threshold.good) return styles.good;
    if (value <= threshold.poor) return styles.warning;
    return styles.poor;
  };

  const formatWebVitalValue = (vital: string, value: number) => {
    if (vital === 'CLS') return value.toFixed(3);
    return `${Math.round(value)}ms`;
  };

  if (isLoading) {
    return (
      <div className={className} style={{ ...styles.container, ...style }}>
        <div style={styles.loading}>
          Loading performance data...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={className} style={{ ...styles.container, ...style }}>
        <div style={styles.noData}>
          No performance data available yet. Metrics will appear as your application runs.
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ ...styles.container, ...style }}>
      <div style={styles.header}>
        <h2 style={styles.title}>{title}</h2>
        <div style={styles.buttons}>
          {showDownloadButton && (
            <>
              <button
                style={styles.button}
                onClick={() => downloadReport('json')}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.buttonHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.button)}
              >
                Download JSON
              </button>
              <button
                style={styles.button}
                onClick={() => downloadReport('html')}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.buttonHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.button)}
              >
                Download HTML
              </button>
            </>
          )}
          {showClearButton && (
            <button
              style={styles.button}
              onClick={clearData}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.buttonHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.button)}
            >
              Clear Data
            </button>
          )}
        </div>
      </div>

      <div style={styles.grid}>
        {/* Web Vitals Card */}
        {config.includeWebVitals !== false && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Web Vitals</h3>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Overall Score</span>
              <span style={{ ...styles.metricValue, ...getScoreColor(data.webVitalsScore) }}>
                {data.webVitalsScore}/100
              </span>
            </div>
            {Object.entries(data.webVitals).map(([vital, value]) => (
              <div key={vital} style={styles.metric}>
                <span style={styles.metricLabel}>{vital}</span>
                <span style={{ ...styles.metricValue, ...getWebVitalColor(vital, value) }}>
                  {formatWebVitalValue(vital, value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Module Federation Card */}
        {config.includeModuleFederation !== false && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Module Federation</h3>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Total Loads</span>
              <span style={styles.metricValue}>{data.moduleFederation.totalLoads}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Avg Load Time</span>
              <span style={styles.metricValue}>{data.moduleFederation.avgLoadTime}ms</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Success Rate</span>
              <span style={{
                ...styles.metricValue,
                ...getScoreColor(data.moduleFederation.successRate)
              }}>
                {data.moduleFederation.successRate}%
              </span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Errors</span>
              <span style={{
                ...styles.metricValue,
                ...(data.moduleFederation.errors > 0 ? styles.poor : styles.good)
              }}>
                {data.moduleFederation.errors}
              </span>
            </div>
          </div>
        )}

        {/* Bundle Analysis Card */}
        {config.includeBundleAnalysis !== false && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Bundle Analysis</h3>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Total Bundles</span>
              <span style={styles.metricValue}>{data.bundleAnalysis.totalBundles}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Total Size</span>
              <span style={styles.metricValue}>{data.bundleAnalysis.totalSize}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.metricLabel}>Avg Load Time</span>
              <span style={styles.metricValue}>{data.bundleAnalysis.avgLoadTime}ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div style={styles.recommendations}>
          <h3 style={styles.recommendationsTitle}>Performance Recommendations</h3>
          <ul style={styles.recommendationsList}>
            {data.recommendations.slice(0, 5).map((recommendation, index) => (
              <li key={index}>{recommendation}</li>
            ))}
            {data.recommendations.length > 5 && (
              <li>And {data.recommendations.length - 5} more recommendations...</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};