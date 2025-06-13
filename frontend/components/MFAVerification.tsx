import React, { useState } from 'react';
import { FaShieldAlt, FaKey } from 'react-icons/fa';

interface MFAVerificationProps {
  username?: string;
  onVerify: (code: string, isBackupCode: boolean) => Promise<void>;
  onCancel?: () => void;
  error?: string | null;
}

const MFAVerification: React.FC<MFAVerificationProps> = ({ username = '', onVerify, onCancel, error: propError }) => {
  const [code, setCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [error, setError] = useState(propError || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code) {
      setError('Please enter a verification code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onVerify(code, isBackupCode);
      // If successful, the parent component will handle the redirect
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <div className="flex items-center space-x-2 text-blue-600 mb-4">
        <FaShieldAlt className="text-2xl" />
        <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
      </div>

      <p className="text-gray-700 mb-4">
        Please enter the verification code from your authenticator app for account <strong>{username}</strong>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isBackupCode ? (
          <div>
            <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700">
              Authentication Code
            </label>
            <input
              type="text"
              id="verification-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              maxLength={6}
              placeholder="000000"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="backup-code" className="block text-sm font-medium text-gray-700">
              Backup Code
            </label>
            <input
              type="text"
              id="backup-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter one of your backup codes (format: XXXX-XXXX)
            </p>
          </div>
        )}

        {error && (
          <div className="text-red-600 bg-red-50 p-3 rounded-md" data-testid="mfa-error">
            {error}
          </div>
        )}

        <div className="flex flex-col space-y-2">
          <button
            type="submit"
            disabled={loading || (!isBackupCode && code.length !== 6) || (isBackupCode && code.length < 8)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          
          <button
            type="button"
            onClick={() => setIsBackupCode(!isBackupCode)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center space-x-1"
          >
            <FaKey className="text-xs" />
            <span>{isBackupCode ? 'Use authentication code instead' : 'Use a backup code instead'}</span>
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 mt-2"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default MFAVerification;
