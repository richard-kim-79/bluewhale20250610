import React, { useEffect, ComponentType, FC } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

// Higher-order component for route protection
const withAuth = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const WithAuth: FC<P> = (props) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // If authentication check is complete and user is not authenticated
      if (!loading && !user) {
        // Redirect to login page with return URL
        router.push(`/login?returnUrl=${encodeURIComponent(router.asPath)}`);
      }
    }, [user, loading, router]);

    // Show loading state while checking authentication
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    // If user is authenticated, render the protected component
    if (user) {
      return <WrappedComponent {...props} />;
    }

    // Return null while redirecting
    return null;
  };

  // Copy display name from the wrapped component
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  WithAuth.displayName = `withAuth(${displayName})`;
  
  return WithAuth;
};

export default withAuth;
