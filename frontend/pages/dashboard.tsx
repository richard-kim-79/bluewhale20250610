import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Document } from '../types';
import { withAuth } from '../utils/auth';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        // In a real implementation, we would fetch documents for the current user
        // For now, we'll just fetch all documents
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/search?q=&limit=10`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }
        
        const data = await response.json();
        setDocuments(data.results || []);
      } catch (err: any) {
        console.error('Error fetching documents:', err);
        setError(err.message || 'Failed to fetch documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user]);

  const handleUploadClick = () => {
    router.push('/upload');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">BlueWhale Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user?.full_name || user?.username || 'User'}
              </span>
              <button
                onClick={() => api.logout()}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Your Documents</h2>
              <button
                onClick={handleUploadClick}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Upload New Document
              </button>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">You don't have any documents yet.</p>
                <button
                  onClick={handleUploadClick}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Upload Your First Document
                </button>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <li key={doc.id}>
                      <Link href={`/document/${doc.id}`}>
                        <a className="block hover:bg-gray-50">
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-blue-600 truncate">
                                {doc.title}
                              </p>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {doc.processing_status || 'completed'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  {doc.summary?.substring(0, 100)}...
                                </p>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                <p>
                                  {new Date(doc.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </a>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return withAuth(context);
};

export default Dashboard;
