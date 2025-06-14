// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Add fetch polyfill for tests
import fetch from 'node-fetch';
global.fetch = fetch;

// Increase timeout for all tests
jest.setTimeout(15000);

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    query: {},
    pathname: '/',
    asPath: '/',
  }),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />;
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
  disconnect() {
    return null;
  }
}

window.IntersectionObserver = MockIntersectionObserver;

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filter out React-specific warnings that might be noisy in tests
  if (
    (args[0] && typeof args[0] === 'string' && 
     (args[0].includes('Warning:') || args[0].includes('Error:'))) ||
    /Warning: ReactDOM.render is no longer supported in React 18/.test(args[0]) ||
    /Warning: useLayoutEffect does nothing on the server/.test(args[0])
  ) {
    return;
  }
  originalConsoleError(...args);
};
