import React from 'react';
import { type DocumentChunk } from '@shared/schema';

interface NavigationSidebarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  documentId: string;
}

export function NavigationSidebar({ 
  currentPage, 
  totalPages, 
  onPageChange,
  documentId
}: NavigationSidebarProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <aside className="w-80 bg-card border-r flex flex-col">
      {/* Navigation Header */}
      <div className="p-4 border-b">
        <h2 className="text-sm font-semibold mb-3">Document Navigation</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Page {currentPage + 1} of {totalPages}</span>
          </div>
        </div>
      </div>

      {/* Page List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {pages.map((pageNumber) => {
            const pageIndex = pageNumber - 1;
            const isActive = pageIndex === currentPage;
            
            return (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageIndex)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isActive 
                    ? "border-primary bg-primary/10 shadow-sm" 
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}>
                    Page {pageNumber}
                  </span>
                  {isActive && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
