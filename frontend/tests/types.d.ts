// Type definitions for testing
import '@testing-library/jest-dom';

// Extend window with clipboard API
interface ClipboardItem {
  readonly types: string[];
  getType(type: string): Promise<Blob>;
}

interface Clipboard {
  write(data: ClipboardItem[]): Promise<void>;
  writeText(data: string): Promise<void>;
  read(): Promise<ClipboardItem[]>;
  readText(): Promise<string>;
}

declare global {
  interface Navigator {
    clipboard: Clipboard;
  }
  
  interface Window {
    URL: {
      createObjectURL: (blob: Blob) => string;
      revokeObjectURL: (url: string) => void;
    };
  }
}

// Mock API client types
interface MockApiClient {
  setupMFA: jest.Mock;
  enableMFA: jest.Mock;
  disableMFA: jest.Mock;
  verifyMFA: jest.Mock;
  getBackupCodes: jest.Mock;
  login: jest.Mock;
  getCurrentUser: jest.Mock;
  updateProfile: jest.Mock;
}

// Mock router types
interface MockRouter {
  push: jest.Mock;
  replace: jest.Mock;
  prefetch: jest.Mock;
  query: Record<string, string>;
  pathname: string;
  asPath: string;
}

// Mock file download
interface MockFileDownload {
  download: jest.Mock;
}
