import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthContext } from '../../contexts/AuthContext';

// Mock AuthProvider for testing
export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Create a mock implementation of the AuthContext
  const mockAuthContext = {
    user: {
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      bio: 'Test bio',
      mfa_enabled: false,
      role: 'user',
      created_at: '2025-01-01T00:00:00Z'
    },
    loading: false,
    error: null,
    login: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn().mockResolvedValue(undefined),
    logoutAllDevices: jest.fn().mockResolvedValue(undefined),
    updateProfile: jest.fn().mockResolvedValue(undefined),
    isAuthenticated: true,
    sessions: [],
    loadingSessions: false,
    getSessions: jest.fn().mockResolvedValue(undefined)
  };

  // Return the AuthContext.Provider with our mock value
  return (
    <AuthContext.Provider value={mockAuthContext}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <MockAuthProvider>
        {children}
      </MockAuthProvider>
    );
  };
  
  return render(ui, { wrapper: AllProviders, ...options });
};

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override the render method
export { customRender as render };
