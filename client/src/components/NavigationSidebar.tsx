import React from 'react';
import { type DocumentChunk } from '@shared/schema';

interface NavigationSidebarProps {
  chunks: DocumentChunk[];
  currentPage: number;
  totalPages: number;
  onPageClick: (pageIndex: number) => void;
  documentProgress: number;
  chunkSize: number;
  bufferSize: number;
  onChunkSizeChange: (size: number) => void;
  onBufferSizeChange: (size: number) => void;
}

export function NavigationSidebar({ 
  chunks, 
  currentPage, 
  totalPages, 
  onPageClick,
  documentProgress,
  chunkSize,
  bufferSize,
  onChunkSizeChange,
  onBufferSizeChange
}: NavigationSidebarProps) {
  
  const getPageThumbnail = (chunk: DocumentChunk, isActive: boolean) => {
    const preview = chunk.content.substring(0, 200);
    
    if (isActive) {
      return (
        <div className="h-16 bg-white rounded text-xs p-2 leading-tight overflow-hidden border">
          {preview}...
        </div>
      );
    }
    
    return (
      <div className="h-16 bg-gray-50 rounded text-xs text-gray-400 p-2 leading-tight overflow-hidden">
        <div className="loading-skeleton h-2 w-full mb-1 rounded"></div>
        <div className="loading-skeleton h-2 w-4/5 mb-1 rounded"></div>
        <div className="loading-skeleton h-2 w-full mb-1 rounded"></div>
        <div className="loading-skeleton h-2 w-3/4 rounded"></div>
      </div>
    );
  };

  return (
    <aside className="w-80 bg-surface border-r border-gray-200 flex flex-col">
      {/* Navigation Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-textPrimary mb-3">Document Navigation</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-textSecondary">
            <span>Current Position</span>
            <span 
              className="hover:text-primary cursor-pointer transition-colors"
              onClick={() => onPageClick(currentPage)}
              title="Click to go to current page"
            >
              Page {currentPage + 1} of {totalPages}
            </span>
          </div>
          <div 
            className="w-full bg-gray-200 rounded-full h-1.5 cursor-pointer hover:h-2 transition-all duration-200"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickPosition = (e.clientX - rect.left) / rect.width;
              const targetPage = Math.floor(clickPosition * totalPages);
              onPageClick(Math.max(0, Math.min(totalPages - 1, targetPage)));
            }}
            title="Click to navigate to any position"
          >
            <div 
              className="bg-primary h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${documentProgress}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Virtualization Controls */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-textPrimary mb-3">Performance Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-textSecondary">Chunk Size</span>
            <select 
              className="text-xs border border-gray-300 rounded px-2 py-1"
              value={chunkSize}
              onChange={(e) => onChunkSizeChange(Number(e.target.value))}
            >
              <option value="1000">1K words</option>
              <option value="2000">2K words</option>
              <option value="5000">5K words</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-textSecondary">Buffer Pages</span>
            <select 
              className="text-xs border border-gray-300 rounded px-2 py-1"
              value={bufferSize}
              onChange={(e) => onBufferSizeChange(Number(e.target.value))}
            >
              <option value="1">1 page</option>
              <option value="2">2 pages</option>
              <option value="3">3 pages</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-textSecondary">Lazy Loading</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Page Thumbnails */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-medium text-textPrimary mb-3">Page Overview</h3>
        <div className="space-y-2">
          {chunks.map((chunk, index) => {
            const isActive = index === currentPage;
            const pageNumber = index + 1;
            
            return (
              <div 
                key={chunk.id}
                className={`page-thumbnail p-2 rounded-lg cursor-pointer transition-colors ${
                  isActive 
                    ? 'border-2 border-primary bg-blue-50' 
                    : 'border border-gray-200 hover:border-primary'
                }`}
                onClick={() => onPageClick(index)}
              >
                <div className={`text-xs mb-1 ${isActive ? 'text-primary font-medium' : 'text-textSecondary'}`}>
                  Page {pageNumber} {isActive && '(Current)'}
                </div>
                {getPageThumbnail(chunk, isActive)}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
