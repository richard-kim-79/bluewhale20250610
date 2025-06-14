import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MFAVerification from '../../components/MFAVerification';
import { act } from 'react-dom/test-utils';

describe('MFAVerification Component', () => {
  const mockOnVerify = jest.fn();
  const mockOnCancel = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders MFA verification form correctly', () => {
    render(
      <MFAVerification 
        onVerify={mockOnVerify} 
        onCancel={mockOnCancel} 
        error={null} 
      />
    );
    
    // Should show verification form
    expect(screen.getByText(/Two-Factor Authentication/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Authentication Code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByText(/Use a backup code instead/i)).toBeInTheDocument();
  });
  
  test('handles TOTP code submission', async () => {
    render(
      <MFAVerification 
        onVerify={mockOnVerify} 
        onCancel={mockOnCancel} 
        error={null} 
      />
    );
    
    // Enter code
    const codeInput = screen.getByLabelText(/Authentication Code/i);
    await act(async () => {
      fireEvent.change(codeInput, { target: { value: '123456' } });
    });
    
    // Submit form
    const verifyButton = screen.getByRole('button', { name: /Verify/i });
    await act(async () => {
      fireEvent.click(verifyButton);
    });
    
    // Should call onVerify with code and isBackupCode=false
    expect(mockOnVerify).toHaveBeenCalledWith('123456', false);
  });
  
  test('switches to backup code mode', async () => {
    render(
      <MFAVerification 
        onVerify={mockOnVerify} 
        onCancel={mockOnCancel} 
        error={null} 
      />
    );
    
    // Click on backup code link
    const backupCodeLink = screen.getByText(/Use a backup code instead/i);
    await act(async () => {
      fireEvent.click(backupCodeLink);
    });
    
    // Should show backup code form
    expect(screen.getByLabelText(/Backup Code/i)).toBeInTheDocument();
    expect(screen.getByText(/Use authentication code instead/i)).toBeInTheDocument();
  });
  
  test('handles backup code submission', async () => {
    render(
      <MFAVerification 
        onVerify={mockOnVerify} 
        onCancel={mockOnCancel} 
        error={null} 
      />
    );
    
    // Switch to backup code mode
    const backupCodeLink = screen.getByText(/Use a backup code instead/i);
    await act(async () => {
      fireEvent.click(backupCodeLink);
    });
    
    // Enter backup code
    const backupCodeInput = screen.getByLabelText(/Backup Code/i);
    await act(async () => {
      fireEvent.change(backupCodeInput, { target: { value: '12345678' } });
    });
    
    // Submit form
    const verifyButton = screen.getByRole('button', { name: /Verify/i });
    await act(async () => {
      fireEvent.click(verifyButton);
    });
    
    // Should call onVerify with code and isBackupCode=true
    expect(mockOnVerify).toHaveBeenCalledWith('12345678', true);
  });
  
  test('displays error message when provided', () => {
    const errorMessage = 'Invalid verification code';
    
    render(
      <MFAVerification 
        onVerify={mockOnVerify} 
        onCancel={mockOnCancel} 
        error={errorMessage} 
      />
    );
    
    // Should display error message
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByTestId('mfa-error')).toHaveClass('text-red-600');
    expect(screen.getByTestId('mfa-error')).toHaveClass('bg-red-50');
  });
  
  test('handles cancel action', async () => {
    render(
      <MFAVerification 
        onVerify={mockOnVerify} 
        onCancel={mockOnCancel} 
        error={null} 
      />
    );
    
    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await act(async () => {
      fireEvent.click(cancelButton);
    });
    
    // Should call onCancel
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
