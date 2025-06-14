import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MFASetup from '../../components/MFASetup';
import api from '../../lib/api';
import { act } from 'react-dom/test-utils';

// Mock the API client
jest.mock('../../lib/api', () => ({
  setupMFA: jest.fn(),
  enableMFA: jest.fn(),
  getBackupCodes: jest.fn(),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});

// Mock file download
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

describe('MFASetup Component', () => {
  const mockQrCode = 'data:image/png;base64,mockQrCodeData';
  const mockSecret = 'ABCDEFGHIJKLMNOP';
  const mockOtpauthUrl = 'otpauth://totp/BlueWhale:testuser?secret=ABCDEFGHIJKLMNOP&issuer=BlueWhale';
  const mockBackupCodes = ['12345678', '23456789', '34567890'];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    (api.setupMFA as jest.Mock).mockResolvedValue({
      secret: mockSecret,
      qr_code: mockQrCode,
      otpauth_url: mockOtpauthUrl
    });
    
    (api.enableMFA as jest.Mock).mockResolvedValue({
      message: 'MFA enabled successfully'
    });
    
    (api.getBackupCodes as jest.Mock).mockResolvedValue({
      backup_codes: mockBackupCodes
    });
  });
  
  test('renders initial setup screen and handles full setup flow', async () => {
    const mockOnComplete = jest.fn();
    
    await act(async () => {
      render(<MFASetup onComplete={mockOnComplete} />);
    });
    
    // Initial screen should show QR code and secret
    expect(screen.getByText(/Scan this QR code/i)).toBeInTheDocument();
    expect(screen.getByAltText('QR Code')).toHaveAttribute('src', mockQrCode);
    expect(screen.getByText(mockSecret)).toBeInTheDocument();
    
    // Enter verification code
    const codeInput = screen.getByLabelText(/verification code/i);
    fireEvent.change(codeInput, { target: { value: '123456' } });
    
    // Submit verification
    const verifyButton = screen.getByRole('button', { name: /verify/i });
    await act(async () => {
      fireEvent.click(verifyButton);
    });
    
    // API should be called with the code
    expect(api.enableMFA).toHaveBeenCalledWith('123456');
    
    // Should now show backup codes
    await waitFor(() => {
      expect(screen.getByText(/Backup Codes/i)).toBeInTheDocument();
    });
    
    // Should display all backup codes
    mockBackupCodes.forEach(code => {
      expect(screen.getByText(code)).toBeInTheDocument();
    });
    
    // Test copy to clipboard
    const copyButton = screen.getByRole('button', { name: /copy/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockBackupCodes.join('\n'));
    
    // Test download
    const downloadButton = screen.getByRole('button', { name: /download/i });
    await act(async () => {
      fireEvent.click(downloadButton);
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
    
    // Test completion
    const doneButton = screen.getByRole('button', { name: /done/i });
    await act(async () => {
      fireEvent.click(doneButton);
    });
    expect(mockOnComplete).toHaveBeenCalled();
  });
  
  test('handles API errors during setup', async () => {
    // Mock API error
    (api.setupMFA as jest.Mock).mockRejectedValue(new Error('Failed to setup MFA'));
    
    await act(async () => {
      render(<MFASetup onComplete={jest.fn()} />);
    });
    
    // Should show error message
    expect(screen.getByText(/Failed to setup MFA/i)).toBeInTheDocument();
  });
  
  test('handles verification error', async () => {
    await act(async () => {
      render(<MFASetup onComplete={jest.fn()} />);
    });
    
    // Mock verification error
    (api.enableMFA as jest.Mock).mockRejectedValue(new Error('Invalid verification code'));
    
    // Enter verification code
    const codeInput = screen.getByLabelText(/verification code/i);
    fireEvent.change(codeInput, { target: { value: '123456' } });
    
    // Submit verification
    const verifyButton = screen.getByRole('button', { name: /verify/i });
    await act(async () => {
      fireEvent.click(verifyButton);
    });
    
    // Should show error message
    expect(screen.getByText(/Invalid verification code/i)).toBeInTheDocument();
  });

  test('handles cancellation', async () => {
    const mockOnCancel = jest.fn();
    
    await act(async () => {
      render(<MFASetup onCancel={mockOnCancel} />);
    });
    
    // Find and click the cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await act(async () => {
      fireEvent.click(cancelButton);
    });
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('validates verification code length', async () => {
    await act(async () => {
      render(<MFASetup />);
    });
    
    // Start setup
    const startButton = screen.getByRole('button', { name: /begin setup/i });
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    // Enter an invalid (too short) verification code
    const codeInput = screen.getByLabelText(/verification code/i);
    fireEvent.change(codeInput, { target: { value: '12345' } });
    
    // Verify button should be disabled
    const verifyButton = screen.getByRole('button', { name: /verify/i });
    expect(verifyButton).toBeDisabled();
    
    // Try to submit anyway
    await act(async () => {
      fireEvent.click(verifyButton);
    });
    
    // API should not be called
    expect(api.enableMFA).not.toHaveBeenCalled();
    
    // Enter a valid code
    fireEvent.change(codeInput, { target: { value: '123456' } });
    
    // Verify button should be enabled
    expect(verifyButton).not.toBeDisabled();
  });

  test('handles back button navigation', async () => {
    await act(async () => {
      render(<MFASetup />);
    });
    
    // Start setup
    const startButton = screen.getByRole('button', { name: /begin setup/i });
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    // Should be on setup screen
    expect(screen.getByText(/Scan this QR code/i)).toBeInTheDocument();
    
    // Click back button
    const backButton = screen.getByRole('button', { name: /back/i });
    await act(async () => {
      fireEvent.click(backButton);
    });
    
    // Should be back on intro screen
    expect(screen.getByText(/Set Up Two-Factor Authentication/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /begin setup/i })).toBeInTheDocument();
  });

  test('filters non-numeric characters from verification code input', async () => {
    await act(async () => {
      render(<MFASetup />);
    });
    
    // Start setup
    const startButton = screen.getByRole('button', { name: /begin setup/i });
    await act(async () => {
      fireEvent.click(startButton);
    });
    
    // Enter a code with non-numeric characters
    const codeInput = screen.getByLabelText(/verification code/i);
    fireEvent.change(codeInput, { target: { value: '1a2b3c4d5e6f' } });
    
    // Input should only contain numbers and be limited to 6 digits
    expect(codeInput).toHaveValue('123456');
  });
});
