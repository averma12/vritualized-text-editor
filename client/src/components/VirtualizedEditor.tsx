import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVirtualization } from '@/hooks/useVirtualization';
import { useAudioSync } from '@/hooks/useAudioSync';
import { DocumentPage } from './DocumentPage';
import { type DocumentChunk } from '@shared/schema';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { safeSync, handleVirtualizationError } from '@/lib/errorHandler';

interface VirtualizedEditorProps {
  documentId: string;
  chunks: DocumentChunk[];
  currentPage?: number;
  onPageChange?: (page: number) => void;
  audioTimestamps?: Array<{word: string, start: number, end: number}>;
  currentPlaybackTime?: number;
  chunkSize?: number;
  bufferSize?: number;
}

export function VirtualizedEditor({ 
  documentId, 
  chunks, 
  currentPage: externalCurrentPage,
  onPageChange: externalOnPageChange,
  audioTimestamps = [], 
  currentPlaybackTime = 0,
  chunkSize = 2000,
  bufferSize = 2
}: VirtualizedEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    visibleChunks,
    totalPages,
    currentPage: internalCurrentPage,
    handleScroll,
    scrollToChunk,
    setCurrentPage: setInternalCurrentPage
  } = useVirtualization({
    chunks,
    containerRef,
    chunkSize,
    bufferSize
  });

  const {
    highlightedWordIndex,
    currentChunkIndex
  } = useAudioSync({
    audioTimestamps,
    currentPlaybackTime,
    chunks
  });

  // Use external page control if provided, otherwise use internal
  const effectiveCurrentPage = externalCurrentPage !== undefined ? externalCurrentPage : internalCurrentPage;
  
  // Handle external page changes by ensuring target page is rendered first
  useEffect(() => {
    if (externalCurrentPage !== undefined && externalCurrentPage !== internalCurrentPage) {
      console.log('🔄 VirtualizedEditor: External page change to', externalCurrentPage);
      // First call scrollToChunk to ensure the target page gets rendered
      scrollToChunk(externalCurrentPage);
    }
  }, [externalCurrentPage, internalCurrentPage, scrollToChunk]);

  // Notify external when internal page changes (from scrolling)
  useEffect(() => {
    if (externalOnPageChange && externalCurrentPage === undefined) {
      externalOnPageChange(internalCurrentPage);
    }
  }, [internalCurrentPage, externalOnPageChange, externalCurrentPage]);

  // Auto-scroll to current audio position
  useEffect(() => {
    if (currentChunkIndex !== -1 && currentChunkIndex !== effectiveCurrentPage) {
      scrollToChunk(currentChunkIndex);
    }
  }, [currentChunkIndex, effectiveCurrentPage, scrollToChunk]);

  // Listen for search result navigation
  useEffect(() => {
    const handleScrollToChunk = (event: any) => {
      scrollToChunk(event.detail);
    };

    window.addEventListener('scrollToChunk', handleScrollToChunk);
    return () => window.removeEventListener('scrollToChunk', handleScrollToChunk);
  }, [scrollToChunk]);

  const handleChunkEdit = useCallback((chunkIndex: number, newContent: string) => {
    // TODO: Implement chunk editing logic
    // This would update the chunk content and sync with backend
    console.log('Editing chunk', chunkIndex, newContent);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Editor Toolbar */}
      <div className="bg-surface border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-4">
          {/* Formatting Tools */}
          <div className="flex items-center space-x-1">
            <button className="p-2 text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded transition-colors">
              <i className="fas fa-bold"></i>
            </button>
            <button className="p-2 text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded transition-colors">
              <i className="fas fa-italic"></i>
            </button>
            <button className="p-2 text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded transition-colors">
              <i className="fas fa-underline"></i>
            </button>
          </div>
          
          <div className="h-6 w-px bg-gray-300"></div>
          
          {/* Alignment Tools */}
          <div className="flex items-center space-x-1">
            <button className="p-2 text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded transition-colors">
              <i className="fas fa-align-left"></i>
            </button>
            <button className="p-2 text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded transition-colors">
              <i className="fas fa-align-center"></i>
            </button>
            <button className="p-2 text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded transition-colors">
              <i className="fas fa-align-right"></i>
            </button>
          </div>
          
          <div className="h-6 w-px bg-gray-300"></div>
          
          {/* View Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-textSecondary">Zoom:</span>
            <select className="text-sm border border-gray-300 rounded px-2 py-1">
              <option value="75">75%</option>
              <option value="100">100%</option>
              <option value="125">125%</option>
              <option value="150">150%</option>
            </select>
          </div>
          
          <div className="flex-1"></div>
          
          {/* Performance Indicator */}
          <div className="flex items-center space-x-2 text-sm text-textSecondary">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow"></div>
              <span>Virtualized</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Virtualized Document Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 p-6"
        onScroll={handleScroll}
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {visibleChunks.map((chunk, index) => (
          <DocumentPage
            key={`${chunk.id}-${chunk.chunkIndex}`}
            chunk={chunk}
            pageNumber={chunk.chunkIndex + 1}
            totalPages={totalPages}
            isActive={chunk.chunkIndex === effectiveCurrentPage}
            highlightedWordIndex={chunk.chunkIndex === currentChunkIndex ? highlightedWordIndex : -1}
            onEdit={(content: string) => handleChunkEdit(chunk.chunkIndex, content)}
            audioTimestamps={audioTimestamps}
          />
        ))}
        
        {/* Spacer for smooth scrolling */}
        {visibleChunks.length > 0 && (
          <div className="h-4"></div>
        )}
      </div>
    </div>
  );
}
