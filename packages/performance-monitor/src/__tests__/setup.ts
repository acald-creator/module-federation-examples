/**
 * Jest setup file for performance monitor tests
 */

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

// Mock navigator for web vitals
Object.defineProperty(global, 'navigator', {
  writable: true,
  value: {
    connection: {
      effectiveType: '4g',
    },
  },
});