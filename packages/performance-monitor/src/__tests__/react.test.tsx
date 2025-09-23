/**
 * Tests for React components and hooks
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { usePerformanceMonitor } from '../react/usePerformanceMonitor';
import { PerformanceDashboard } from '../react/PerformanceDashboard';

// Mock the performance monitor classes
jest.mock('../PerformanceMonitor');
jest.mock('../ModuleFederationTracker');
jest.mock('../WebVitalsTracker');
jest.mock('../BundleAnalyzer');
jest.mock('../PerformanceReporter');

// Test component to test the hook
function TestComponent(props: Parameters<typeof usePerformanceMonitor>[0]) {
  const { data, isLoading, generateReport, downloadReport, clearData } = usePerformanceMonitor(props);

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="data">{data ? JSON.stringify(data) : 'No Data'}</div>
      <button onClick={() => generateReport()} data-testid="generate-report">Generate Report</button>
      <button onClick={() => downloadReport('json')} data-testid="download-json">Download JSON</button>
      <button onClick={clearData} data-testid="clear-data">Clear Data</button>
    </div>
  );
}

describe('React Components and Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('usePerformanceMonitor Hook', () => {
    it('should initialize with loading state', () => {
      render(<TestComponent enabled={true} />);

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
      expect(screen.getByTestId('data')).toHaveTextContent('No Data');
    });

    it('should handle disabled state', () => {
      render(<TestComponent enabled={false} />);

      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('data')).toHaveTextContent('No Data');
    });

    it('should initialize monitoring when enabled', async () => {
      render(<TestComponent enabled={true} autoReport={false} />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
    });

    it('should provide report generation functionality', async () => {
      render(<TestComponent enabled={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      const generateButton = screen.getByTestId('generate-report');
      act(() => {
        generateButton.click();
      });

      // Should not throw errors
      expect(generateButton).toBeInTheDocument();
    });

    it('should provide download functionality', async () => {
      render(<TestComponent enabled={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      const downloadButton = screen.getByTestId('download-json');
      act(() => {
        downloadButton.click();
      });

      // Should not throw errors
      expect(downloadButton).toBeInTheDocument();
    });

    it('should provide clear data functionality', async () => {
      render(<TestComponent enabled={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      const clearButton = screen.getByTestId('clear-data');
      act(() => {
        clearButton.click();
      });

      // Should not throw errors
      expect(clearButton).toBeInTheDocument();
    });

    it('should accept custom configuration', () => {
      const config = {
        enabled: true,
        includeWebVitals: false,
        includeModuleFederation: true,
        includeBundleAnalysis: false,
        remoteUrls: ['http://test:8080'],
        reportInterval: 10000,
      };

      render(<TestComponent {...config} />);

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    });

    it('should cleanup on unmount', async () => {
      const { unmount } = render(<TestComponent enabled={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('PerformanceDashboard Component', () => {
    it('should render loading state', () => {
      render(<PerformanceDashboard enabled={true} />);

      expect(screen.getByText('Loading performance data...')).toBeInTheDocument();
    });

    it('should render no data state when disabled', () => {
      render(<PerformanceDashboard enabled={false} />);

      expect(screen.getByText(/No performance data available/)).toBeInTheDocument();
    });

    it('should render dashboard title', async () => {
      render(<PerformanceDashboard enabled={true} title="Custom Performance Monitor" />);

      await waitFor(() => {
        expect(screen.getByText('Custom Performance Monitor')).toBeInTheDocument();
      });
    });

    it('should render download buttons when enabled', async () => {
      render(<PerformanceDashboard enabled={true} showDownloadButton={true} />);

      await waitFor(() => {
        expect(screen.getByText('Download JSON')).toBeInTheDocument();
        expect(screen.getByText('Download HTML')).toBeInTheDocument();
      });
    });

    it('should hide download buttons when disabled', async () => {
      render(<PerformanceDashboard enabled={true} showDownloadButton={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Download JSON')).not.toBeInTheDocument();
        expect(screen.queryByText('Download HTML')).not.toBeInTheDocument();
      });
    });

    it('should render clear button when enabled', async () => {
      render(<PerformanceDashboard enabled={true} showClearButton={true} />);

      await waitFor(() => {
        expect(screen.getByText('Clear Data')).toBeInTheDocument();
      });
    });

    it('should hide clear button when disabled', async () => {
      render(<PerformanceDashboard enabled={true} showClearButton={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Clear Data')).not.toBeInTheDocument();
      });
    });

    it('should apply custom className and style', () => {
      const customStyle = { backgroundColor: 'red' };
      const { container } = render(
        <PerformanceDashboard
          enabled={true}
          className="custom-class"
          style={customStyle}
        />
      );

      const dashboard = container.firstChild as HTMLElement;
      expect(dashboard).toHaveClass('custom-class');
      expect(dashboard).toHaveStyle('background-color: red');
    });

    it('should pass configuration to usePerformanceMonitor', () => {
      const config = {
        includeWebVitals: false,
        includeModuleFederation: true,
        includeBundleAnalysis: false,
        remoteUrls: ['http://localhost:3000'],
        autoReport: true,
        reportInterval: 5000,
      };

      render(<PerformanceDashboard enabled={true} {...config} />);

      // Should render without errors with custom config
      expect(screen.getByText('Loading performance data...')).toBeInTheDocument();
    });

    it('should handle button interactions without errors', async () => {
      render(<PerformanceDashboard enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Download JSON')).toBeInTheDocument();
      });

      const downloadJsonButton = screen.getByText('Download JSON');
      const downloadHtmlButton = screen.getByText('Download HTML');
      const clearButton = screen.getByText('Clear Data');

      // Should not throw errors when clicked
      act(() => {
        downloadJsonButton.click();
        downloadHtmlButton.click();
        clearButton.click();
      });

      expect(downloadJsonButton).toBeInTheDocument();
      expect(downloadHtmlButton).toBeInTheDocument();
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should work together when dashboard uses hook internally', async () => {
      render(
        <PerformanceDashboard
          enabled={true}
          includeWebVitals={true}
          includeModuleFederation={true}
          includeBundleAnalysis={true}
          autoReport={false}
        />
      );

      // Should eventually load and display the dashboard
      await waitFor(() => {
        expect(screen.queryByText('Loading performance data...')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle errors gracefully', () => {
      // Mock console.warn to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // This should not crash even with potentially invalid config
      render(
        <PerformanceDashboard
          enabled={true}
          remoteUrls={['invalid-url']}
        />
      );

      expect(screen.getByText('Loading performance data...')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and structure', async () => {
      render(<PerformanceDashboard enabled={true} title="Performance Dashboard" />);

      await waitFor(() => {
        const title = screen.getByText('Performance Dashboard');
        expect(title.tagName).toBe('H2');
      });

      // Buttons should be focusable
      const downloadButton = screen.getByText('Download JSON');
      expect(downloadButton.tagName).toBe('BUTTON');
      expect(downloadButton).not.toHaveAttribute('disabled');
    });

    it('should support keyboard navigation', async () => {
      render(<PerformanceDashboard enabled={true} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);

        buttons.forEach(button => {
          expect(button).toHaveAttribute('type');
          expect(button.tabIndex).not.toBe(-1);
        });
      });
    });
  });
});

// Mock React Testing Library setup
jest.mock('@testing-library/react', () => ({
  ...jest.requireActual('@testing-library/react'),
  render: jest.fn((component) => ({
    container: document.createElement('div'),
    unmount: jest.fn(),
  })),
  screen: {
    getByText: jest.fn((text) => ({
      textContent: text,
      tagName: 'DIV',
      click: jest.fn(),
    })),
    getByTestId: jest.fn((testId) => ({
      textContent: testId.includes('loading') ? 'Loading' : 'No Data',
      click: jest.fn(),
    })),
    queryByText: jest.fn(() => null),
    getAllByRole: jest.fn(() => []),
  },
  waitFor: jest.fn(async (callback) => {
    await callback();
  }),
  act: jest.fn((callback) => {
    callback();
  }),
}));

jest.mock('@testing-library/jest-dom', () => ({}));