import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MFASettings from '../../components/MFASettings';
import api from '../../lib/api';
import { act } from 'react-dom/test-utils';

// Mock the API client
jest.mock('../../lib/api', () => ({
  getCurrentUser: jest.fn(),
  setupMFA: jest.fn(),
  enableMFA: jest.fn(),
  disableMFA: jest.fn(),
  getBackupCodes: jest.fn(),
}));

describe('MFASettings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for getCurrentUser
    (api.getCurrentUser as jest.Mock).mockResolvedValue({
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      mfa_enabled: false
    });
  });
  
  test('renders MFA disabled state correctly', async () => {
    await act(async () => {
      render(<MFASettings />);
    });
    
    // Should show MFA is disabled
    expect(screen.getByText(/Multi-Factor Authentication \(MFA\)/i)).toBeInTheDocument();
    expect(screen.getByText(/MFA is currently disabled/i)).toBeInTheDocument();
    
    // Should show enable button
    const enableButton = screen.getByRole('button', { name: /Enable MFA/i });
    expect(enableButton).toBeInTheDocument();
  });
  
  test('renders MFA enabled state correctly', async () => {
    // Mock user with MFA enabled
    (api.getCurrentUser as jest.Mock).mockResolvedValue({
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      mfa_enabled: true
    });
    
    await act(async () => {
      render(<MFASettings />);
    });
    
    // Should show MFA is enabled
    expect(screen.getByText(/Multi-Factor Authentication \(MFA\)/i)).toBeInTheDocument();
    expect(screen.getByText(/MFA is currently enabled/i)).toBeInTheDocument();
    
    // Should show disable button and backup codes button
    const disableButton = screen.getByRole('button', { name: /Disable MFA/i });
    expect(disableButton).toBeInTheDocument();
    
    const backupCodesButton = screen.getByRole('button', { name: /View Backup Codes/i });
    expect(backupCodesButton).toBeInTheDocument();
  });
  
  test('handles enabling MFA flow', async () => {
    await act(async () => {
      render(<MFASettings />);
    });
    
    // Click enable button
    const enableButton = screen.getByRole('button', { name: /Enable MFA/i });
    await act(async () => {
      fireEvent.click(enableButton);
    });
    
    // Should show MFA setup component
    expect(screen.getByText(/Scan this QR code/i)).toBeInTheDocument();
  });
  
  test('handles disabling MFA flow', async () => {
    // Mock user with MFA enabled
    (api.getCurrentUser as jest.Mock).mockResolvedValue({
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      mfa_enabled: true
    });
    
    // Mock successful disable
    (api.disableMFA as jest.Mock).mockResolvedValue({
      message: 'MFA disabled successfully'
    });
    
    await act(async () => {
      render(<MFASettings />);
    });
    
    // Click disable button
    const disableButton = screen.getByRole('button', { name: /Disable MFA/i });
    await act(async () => {
      fireEvent.click(disableButton);
    });
    
    // Should show verification dialog
    expect(screen.getByText(/Verify Your Identity/i)).toBeInTheDocument();
    
    // Enter code
    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    
    // Submit verification
    const confirmButton = screen.getByRole('button', { name: /Disable/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });
    
    // API should be called with the code
    expect(api.disableMFA).toHaveBeenCalledWith('123456');
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/MFA has been disabled/i)).toBeInTheDocument();
    });
    
    // Should refresh user data
    expect(api.getCurrentUser).toHaveBeenCalledTimes(2);
  });
  
  test('handles viewing backup codes', async () => {
    // Mock user with MFA enabled
    (api.getCurrentUser as jest.Mock).mockResolvedValue({
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      mfa_enabled: true
    });
    
    // Mock backup codes
    const mockBackupCodes = ['12345678', '23456789', '34567890'];
    (api.getBackupCodes as jest.Mock).mockResolvedValue({
      backup_codes: mockBackupCodes
    });
    
    await act(async () => {
      render(<MFASettings />);
    });
    
    // Click backup codes button
    const backupCodesButton = screen.getByRole('button', { name: /Generate New Backup Codes/i });
    await act(async () => {
      fireEvent.click(backupCodesButton);
    });
    
    // Should show verification dialog
    expect(screen.getByText(/Verify Your Identity/i)).toBeInTheDocument();
    
    // Enter code
    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    
    // Submit verification
    const confirmButton = screen.getByRole('button', { name: /Disable/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });
    
    // Should show backup codes
    await waitFor(() => {
      expect(screen.getByText(/Backup Codes/i)).toBeInTheDocument();
    });
    
    // Should display all backup codes
    mockBackupCodes.forEach(code => {
      expect(screen.getByText(code)).toBeInTheDocument();
    });
  });
  
  test('handles API errors', async () => {
    // Mock API error
    (api.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Failed to fetch user data'));
    
    // Just verify that the component renders without crashing
    await act(async () => {
      render(<MFASettings />);
    });
    
    // Should not be in loading state anymore
    expect(screen.queryByText(/Loading MFA settings/i)).not.toBeInTheDocument();
  });
});
