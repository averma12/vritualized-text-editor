import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';

interface DocumentScrollbarProps {
  scrollProgress: number; // 0-1
  totalChunks: number;
  currentChunk: number;
  onScrollTo: (progress: number) => void;
  onSearch?: (term: string) => void;
}

export function DocumentScrollbar({
  scrollProgress,
  totalChunks,
  currentChunk,
  onScrollTo,
  onSearch
}: DocumentScrollbarProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [jumpTo, setJumpTo] = React.useState('');

  const handleJumpTo = () => {
    const chunkNumber = parseInt(jumpTo);
    if (!isNaN(chunkNumber) && chunkNumber >= 1 && chunkNumber <= totalChunks) {
      const progress = Math.max(0, Math.min(1, (chunkNumber - 1) / Math.max(1, totalChunks - 1)));
      onScrollTo(progress);
      setJumpTo(''); // Clear input after navigation
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      onSearch?.(searchTerm.trim());
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-l border-gray-200 p-4 flex flex-col">
      {/* Document Progress */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Document Progress</h3>
        <div className="bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
        <div className="text-xs text-gray-600">
          Section {Math.floor(currentChunk + 1)} of {totalChunks}
        </div>
        <div className="text-xs text-gray-500">
          {Math.round(scrollProgress * 100)}% complete
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Navigation</h3>
        
        {/* Jump to section */}
        <div className="flex gap-2 mb-3">
          <Input
            type="number"
            placeholder="Go to..."
            value={jumpTo}
            onChange={(e) => setJumpTo(e.target.value)}
            className="text-xs h-8"
            min={1}
            max={totalChunks}
          />
          <Button 
            size="sm" 
            onClick={handleJumpTo}
            className="h-8 px-3"
          >
            Go
          </Button>
        </div>

        {/* Quick scroll buttons */}
        <div className="flex gap-2 mb-3">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onScrollTo(0)}
            className="flex-1 h-8"
          >
            <ArrowUp className="w-3 h-3 mr-1" />
            Top
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onScrollTo(1)}
            className="flex-1 h-8"
          >
            <ArrowDown className="w-3 h-3 mr-1" />
            End
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Search Document</h3>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs h-8"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button 
            size="sm" 
            onClick={handleSearch}
            className="h-8 px-3"
          >
            <Search className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Document Stats */}
      <div className="text-xs text-gray-500 mt-auto">
        <div className="mb-1">Total sections: {totalChunks}</div>
        <div>Current: Section {currentChunk + 1}</div>
      </div>
    </div>
  );
}