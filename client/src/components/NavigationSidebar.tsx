import React, { useState, useMemo } from 'react';
import { type DocumentChunk } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface NavigationSidebarProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (pageIndex: number) => void;
  onPageClick?: (pageIndex: number) => void;
  documentId?: string;
  // Additional props for editor.tsx compatibility
  chunks?: any[];
  documentProgress?: number;
  chunkSize?: number;
  bufferSize?: number;
  onChunkSizeChange?: (size: number) => void;
  onBufferSizeChange?: (size: number) => void;
}

export function NavigationSidebar({ 
  currentPage, 
  totalPages, 
  onPageChange,
  onPageClick,
  documentId,
  ...otherProps
}: NavigationSidebarProps) {
  const [jumpToPage, setJumpToPage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Smart pagination - only show relevant pages
  const visiblePages = useMemo(() => {
    if (totalPages <= 10) {
      // Show all pages if 10 or fewer
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const current = currentPage + 1; // Convert to 1-based
    const pages: (number | string)[] = [];

    // Always show first page
    pages.push(1);

    // Add ellipsis if there's a gap
    if (current > 4) {
      pages.push('...');
    }

    // Show pages around current page
    const start = Math.max(2, current - 2);
    const end = Math.min(totalPages - 1, current + 2);

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    // Add ellipsis if there's a gap before last page
    if (current < totalPages - 3) {
      if (!pages.includes('...')) {
        pages.push('...');
      }
    }

    // Always show last page (if not already included)
    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  const handlePageClick = (pageIndex: number) => {
    console.log('🖱️ NavigationSidebar: Page clicked', pageIndex + 1, 'index:', pageIndex);
    if (onPageChange) {
      onPageChange(pageIndex);
    } else if (onPageClick) {
      onPageClick(pageIndex);
    }
  };

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      handlePageClick(pageNum - 1); // Convert to 0-based index
      setJumpToPage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  return (
    <aside className="w-80 bg-card border-r flex flex-col">
      {/* Navigation Header */}
      <div className="p-4 border-b space-y-4">
        <div>
          <h2 className="text-sm font-semibold mb-2">Document Navigation</h2>
          <div className="text-xs text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </div>
        </div>

        {/* Quick Navigation Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageClick(0)}
            disabled={currentPage === 0}
            className="px-2"
          >
            <ChevronsLeft className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageClick(currentPage - 1)}
            disabled={currentPage === 0}
            className="px-2"
          >
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageClick(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            className="px-2"
          >
            <ChevronRight className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageClick(totalPages - 1)}
            disabled={currentPage === totalPages - 1}
            className="px-2"
          >
            <ChevronsRight className="w-3 h-3" />
          </Button>
        </div>

        {/* Jump to Page */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Go to page..."
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 h-8 text-xs"
            type="number"
            min="1"
            max={totalPages}
          />
          <Button
            size="sm"
            onClick={handleJumpToPage}
            disabled={!jumpToPage || parseInt(jumpToPage) < 1 || parseInt(jumpToPage) > totalPages}
            className="h-8 px-2 text-xs"
          >
            Go
          </Button>
        </div>
      </div>

      {/* Smart Page List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {visiblePages.map((pageItem, index) => {
            if (pageItem === '...') {
              return (
                <div
                  key={`ellipsis-${index}`}
                  className="text-center py-2 text-muted-foreground text-xs"
                >
                  ⋯
                </div>
              );
            }

            const pageNumber = pageItem as number;
            const pageIndex = pageNumber - 1;
            const isActive = pageIndex === currentPage;
            
            return (
              <button
                key={pageNumber}
                onClick={() => handlePageClick(pageIndex)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary font-medium border border-primary/20" 
                    : "hover:bg-accent text-foreground border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>Page {pageNumber}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mt-6 pt-4 border-t">
          <div className="text-xs text-muted-foreground mb-2">Progress</div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-center">
            {Math.round(((currentPage + 1) / totalPages) * 100)}% complete
          </div>
        </div>
      </div>
    </aside>
  );
}
