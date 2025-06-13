import React from 'react';
import Link from 'next/link';
import { Document, SearchResult } from '../types';
import { FaExternalLinkAlt, FaTag, FaStar } from 'react-icons/fa';

interface DocumentCardProps {
  document: Document | SearchResult;
  showSimilarity?: boolean;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, showSimilarity = false }) => {
  // Check if the document is a SearchResult with embedding_similarity
  const isSearchResult = 'embedding_similarity' in document;
  
  return (
    <div className="card mb-4">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-semibold text-primary-700 mb-2">{document.title}</h3>
        <Link href={`/document/${document.id}`} className="text-primary-600 hover:text-primary-800">
          <FaExternalLinkAlt />
        </Link>
      </div>
      
      {document.summary && (
        <p className="text-gray-700 mb-4">{document.summary}</p>
      )}
      
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
      
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div className="flex items-center">
          <FaStar className="text-yellow-500 mr-1" />
          <span>AI Citations: {document.ai_citation_count}</span>
        </div>
        
        <div className="flex items-center">
          <span className="mr-2">Trust Score: {document.trust_score.toFixed(2)}</span>
          
          {isSearchResult && showSimilarity && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
              {(document as SearchResult).embedding_similarity.toFixed(2)} similarity
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
