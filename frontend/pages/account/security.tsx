import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import SessionManagement from '../../components/SessionManagement';
import withAuth from '../../components/withAuth';

const SecurityPage: NextPage = () => {
  const { user, updateProfile, error } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        current_password: currentPassword,
        password: newPassword
      });
      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Account Security | BlueWhale</title>
      </Head>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Account Security</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar with user info */}
          <div className="md:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-blue-100 text-blue-800 rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{user?.username}</h2>
                  <p className="text-gray-500 text-sm">{user?.email || 'No email provided'}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500">
                  Last login: {user?.last_login ? new Date(user.last_login).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="md:col-span-2 space-y-6">
            {/* Password change section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Change Password</h2>
              
              {passwordError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {passwordError}
                </div>
              )}
              
              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                  {passwordSuccess}
                </div>
              )}
              
              <form onSubmit={handlePasswordChange}>
                <div className="mb-4">
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                    minLength={8}
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                    minLength={8}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
            
            {/* Session management section */}
            <SessionManagement />
          </div>
        </div>
      </div>
    </>
  );
};

export default withAuth(SecurityPage);
