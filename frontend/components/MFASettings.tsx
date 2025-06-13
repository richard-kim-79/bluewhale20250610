import React, { useState, useEffect } from 'react';
import { FaShieldAlt, FaKey, FaTimes, FaCheck } from 'react-icons/fa';
import api from '../lib/api';
import MFASetup from './MFASetup';

interface MFASettingsProps {
  onUpdate?: () => void;
}

const MFASettings: React.FC<MFASettingsProps> = ({ onUpdate }) => {
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [showDisable, setShowDisable] = useState<boolean>(false);
  const [disableCode, setDisableCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Fetch MFA status on component mount
  useEffect(() => {
    const fetchMfaStatus = async () => {
      try {
        const response = await api.getCurrentUser();
        setMfaEnabled(response.mfa_enabled || false);
      } catch (err) {
        console.error('Error fetching MFA status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMfaStatus();
  }, []);

  // Handle MFA setup completion
  const handleSetupComplete = () => {
    setShowSetup(false);
    setMfaEnabled(true);
    setSuccess('Two-factor authentication has been enabled successfully.');
    if (onUpdate) onUpdate();
  };

  // Handle MFA disable
  const handleDisableMFA = async () => {
    if (!disableCode) {
      setError('Please enter your verification code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await api.disableMFA(disableCode);
      setMfaEnabled(false);
      setShowDisable(false);
      setSuccess('Two-factor authentication has been disabled.');
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // Generate new backup codes
  const handleGenerateBackupCodes = async () => {
    setShowDisable(true);
  };

  // Reset states when closing modals
  const handleCancel = () => {
    setShowSetup(false);
    setShowDisable(false);
    setDisableCode('');
    setError('');
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-center">
          <div className="animate-pulse text-gray-500">Loading MFA settings...</div>
        </div>
      </div>
    );
  }

  if (showSetup) {
    return <MFASetup onComplete={handleSetupComplete} onCancel={handleCancel} />;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <FaShieldAlt className="text-xl text-blue-600" />
          <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          mfaEnabled 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {mfaEnabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaCheck className="text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setSuccess('')}
                  className="inline-flex rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none"
                >
                  <span className="sr-only">Dismiss</span>
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setError('')}
                  className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none"
                >
                  <span className="sr-only">Dismiss</span>
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="prose max-w-none mb-6">
        <p>
          Two-factor authentication adds an extra layer of security to your account by requiring a verification code 
          in addition to your password when you sign in.
        </p>
      </div>

      {!mfaEnabled ? (
        <div>
          <button
            onClick={() => setShowSetup(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
          >
            <FaShieldAlt />
            <span>Enable Two-Factor Authentication</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0">
            <button
              onClick={handleGenerateBackupCodes}
              className="border border-blue-300 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-50 flex items-center space-x-2"
            >
              <FaKey />
              <span>Generate New Backup Codes</span>
            </button>
            
            <button
              onClick={() => setShowDisable(true)}
              className="border border-red-300 text-red-700 px-4 py-2 rounded-md hover:bg-red-50 flex items-center space-x-2"
            >
              <FaTimes />
              <span>Disable Two-Factor Authentication</span>
            </button>
          </div>
          
          {showDisable && (
            <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-3">
                {disableCode ? 'Confirm Disable' : 'Verify Your Identity'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please enter a verification code from your authenticator app to disable two-factor authentication.
              </p>
              
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  maxLength={6}
                  placeholder="000000"
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                
                <button
                  onClick={handleDisableMFA}
                  disabled={loading || disableCode.length !== 6}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Disable'}
                </button>
                
                <button
                  onClick={handleCancel}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MFASettings;
