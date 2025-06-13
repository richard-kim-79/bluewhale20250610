import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

const LogoutPage: React.FC = () => {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Perform logout
    logout();
    
    // Redirect to login page
    router.push('/login');
  }, [logout, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Logging out...</h1>
        <p className="text-gray-600">You are being redirected to the login page.</p>
        <div className="mt-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default LogoutPage;
