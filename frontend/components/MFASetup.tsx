import React, { useState } from 'react';
import { FaKey, FaQrcode, FaShieldAlt, FaCheck, FaTimes, FaDownload, FaCopy } from 'react-icons/fa';
import api from '../lib/api';

interface MFASetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

interface MFASetupData {
  secret: string;
  qr_code: string;
  uri: string;
}

interface BackupCodesData {
  backup_codes: string[];
}

const MFASetup: React.FC<MFASetupProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'backup-codes'>('intro');
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Start MFA setup process
  const startSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.setupMFA();
      setSetupData(response.data);
      setStep('setup');
    } catch (err) {
      setError('Failed to start MFA setup. Please try again.');
      console.error('MFA setup error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verify the MFA code
  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await api.enableMFA(verificationCode);
      setSuccess(true);
      setStep('backup-codes');
      
      // Get backup codes
      const backupResponse = await api.getBackupCodes(verificationCode);
      setBackupCodes(backupResponse.data.backup_codes);
    } catch (err) {
      setError('Invalid verification code. Please try again.');
      console.error('MFA verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Copy backup codes to clipboard
  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
  };

  // Download backup codes as a text file
  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bluewhale-mfa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Complete the setup process
  const completeSetup = () => {
    if (onComplete) {
      onComplete();
    }
  };

  // Render the intro step
  const renderIntro = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-blue-600">
        <FaShieldAlt className="text-2xl" />
        <h2 className="text-xl font-bold">Set Up Two-Factor Authentication</h2>
      </div>
      
      <p className="text-gray-700">
        Two-factor authentication adds an extra layer of security to your account. 
        After enabling, you'll need both your password and a verification code from your 
        authentication app to sign in.
      </p>
      
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold text-blue-800">You'll need:</h3>
        <ul className="list-disc pl-5 text-blue-700 mt-2">
          <li>A smartphone with an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator</li>
          <li>A few minutes to complete the setup</li>
        </ul>
      </div>
      
      <div className="flex space-x-3 pt-4">
        <button
          onClick={startSetup}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
        >
          {loading ? (
            <span>Setting up...</span>
          ) : (
            <>
              <FaShieldAlt />
              <span>Begin Setup</span>
            </>
          )}
        </button>
        
        <button
          onClick={onCancel}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
      
      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded-md mt-3">
          {error}
        </div>
      )}
    </div>
  );

  // Render the setup step with QR code
  const renderSetup = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-blue-600">
        <FaQrcode className="text-2xl" />
        <h2 className="text-xl font-bold">Scan the QR Code</h2>
      </div>
      
      <ol className="list-decimal pl-5 space-y-3 text-gray-700">
        <li>Open your authenticator app</li>
        <li>Tap the + or "Add account" button</li>
        <li>Choose "Scan a QR code" (or similar option)</li>
        <li>Scan the QR code below</li>
      </ol>
      
      {setupData?.qr_code && (
        <div className="flex justify-center py-4">
          <div className="bg-white p-4 rounded-md shadow-md inline-block">
            <img 
              src={`data:image/png;base64,${setupData.qr_code}`} 
              alt="MFA QR Code" 
              className="w-48 h-48"
            />
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-sm text-gray-600 mb-2">
          Can't scan the QR code? Enter this code manually in your app:
        </p>
        <div className="font-mono bg-white p-2 rounded border border-gray-300 text-center select-all">
          {setupData?.secret}
        </div>
      </div>
      
      <div className="pt-4 space-y-4">
        <div>
          <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700">
            Enter the 6-digit verification code from your app
          </label>
          <input
            type="text"
            id="verification-code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            maxLength={6}
            placeholder="000000"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={verifyAndEnable}
            disabled={loading || verificationCode.length !== 6}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Verifying...</span>
            ) : (
              <>
                <FaCheck />
                <span>Verify and Enable</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => setStep('intro')}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
          >
            Back
          </button>
        </div>
        
        {error && (
          <div className="text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );

  // Render the backup codes step
  const renderBackupCodes = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-green-600">
        <FaCheck className="text-2xl" />
        <h2 className="text-xl font-bold">Two-Factor Authentication Enabled</h2>
      </div>
      
      <div className="bg-green-50 p-4 rounded-md text-green-800">
        <p>
          Two-factor authentication has been successfully enabled for your account.
        </p>
      </div>
      
      <div className="pt-4">
        <div className="flex items-center space-x-2 text-blue-600">
          <FaKey className="text-xl" />
          <h3 className="text-lg font-semibold">Your Backup Codes</h3>
        </div>
        
        <p className="text-gray-700 mt-2 mb-4">
          Save these backup codes in a secure place. If you lose access to your authentication app, 
          you can use one of these one-time use codes to sign in.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, index) => (
              <div key={index} className="font-mono bg-white p-2 rounded border border-gray-300 text-center">
                {code}
              </div>
            ))}
          </div>
          
          <div className="flex space-x-3 mt-4">
            <button
              onClick={copyBackupCodes}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md border border-blue-200 hover:bg-blue-50"
            >
              <FaCopy />
              <span>Copy Codes</span>
            </button>
            
            <button
              onClick={downloadBackupCodes}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 px-3 py-1 rounded-md border border-blue-200 hover:bg-blue-50"
            >
              <FaDownload />
              <span>Download Codes</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="pt-4">
        <button
          onClick={completeSetup}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Done
        </button>
      </div>
    </div>
  );

  // Render the appropriate step
  const renderStep = () => {
    switch (step) {
      case 'intro':
        return renderIntro();
      case 'setup':
        return renderSetup();
      case 'backup-codes':
        return renderBackupCodes();
      default:
        return renderIntro();
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      {renderStep()}
    </div>
  );
};

export default MFASetup;
