/**
 * Jest setup file for performance monitor tests
 */

import '@testing-library/jest-dom';

// Mock performance API for tests
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  },
});

// Mock PerformanceObserver
const mockPerformanceObserver = jest.fn().mockImplementation((_callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
}));
mockPerformanceObserver.supportedEntryTypes = ['resource', 'navigation', 'measure', 'mark'];
global.PerformanceObserver = mockPerformanceObserver as any;

// Mock window object
Object.defineProperty(window, 'fetch', {
  writable: true,
  value: jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    headers: {
      get: jest.fn(() => '1024'),
    },
  })),
});

// Mock navigator for web vitals
Object.defineProperty(global, 'navigator', {
  writable: true,
  value: {
    connection: {
      effectiveType: '4g',
    },
    userAgent: 'jest',
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock console methods to avoid noise in tests
const originalError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalError;
});

// Mock webpack require for Module Federation tests
Object.defineProperty(window, '__webpack_require__', {
  writable: true,
  value: {
    f: {
      remotes: jest.fn(),
      j: jest.fn(),
    },
  },
});