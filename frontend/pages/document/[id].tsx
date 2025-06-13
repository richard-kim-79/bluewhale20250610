import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Document } from '../../types';
import { getDocument, deleteDocument } from '../../lib/api';
import { FaTag, FaStar, FaShare, FaTrash, FaSpinner } from 'react-icons/fa';

interface DocumentPageProps {
  document: Document;
}

const DocumentPage: React.FC<DocumentPageProps> = ({ document }) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Handle share link copy
  const handleCopyLink = () => {
    const url = `${window.location.origin}/document/${document.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle document deletion
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDeleting(true);
      try {
        await deleteDocument(document.id);
        router.push('/');
      } catch (error) {
        console.error('Error deleting document:', error);
        setDeleting(false);
        alert('Failed to delete document. Please try again.');
      }
    }
  };

  return (
    <Layout title={document.title}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-primary-800">{document.title}</h1>
            
            <div className="flex space-x-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center px-3 py-1 bg-primary-50 text-primary-700 rounded hover:bg-primary-100"
              >
                <FaShare className="mr-1" />
                {copied ? 'Copied!' : 'Share'}
              </button>
              
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
              >
                {deleting ? (
                  <FaSpinner className="animate-spin mr-1" />
                ) : (
                  <FaTrash className="mr-1" />
                )}
                Delete
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {document.tags && document.tags.map((tag, index) => (
              <span 
                key={index} 
                className="inline-flex items-center bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded"
              >
                <FaTag className="mr-1" /> {tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center text-sm text-gray-600 mb-6">
            <FaStar className="text-yellow-500 mr-1" />
            <span>AI Citations: {document.ai_citation_count}</span>
            <span className="mx-2">•</span>
            <span>Trust Score: {document.trust_score.toFixed(2)}</span>
            <span className="mx-2">•</span>
            <span>Uploaded: {new Date(document.created_at).toLocaleDateString()}</span>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Summary</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-700">{document.summary}</p>
            </div>
          </div>
          
          {document.original_text && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Content Preview</h2>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-700 whitespace-pre-line">{document.original_text}</p>
                {document.original_text.length >= 1000 && (
                  <div className="mt-2 text-center">
                    <span className="text-gray-500">Content truncated...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
          <h2 className="text-xl font-semibold text-blue-800 mb-2">AI-Friendly Document</h2>
          <p className="text-blue-700 mb-4">
            This document is optimized for AI retrieval and has been cited {document.ai_citation_count} times.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1 bg-white text-blue-700 rounded border border-blue-200 hover:bg-blue-50">
              JSON
            </button>
            <button className="px-3 py-1 bg-white text-blue-700 rounded border border-blue-200 hover:bg-blue-50">
              Markdown
            </button>
            <button className="px-3 py-1 bg-white text-blue-700 rounded border border-blue-200 hover:bg-blue-50">
              JSON-LD
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = params?.id as string;
  
  try {
    const document = await getDocument(id);
    
    return {
      props: {
        document,
      },
    };
  } catch (error) {
    return {
      notFound: true,
    };
  }
};

export default DocumentPage;
