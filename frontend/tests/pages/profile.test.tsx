import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Profile from '../../pages/profile';
import api from '../../lib/api';
import { act } from 'react-dom/test-utils';
import { useRouter } from 'next/router';
import { render, MockAuthProvider } from '../utils/test-utils';

// Mock the API client
jest.mock('../../lib/api', () => ({
  getCurrentUser: jest.fn(),
  updateUserProfile: jest.fn(),
  getUserDocuments: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock MFASettings component
jest.mock('../../components/MFASettings', () => {
  return function MockMFASettings() {
    return <div data-testid="mfa-settings">MFA Settings Component</div>;
  };
});

describe('Profile Page', () => {
  const mockUser = {
    id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    full_name: 'Test User',
    bio: 'Test bio',
    mfa_enabled: false
  };
  
  const mockDocuments = [
    { id: 'doc1', title: 'Document 1', created_at: '2025-01-01T00:00:00' },
    { id: 'doc2', title: 'Document 2', created_at: '2025-01-02T00:00:00' }
  ];
  
  const mockRouter = {
    push: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    (api.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (api.getUserDocuments as jest.Mock).mockResolvedValue(mockDocuments);
    (api.updateUserProfile as jest.Mock).mockResolvedValue({
      ...mockUser,
      full_name: 'Updated Name',
      bio: 'Updated bio'
    });
    
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });
  
  test('renders profile page with user data and MFA settings', async () => {
    await act(async () => {
      render(
        <MockAuthProvider>
          <Profile />
        </MockAuthProvider>
      );
    });
    
    // Should show user profile data
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    
    // Should show security settings section with MFA component
    expect(screen.getByText(/Security Settings/i)).toBeInTheDocument();
    expect(screen.getByTestId('mfa-settings')).toBeInTheDocument();
    
    // Should show documents section
    expect(screen.getByText(/My Documents/i)).toBeInTheDocument();
    expect(screen.getByText('Document 1')).toBeInTheDocument();
    expect(screen.getByText('Document 2')).toBeInTheDocument();
  });
  
  test('handles profile editing', async () => {
    await act(async () => {
      render(
        <MockAuthProvider>
          <Profile />
        </MockAuthProvider>
      );
    });
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /Edit Profile/i });
    await act(async () => {
      fireEvent.click(editButton);
    });
    
    // Should show edit form
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bio/i)).toBeInTheDocument();
    
    // Edit fields
    const nameInput = screen.getByLabelText(/Full Name/i);
    const bioInput = screen.getByLabelText(/Bio/i);
    
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      fireEvent.change(bioInput, { target: { value: 'Updated bio' } });
    });
    
    // Submit form
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    // Should call API with updated data
    expect(api.updateUserProfile).toHaveBeenCalledWith({
      full_name: 'Updated Name',
      bio: 'Updated bio'
    });
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/Profile updated successfully/i)).toBeInTheDocument();
    });
    
    // Should refresh user data
    expect(api.getCurrentUser).toHaveBeenCalledTimes(2);
  });
  
  test('handles API errors', async () => {
    // Mock API error
    (api.getCurrentUser as jest.Mock).mockImplementation(() => {
      throw new Error('Failed to fetch user data');
    });
    
    await act(async () => {
      render(
        <MockAuthProvider>
          <Profile />
        </MockAuthProvider>
      );
    });
    
    // Profile should still render with mock data from AuthProvider
    expect(screen.getByText(/Profile Information/i)).toBeInTheDocument();
  });
});
