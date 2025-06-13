import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Session {
  id: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  last_used: string;
  is_current: boolean;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

const getBrowserIcon = (userAgent: string): string => {
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome')) return '🌐';
  if (ua.includes('firefox')) return '🦊';
  if (ua.includes('safari') && !ua.includes('chrome')) return '🧭';
  if (ua.includes('edge')) return '📱';
  if (ua.includes('opera')) return '🔴';
  return '🌐';
};

const getDeviceType = (userAgent: string): string => {
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS Device';
  if (ua.includes('android')) return 'Android Device';
  if (ua.includes('windows')) return 'Windows Device';
  if (ua.includes('mac')) return 'Mac Device';
  if (ua.includes('linux')) return 'Linux Device';
  return 'Unknown Device';
};

const SessionManagement: React.FC = () => {
  const { sessions, loadingSessions, getSessions, logoutAllDevices } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load sessions when component mounts
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      await getSessions();
    } catch (err) {
      setError('Failed to load sessions');
      console.error('Error loading sessions:', err);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (window.confirm('Are you sure you want to log out from all devices?')) {
      setIsLoading(true);
      try {
        await logoutAllDevices();
      } catch (err) {
        setError('Failed to log out from all devices');
        console.error('Error logging out from all devices:', err);
        setIsLoading(false);
      }
    }
  };

  if (loadingSessions) {
    return <div className="p-4 text-center">Loading sessions...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        {error}
        <button 
          onClick={() => { setError(null); loadSessions(); }}
          className="ml-4 text-blue-500 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Active Sessions</h2>
        <button
          onClick={handleLogoutAllDevices}
          disabled={isLoading}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Logout All Devices'}
        </button>
      </div>

      {sessions && sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session: Session) => (
            <div 
              key={session.id}
              className={`border rounded-lg p-4 ${session.is_current ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{getBrowserIcon(session.user_agent)}</span>
                    <div>
                      <p className="font-medium">{getDeviceType(session.user_agent)}</p>
                      <p className="text-sm text-gray-500">{session.user_agent.substring(0, 50)}...</p>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>IP Address: {session.ip_address}</p>
                    <p>Created: {formatDate(session.created_at)}</p>
                    <p>Last Used: {formatDate(session.last_used)}</p>
                  </div>
                </div>
                {session.is_current && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    Current Session
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          No active sessions found
        </div>
      )}
    </div>
  );
};

export default SessionManagement;
