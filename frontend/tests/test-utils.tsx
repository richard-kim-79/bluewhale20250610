import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Mock API client
export const mockApiClient = {
  setupMFA: jest.fn(),
  enableMFA: jest.fn(),
  disableMFA: jest.fn(),
  verifyMFA: jest.fn(),
  getBackupCodes: jest.fn(),
  login: jest.fn(),
  getCurrentUser: jest.fn(),
  updateProfile: jest.fn(),
};

// Mock Next.js router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  query: {},
  pathname: '/',
  asPath: '/',
};

// Mock file download
export const mockFileDownload = {
  download: jest.fn(),
};

// Custom render with providers if needed
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options });

export * from '@testing-library/react';
export { customRender as render };
