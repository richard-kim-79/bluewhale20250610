import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { FaSearch } from 'react-icons/fa';

interface SearchBarProps {
  initialQuery?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  initialQuery = '', 
  onSearch,
  placeholder = 'Search documents...'
}) => {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (query.trim()) {
      if (onSearch) {
        onSearch(query);
      } else {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-field pl-10 pr-4 py-3 w-full"
          placeholder={placeholder}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="text-gray-400" />
        </div>
        <button
          type="submit"
          className="absolute inset-y-0 right-0 px-4 text-primary-600 font-medium"
        >
          Search
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
