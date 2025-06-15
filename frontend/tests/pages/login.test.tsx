import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../../pages/login';
import api from '../../lib/api';
import { act } from 'react-dom/test-utils';
import { useRouter } from 'next/router';

// Mock the API client
jest.mock('../../lib/api', () => ({
  login: jest.fn(),
  verifyMFA: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock MFAVerification component
jest.mock('../../components/MFAVerification', () => {
  const MockMFAVerification = ({ onVerify, onCancel, error }: { onVerify: (code: string, isBackupCode: boolean) => Promise<void>, onCancel?: () => void, error?: string | null }) => {
    // Log the error prop to help with debugging
    console.log('MFAVerification mock received error:', error);
    
    return (
      <div data-testid="mfa-verification">
        <div>MFA Verification Mock</div>
        {error && <div data-testid="mfa-error">{error}</div>}
        <button onClick={() => onVerify('123456', false)}>Verify with TOTP</button>
        <button onClick={() => onVerify('ABCD-EFGH', true)}>Verify with Backup Code</button>
        {onCancel && <button onClick={onCancel}>Cancel</button>}
        <label>
          Authentication Code
          <input type="text" />
        </label>
      </div>
    );
  };
  
  return MockMFAVerification;
});

describe('Login Page', () => {
  const mockRouter = {
    push: jest.fn(),
    query: {},
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    
    // Default login response (no MFA)
    (api.login as jest.Mock).mockResolvedValue({
      access_token: 'mock-token',
      token_type: 'bearer',
    });
  });
  
  test('renders login form correctly', () => {
    render(<Login />);
    
    expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });
  
  test('handles normal login flow without MFA', async () => {
    render(<Login />);
    
    // Fill in login form
    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });
    
    // Submit form
    const loginButton = screen.getByRole('button', { name: /Sign in/i });
    await act(async () => {
      fireEvent.click(loginButton);
    });
    
    // Should call login API with correct object format
    expect(api.login).toHaveBeenCalledWith({ username: 'testuser', password: 'password123' });
    
    // Should redirect to dashboard
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });
  
  test('handles login with MFA required', async () => {
    // Mock login response requiring MFA
    (api.login as jest.Mock).mockResolvedValue({
      mfa_required: true,
      username: 'testuser'
    });
    
    // Mock successful MFA verification
    (api.verifyMFA as jest.Mock).mockResolvedValue({
      access_token: 'mock-token-after-mfa',
      token_type: 'bearer',
    });
    
    render(<Login />);
    
    // Fill in login form
    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
    });
    
    // Submit form
    const loginButton = screen.getByRole('button', { name: /Sign in/i });
    await act(async () => {
      fireEvent.click(loginButton);
    });
    
    // Should call login API with correct object format
    expect(api.login).toHaveBeenCalledWith({ username: 'testuser', password: 'password123' });
    
    // Should show MFA verification component
    await waitFor(() => {
      expect(screen.getByTestId('mfa-verification')).toBeInTheDocument();
    });
    
    // Verify with TOTP code
    const verifyButton = screen.getByRole('button', { name: /Verify with TOTP/i });
    await act(async () => {
      fireEvent.click(verifyButton);
    });
    
    // Should call verifyMFA API with correct object format
    expect(api.verifyMFA).toHaveBeenCalledWith({ 
      code: '123456', 
      isBackupCode: false, 
      username: 'testuser' 
    });
    
    // Should redirect to dashboard after successful verification
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });
  
  test('handles login with backup code', async () => {
    // Mock login response requiring MFA
    (api.login as jest.Mock).mockResolvedValue({
      mfa_required: true,
      username: 'testuser'
    });
    
    // Mock successful MFA verification with backup code
    (api.verifyMFA as jest.Mock).mockResolvedValue({
      access_token: 'mock-token-after-backup-code',
      token_type: 'bearer',
    });
    
    render(<Login />);
    
    // Fill in login form and submit
    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    });
    
    // Verify with backup code
    await waitFor(() => {
      expect(screen.getByTestId('mfa-verification')).toBeInTheDocument();
    });
    
    const backupCodeButton = screen.getByRole('button', { name: /Verify with Backup Code/i });
    await act(async () => {
      fireEvent.click(backupCodeButton);
    });
    
    // Should call verifyMFA API with backup code flag and correct object format
    expect(api.verifyMFA).toHaveBeenCalledWith({ 
      code: 'ABCD-EFGH', 
      isBackupCode: true, 
      username: 'testuser' 
    });
    
    // Should redirect to dashboard after successful verification
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });
  
  test('handles MFA verification error', async () => {
    // Mock login response requiring MFA
    (api.login as jest.Mock).mockResolvedValue({
      mfa_required: true,
      username: 'testuser'
    });
    
    // Mock MFA verification error
    (api.verifyMFA as jest.Mock).mockRejectedValue({
      response: {
        data: {
          detail: 'Invalid verification code'
        }
      }
    });
    
    // Use a custom render to track state updates
    const { container } = render(<Login />);
    
    // Fill in login form and submit
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    
    // Wait for MFA verification component to appear
    await waitFor(() => {
      expect(screen.getByTestId('mfa-verification')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Enter a verification code
    const codeInput = screen.getByLabelText(/Authentication Code/i);
    fireEvent.change(codeInput, { target: { value: '123456' } });
    
    // Click the verify button
    const verifyButton = screen.getByRole('button', { name: /^Verify$/i });
    await act(async () => {
      fireEvent.click(verifyButton);
    });
    
    // Wait for the error message to appear
    await waitFor(() => {
      const errorElement = screen.getByTestId('mfa-error');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent('Invalid verification code');
    }, { timeout: 5000 });
    
    // Should not redirect
    expect(mockRouter.push).not.toHaveBeenCalled();
  }, 15000);
  
  test('handles MFA verification cancellation', async () => {
    // Mock login response requiring MFA
    (api.login as jest.Mock).mockResolvedValue({
      mfa_required: true,
      username: 'testuser'
    });
    
    render(<Login />);
    
    // Fill in login form and submit
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    });
    
    // Cancel verification
    await waitFor(() => {
      expect(screen.getByTestId('mfa-verification')).toBeInTheDocument();
    });
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    });
    
    // Should reset to login form
    expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
    expect(screen.queryByTestId('mfa-verification')).not.toBeInTheDocument();
  });
});
