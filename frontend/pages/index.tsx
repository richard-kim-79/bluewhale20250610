import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import SearchBar from '../components/SearchBar';
import FeedTabs from '../components/FeedTabs';
import DocumentCard from '../components/DocumentCard';
import { Document, FeedTab } from '../types';
import { searchDocuments } from '../lib/api';
import { FaSpinner } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

interface HomeProps {
  initialDocuments: Document[];
}

const Home: React.FC<HomeProps> = ({ initialDocuments }) => {
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle tab change
  const handleTabChange = async (tab: FeedTab) => {
    setActiveTab(tab);
    setLoading(true);
    
    try {
      // In a real app, we would fetch different data based on the tab
      // For now, we'll simulate this with different search queries
      let query = '';
      
      switch (tab) {
        case 'for-you':
          query = 'recommended';
          break;
        case 'local':
          query = 'local';
          break;
        case 'global':
          query = 'popular';
          break;
      }
      
      const response = await searchDocuments(query);
      // Convert search results to Document type with required fields
      const docs = response.results.map(result => ({
        ...result,
        created_at: result.created_at || new Date().toISOString(),
        // Add any other required fields that might be missing
      }));
      setDocuments(docs as Document[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Home">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <SearchBar placeholder="Discover knowledge..." />
        </div>
        
        <FeedTabs activeTab={activeTab} onTabChange={handleTabChange} />
        
        {loading ? (
          <div className="flex justify-center py-12">
            <FaSpinner className="text-primary-500 text-4xl animate-spin" />
          </div>
        ) : documents.length > 0 ? (
          <div>
            {documents.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No documents found.</p>
            {activeTab === 'for-you' && (
              <p className="text-gray-500 mt-2">
                Upload documents or follow users to see personalized content.
              </p>
            )}
          </div>
        )}
        
        {activeTab === 'global' && documents.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h3 className="text-lg font-medium text-blue-800 mb-2">
              AI-Powered Recommendations
            </h3>
            <p className="text-blue-700">
              These documents are ranked based on AI citation count and semantic relevance.
              GPT-4 has referenced the top document {documents[0].ai_citation_count} times.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async () => {
  // In a real app, we would fetch initial documents from the API
  // For now, we'll return empty array as placeholder
  const initialDocuments: Document[] = [];
  
  return {
    props: {
      initialDocuments,
    },
  };
};

export default Home;
