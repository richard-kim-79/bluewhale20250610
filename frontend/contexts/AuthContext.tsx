import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import api, { UserProfile } from '../lib/api';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  isAuthenticated: boolean;
  sessions: any[] | null;
  loadingSessions: boolean;
  getSessions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // With HttpOnly cookies, we just need to call getCurrentUser
        // The cookies will be sent automatically with the request
        const userData = await api.getCurrentUser();
        setUser(userData);
      } catch (err) {
        // User is not authenticated or token is invalid
        // No need to clear cookies as they are HttpOnly and managed by the server
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Login will set HttpOnly cookies automatically
      await api.login({ username, password });
      
      // Get user data
      const userData = await api.getCurrentUser();
      setUser(userData);
      
      // Redirect to dashboard after successful login
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // This will clear HttpOnly cookies on the server
      await api.logout();
      setUser(null);
      setSessions(null);
      
      // Redirect to login page after logout
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear user state
      setUser(null);
      router.push('/login');
    }
  };
  
  const logoutAllDevices = async () => {
    try {
      setLoading(true);
      // This will revoke all refresh tokens and clear cookies
      await api.logoutAllDevices();
      setUser(null);
      setSessions(null);
      
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout all devices error:', error);
      setError('Failed to logout from all devices');
    } finally {
      setLoading(false);
    }
  };
  
  const updateProfile = async (data: any) => {
    try {
      setLoading(true);
      const updatedUser = await api.updateUserProfile(data);
      setUser(updatedUser);
      // No return needed as the function is typed to return Promise<void>
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Profile update failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const getSessions = async () => {
    try {
      setLoadingSessions(true);
      const sessionData = await api.getSessions();
      setSessions(sessionData);
    } catch (error) {
      console.error('Get sessions error:', error);
      setError('Failed to fetch active sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        logoutAllDevices,
        updateProfile,
        isAuthenticated: !!user,
        sessions,
        loadingSessions,
        getSessions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
