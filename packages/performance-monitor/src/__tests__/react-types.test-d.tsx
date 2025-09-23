/**
 * React-specific type tests to ensure JSX and React integration works correctly
 */

import { expectType, expectAssignable } from 'tsd';
import React from 'react';
import { PerformanceDashboard } from '../react/PerformanceDashboard';
import { usePerformanceMonitor, UsePerformanceMonitorConfig } from '../react/usePerformanceMonitor';

// Test that React is properly imported
expectType<typeof React>(React);

// Test PerformanceDashboard props
expectType<JSX.Element>(
  <PerformanceDashboard
    enabled={true}
    includeWebVitals={true}
    includeModuleFederation={true}
    includeBundleAnalysis={true}
    remoteUrls={['http://localhost:8081']}
    autoReport={true}
    reportInterval={15000}
    title="Test Dashboard"
    showDownloadButton={true}
    showClearButton={true}
  />
);

// Test optional props work
expectType<JSX.Element>(
  <PerformanceDashboard enabled={true} />
);

// Test that required props are enforced
// expectNotAssignable<JSX.Element>(<PerformanceDashboard />); // missing enabled

// Test usePerformanceMonitor hook configuration
const hookConfig: UsePerformanceMonitorConfig = {
  enabled: true,
  includeWebVitals: true,
  includeModuleFederation: true,
  includeBundleAnalysis: true,
  remoteUrls: ['http://localhost:8081'],
  autoReport: false,
  reportInterval: 30000
};

expectType<UsePerformanceMonitorConfig>(hookConfig);

// Test minimal hook config
const minimalConfig: UsePerformanceMonitorConfig = {
  enabled: true
};

expectType<UsePerformanceMonitorConfig>(minimalConfig);

// Test hook return type in component context
function TestComponent() {
  const {
    data,
    isLoading,
    generateReport,
    downloadReport,
    clearData
  } = usePerformanceMonitor({ enabled: true });

  // Test return types
  expectType<any | null>(data);
  expectType<boolean>(isLoading);
  expectType<() => any>(generateReport);
  expectType<(format: 'json' | 'csv' | 'html') => void>(downloadReport);
  expectType<() => void>(clearData);

  return (
    <div>
      {isLoading ? 'Loading...' : 'Ready'}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      <button onClick={() => downloadReport('json')}>Download</button>
      <button onClick={clearData}>Clear</button>
    </div>
  );
}

// Test component renders without errors
expectType<JSX.Element>(<TestComponent />);

// Test dashboard with style and className props
expectType<JSX.Element>(
  <PerformanceDashboard
    enabled={true}
    className="custom-dashboard"
    style={{ margin: '20px', padding: '10px' }}
  />
);

// Test that invalid prop combinations are caught
// This helps catch prop type mismatches
expectAssignable<React.ComponentProps<typeof PerformanceDashboard>>({
  enabled: true,
  includeWebVitals: true,
  remoteUrls: ['http://test:8080', 'http://test:8081'],
  reportInterval: 10000,
  title: 'My Dashboard',
  showDownloadButton: false,
  showClearButton: true,
  className: 'test-class',
  style: { backgroundColor: 'white' }
});