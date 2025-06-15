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
  
  const mockSetupMFA = api.setupMFA as jest.Mock;
  const mockEnableMFA = api.enableMFA as jest.Mock;
  const mockGetBackupCodes = api.getBackupCodes as jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    mockSetupMFA.mockResolvedValue({
      data: {
        secret: mockSecret,
        qr_code: mockQrCode,
        uri: 'otpauth://totp/BlueWhale:user@example.com?secret=ABCDEFGHIJKLMNOP&issuer=BlueWhale'
      }
    });
    
    mockEnableMFA.mockResolvedValue({
      message: 'MFA enabled successfully'
    });
    
    mockGetBackupCodes.mockResolvedValue({
      backup_codes: mockBackupCodes
    });
  });
  
  it('renders MFA setup with QR code and verification input', async () => {
    render(<MFASetup />);
    
    // Initial screen should have Begin Setup button
    const beginSetupButton = screen.getByRole('button', { name: /Begin Setup/i });
    expect(beginSetupButton).toBeInTheDocument();
    
    // Click Begin Setup
    fireEvent.click(beginSetupButton);
    
    // Wait for API call to complete and component to update
    await waitFor(() => {
      expect(mockSetupMFA).toHaveBeenCalled();
    });
    
    // After setup, screen should show QR code heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Scan the QR Code/i })).toBeInTheDocument();
    });
    
    // Should show QR code image and secret
    expect(screen.getByAltText(/MFA QR Code/i)).toHaveAttribute('src', expect.stringContaining('data:image/png;base64,'));
    expect(screen.getByText(mockSecret)).toBeInTheDocument();
    
    // Should show verification code input
    expect(screen.getByLabelText('Enter the 6-digit verification code from your app')).toBeInTheDocument();
    
    // Should have Verify and Enable button
    expect(screen.getByRole('button', { name: /Verify and Enable/i })).toBeInTheDocument();
  });
  
  it('handles API errors during setup', async () => {
    // Mock API error
    mockSetupMFA.mockRejectedValueOnce(new Error('Failed to setup MFA'));
    
    render(<MFASetup />);
    
    // Click Begin Setup button
    const beginSetupButton = screen.getByRole('button', { name: /Begin Setup/i });
    fireEvent.click(beginSetupButton);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to start MFA setup/i)).toBeInTheDocument();
    });
    
    // Should still be on intro screen
    expect(screen.getByRole('heading', { name: /Set Up Two-Factor Authentication/i })).toBeInTheDocument();
  });
  
  it('handles verification error', async () => {
    render(<MFASetup onComplete={jest.fn()} />);
    
    // Mock verification error
    mockEnableMFA.mockRejectedValueOnce(new Error('Invalid verification code'));
    
    // First need to click begin setup
    const startButton = screen.getByRole('button', { name: /begin setup/i });
    fireEvent.click(startButton);
    
    // Wait for setup to complete
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Scan the QR Code/i })).toBeInTheDocument();
    });
    
    // Enter verification code
    const codeInput = screen.getByLabelText('Enter the 6-digit verification code from your app');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    
    // Submit verification
    const verifyButton = screen.getByRole('button', { name: /verify/i });
    fireEvent.click(verifyButton);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Invalid verification code/i)).toBeInTheDocument();
    });
  });

  it('handles back button navigation', async () => {
    render(<MFASetup />);
    
    // Initial screen should have Begin Setup button
    const beginSetupButton = screen.getByRole('button', { name: /Begin Setup/i });
    expect(beginSetupButton).toBeInTheDocument();
    
    // Click Begin Setup
    fireEvent.click(beginSetupButton);
    
    // Wait for API call to complete and component to update
    await waitFor(() => {
      expect(mockSetupMFA).toHaveBeenCalled();
    });
    
    // Should be on setup screen
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Scan the QR Code/i })).toBeInTheDocument();
    });
    
    // Click back button
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);
    
    // Should return to intro screen
    expect(screen.getByRole('heading', { name: /Set Up Two-Factor Authentication/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Begin Setup/i })).toBeInTheDocument();
  });

  it('filters non-numeric characters from verification code input', async () => {
    render(<MFASetup />);
    
    // Start setup
    const startButton = screen.getByRole('button', { name: /begin setup/i });
    fireEvent.click(startButton);
    
    // Wait for setup to complete
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Scan the QR Code/i })).toBeInTheDocument();
    });
    
    // Enter a code with non-numeric characters
    const codeInput = screen.getByLabelText('Enter the 6-digit verification code from your app');
    fireEvent.change(codeInput, { target: { value: '1a2b3c4d5e6f' } });
    
    // Input should only contain numbers and be limited to 6 digits
    expect(codeInput).toHaveValue('123456');
  });

  it('renders initial setup screen and handles full setup flow', async () => {
    const mockOnComplete = jest.fn();
    
    render(<MFASetup onComplete={mockOnComplete} />);
    
    // Initial screen should show Begin Setup button
    const beginSetupButton = screen.getByRole('button', { name: /Begin Setup/i });
    expect(beginSetupButton).toBeInTheDocument();
    
    // Click Begin Setup
    fireEvent.click(beginSetupButton);
    
    // Wait for API call to complete and component to update
    await waitFor(() => {
      expect(mockSetupMFA).toHaveBeenCalled();
    });
    
    // After setup, screen should show QR code heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Scan the QR Code/i })).toBeInTheDocument();
    });
    
    // Should show QR code image and secret
    expect(screen.getByAltText(/MFA QR Code/i)).toHaveAttribute('src', expect.stringContaining('data:image/png;base64,'));
    expect(screen.getByText(mockSecret)).toBeInTheDocument();
    
    // Enter verification code
    const codeInput = screen.getByLabelText('Enter the 6-digit verification code from your app');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    
    // Submit verification
    const verifyButton = screen.getByRole('button', { name: /verify/i });
    fireEvent.click(verifyButton);
    
    // API should be called with the code
    expect(mockEnableMFA).toHaveBeenCalledWith('123456');
    
    // Should now show backup codes
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Your Backup Codes/i })).toBeInTheDocument();
    });
    
    // Should display all backup codes
    // The backup codes are rendered in div elements with specific styling
    await waitFor(() => {
      const codeElements = screen.getAllByText(/^[A-Z0-9]{8}$/i);
      expect(codeElements.length).toBe(mockBackupCodes.length);
      
      // Check if all mock backup codes are present
      mockBackupCodes.forEach(code => {
        const found = Array.from(codeElements).some(element => 
          element.textContent === code
        );
        expect(found).toBe(true);
      });
    });
    
    // Test copy to clipboard
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockBackupCodes.join('\n'));
    
    // Test download
    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);
    expect(URL.createObjectURL).toHaveBeenCalled();
    
    // Test completion
    const doneButton = screen.getByRole('button', { name: /done/i });
    fireEvent.click(doneButton);
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('handles cancellation', async () => {
    const mockOnCancel = jest.fn();
    
    render(<MFASetup onCancel={mockOnCancel} />);
    
    // Find and click the cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('validates verification code length', async () => {
    render(<MFASetup />);
    
    // Start setup
    const startButton = screen.getByRole('button', { name: /begin setup/i });
    fireEvent.click(startButton);
    
    // Wait for setup to complete
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Scan the QR Code/i })).toBeInTheDocument();
    });
    
    // Enter an invalid (too short) verification code
    const codeInput = screen.getByLabelText('Enter the 6-digit verification code from your app');
    fireEvent.change(codeInput, { target: { value: '12345' } });
    
    // Verify button should be disabled
    const verifyButton = screen.getByRole('button', { name: /verify/i });
    expect(verifyButton).toBeDisabled();
    
    // Try to submit anyway
    fireEvent.click(verifyButton);
    
    // API should not be called
    expect(mockEnableMFA).not.toHaveBeenCalled();
    
    // Enter a valid code
    fireEvent.change(codeInput, { target: { value: '123456' } });
    
    // Verify button should be enabled
    expect(verifyButton).not.toBeDisabled();
  });
});
