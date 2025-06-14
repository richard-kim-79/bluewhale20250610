import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Layout from '../components/Layout';
import DocumentCard from '../components/DocumentCard';
import ProtectedRoute from '../components/ProtectedRoute';
import MFASettings from '../components/MFASettings';
import { Document, UserRecommendation } from '../types';
import { Document as ApiDocument } from '../lib/api';
import api, { UpdateProfileData } from '../lib/api';
import { FaUser, FaSpinner, FaEdit, FaCheck, FaExclamationTriangle, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { withAuth } from '../utils/auth';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [recommendations, setRecommendations] = useState<UserRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<UpdateProfileData>({
    email: '',
    full_name: '',
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Initialize form data with current user data
      setProfileData({
        email: user.email || '',
        full_name: user.full_name || '',
      });
    }
  }, [user]);

  const fetchProfileData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch user's documents
        if (!user || !user.id) {
          throw new Error('User ID not available');
        }
        
        const apiDocs = await api.getUserDocuments(user.id);
        
        // Convert API Document type to our Document type with required fields
        const processedDocs = apiDocs.map((doc: ApiDocument): Document => ({
          ...doc,
          created_at: doc.created_at || new Date().toISOString(),
          ai_citation_count: 0, // Default value
          trust_score: 1.0, // Default value
        }));
        
        setDocuments(processedDocs);
        
        // In a real app, we would fetch recommendations
        // For now, we'll just simulate the data
        setRecommendations({
          similar_users: [
            {
              id: '789',
              username: 'ai_researcher',
              similarity_score: 0.87
            },
            {
              id: '456',
              username: 'data_scientist',
              similarity_score: 0.78
            },
            {
              id: '123',
              username: 'nlp_expert',
              similarity_score: 0.72
            }
          ]
        });
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
  };
  
  useEffect(() => {
    fetchProfileData();
  }, [user]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    
    try {
      await api.updateUserProfile(profileData);
      setUpdateSuccess(true);
      
      // Update the user context with new data
      // This will trigger a re-fetch of the user data
      const userData = await api.getCurrentUser();
      
      // Close the edit form after successful update
      setTimeout(() => {
        setIsEditing(false);
        setUpdateSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setUpdateError(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Layout title="Profile">
        <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <FaSpinner className="text-primary-500 text-4xl animate-spin" />
          </div>
        ) : (
          <>
            {user && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                {!isEditing ? (
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <div className="bg-blue-100 rounded-full p-4 mr-4">
                        <FaUser className="text-blue-600 text-3xl" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-800">{user.username}</h1>
                        <p className="text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-500">
                          Member since {new Date(user.created_at || Date.now()).toLocaleDateString()}
                        </p>
                        {user.full_name && (
                          <p className="text-gray-700 mt-1">{user.full_name}</p>
                        )}
                        {user.role && (
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-2">
                            {user.role}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="h-10 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <FaEdit className="mr-2" /> Edit Profile
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Edit Profile</h3>
                    {updateSuccess && (
                      <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <FaCheck className="h-5 w-5 text-green-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-green-700">Profile updated successfully!</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {updateError && (
                      <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">{updateError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <form className="space-y-4" onSubmit={handleProfileUpdate}>
                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input 
                          id="full_name"
                          name="full_name"
                          type="text" 
                          value={profileData.full_name}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input 
                          id="email"
                          name="email"
                          type="email" 
                          value={profileData.email}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password (leave blank to keep current)</label>
                        <input 
                          id="password"
                          name="password"
                          type="password" 
                          value={profileData.password || ''}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      {profileData.password && (
                        <div>
                          <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">Current Password (required to change password)</label>
                          <input 
                            id="current_password"
                            name="current_password"
                            type="password" 
                            value={profileData.current_password || ''}
                            onChange={handleInputChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required={!!profileData.password}
                          />
                        </div>
                      )}
                      <div className="flex justify-end space-x-3">
                        <button 
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          disabled={updateLoading}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center ${updateLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                          disabled={updateLoading}
                        >
                          {updateLoading ? (
                            <>
                              <FaSpinner className="animate-spin mr-2" />
                              Updating...
                            </>
                          ) : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FaShieldAlt className="mr-2 text-blue-600" />
                Security Settings
              </h2>
              <MFASettings onUpdate={() => fetchProfileData()} />
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
              {documents.length > 0 ? (
                documents.map(document => (
                  <DocumentCard key={document.id} document={document} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  You haven't uploaded any documents yet.
                </p>
              )}
            </div>
            
            {recommendations && recommendations.similar_users.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">People You Might Like</h2>
                <div className="space-y-4">
                  {recommendations.similar_users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <div className="bg-primary-100 rounded-full p-2 mr-3">
                          <FaUser className="text-primary-600" />
                        </div>
                        <span className="font-medium">{user.username}</span>
                      </div>
                      <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                        {Math.round(user.similarity_score * 100)}% similar
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return withAuth(context);
};

export default ProfilePage;
