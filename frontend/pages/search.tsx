import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import SearchBar from '../components/SearchBar';
import DocumentCard from '../components/DocumentCard';
import { SearchResult } from '../types';
import { searchDocuments } from '../lib/api';
import { FaSpinner, FaSort } from 'react-icons/fa';

interface SearchPageProps {
  initialQuery: string;
  initialResults: SearchResult[];
}

const Search: React.FC<SearchPageProps> = ({ initialQuery, initialResults }) => {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'citations'>('relevance');

  useEffect(() => {
    if (router.query.q && router.query.q !== query) {
      setQuery(router.query.q as string);
      handleSearch(router.query.q as string);
    }
  }, [router.query.q]);

  const handleSearch = async (searchQuery: string) => {
    setLoading(true);
    
    try {
      const response = await searchDocuments(searchQuery);
      setResults(response.results);
    } catch (error) {
      console.error('Error searching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (sort: 'relevance' | 'citations') => {
    setSortBy(sort);
    
    // Sort the results
    const sortedResults = [...results];
    if (sort === 'relevance') {
      sortedResults.sort((a, b) => b.embedding_similarity - a.embedding_similarity);
    } else {
      sortedResults.sort((a, b) => b.ai_citation_count - a.ai_citation_count);
    }
    
    setResults(sortedResults);
  };

  return (
    <Layout title="Search">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <SearchBar initialQuery={query} onSearch={handleSearch} />
        </div>
        
        {query && (
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {results.length} results for "{query}"
              </h2>
              
              <div className="flex items-center">
                <span className="mr-2 text-sm text-gray-600">Sort by:</span>
                <div className="relative inline-block text-left">
                  <div className="flex rounded-md shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleSortChange('relevance')}
                      className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                        sortBy === 'relevance'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      } border border-gray-300`}
                    >
                      Relevance
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSortChange('citations')}
                      className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                        sortBy === 'citations'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      } border border-gray-300 border-l-0`}
                    >
                      AI Citations
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-12">
            <FaSpinner className="text-primary-500 text-4xl animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div>
            {results.map((result) => (
              <DocumentCard 
                key={result.id} 
                document={result} 
                showSimilarity={true} 
              />
            ))}
          </div>
        ) : query ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No results found for "{query}".</p>
            <p className="text-gray-500 mt-2">
              Try using different keywords or upload relevant documents.
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Enter a search query to find documents.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const initialQuery = query.q as string || '';
  let initialResults: SearchResult[] = [];
  
  if (initialQuery) {
    try {
      const response = await searchDocuments(initialQuery);
      initialResults = response.results;
    } catch (error) {
      console.error('Error fetching initial search results:', error);
    }
  }
  
  return {
    props: {
      initialQuery,
      initialResults,
    },
  };
};

export default Search;
