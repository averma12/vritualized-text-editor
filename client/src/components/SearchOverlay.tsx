import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface SearchResult {
  chunkIndex: number;
  excerpt: string;
}

interface SearchOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  documentId: string;
  onResultClick: (chunkIndex: number) => void;
}

export function SearchOverlay({ isVisible, onClose, documentId, onResultClick }: SearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['/api/documents', documentId, 'search', debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
  });

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      
      {/* Search Overlay */}
      <div className="fixed top-20 right-6 bg-surface rounded-lg shadow-xl border border-gray-200 w-80 z-50">
        <div className="p-4">
          <div className="relative mb-3">
            <input 
              type="text" 
              placeholder="Search in document..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-textSecondary"></i>
          </div>
          
          {/* Search Status */}
          {debouncedQuery && (
            <div className="text-xs text-textSecondary mb-3">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                  <span>Searching...</span>
                </div>
              ) : (
                `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} found`
              )}
            </div>
          )}
          
          {/* Search Results */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div 
                key={`${result.chunkIndex}-${index}`}
                className="p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                onClick={() => {
                  onResultClick(result.chunkIndex);
                  onClose();
                }}
              >
                <div className="text-sm font-medium text-textPrimary">
                  Page {result.chunkIndex + 1}
                </div>
                <div className="text-xs text-textSecondary truncate">
                  {result.excerpt}
                </div>
              </div>
            ))}
            
            {/* No Results */}
            {debouncedQuery && !isLoading && searchResults.length === 0 && (
              <div className="text-center py-4 text-textSecondary text-sm">
                No results found for "{debouncedQuery}"
              </div>
            )}
            
            {/* Search Prompt */}
            {!debouncedQuery && (
              <div className="text-center py-4 text-textSecondary text-sm">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
