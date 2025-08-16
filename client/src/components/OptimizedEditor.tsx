import React, { useRef, useEffect, useCallback, useMemo, memo, Fragment } from 'react';
import { type DocumentChunk } from '@shared/schema';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { useSearchWorker } from '@/hooks/useSearchWorker';
import { useAudioSync } from '@/hooks/useAudioSync';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SingleEditorOverlay } from './SingleEditorOverlay';

interface OptimizedEditorProps {
  documentId: string;
  chunks: DocumentChunk[];
  audioTimestamps?: Array<{word: string, start: number, end: number}>;
  currentPlaybackTime?: number;
  onScroll?: (progress: number) => void;
  onContentChange?: (chunkIndex: number, content: string) => void;
  searchTerm?: string;
}

// Memoized chunk renderer for performance
const ChunkRenderer = memo(({ 
  chunk, 
  index, 
  offset,
  height,
  isVisible,
  highlightedWordIndex,
  searchMatches,
  onContentChange
}: {
  chunk: DocumentChunk;
  index: number;
  offset: number;
  height: number;
  isVisible: boolean;
  highlightedWordIndex: number;
  searchMatches: Set<string>;
  onContentChange?: (content: string) => void;
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Apply CSS positioning with isolation to prevent overlap
  const style = useMemo(() => ({
    position: 'absolute' as const,
    top: `${offset}px`,
    left: 0,
    right: 0,
    width: '100%',
    height: `${height}px`,
    visibility: isVisible ? 'visible' as const : 'hidden' as const,
    pointerEvents: isVisible ? 'auto' as const : 'none' as const,
    zIndex: isVisible ? 10 + index : -1, // Unique z-index per chunk
    contain: 'layout style paint size',
    isolation: 'isolate' as const, // Create new stacking context
    backgroundColor: 'white', // Ensure opaque background
    overflow: 'hidden', // Prevent content bleeding
    clipPath: 'inset(0)', // Create isolation boundary
    transform: 'translateZ(0)' // Force layer creation
  }), [offset, height, isVisible, index]);
  
  // Use simple text content - let contentEditable handle formatting
  const renderContent = useMemo(() => {
    return chunk.content;
  }, [chunk.content]);
  
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (!isVisible || !onContentChange || !contentRef.current) return;
    
    // Get current selection to check if user is actively typing
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Debounce content changes to prevent rapid updates
    const newContent = contentRef.current.innerText || '';
    
    // Only update if content actually changed significantly AND user stopped typing
    if (Math.abs(newContent.length - chunk.content.length) > 10) {
      // Delay update to reduce conflicts
      setTimeout(() => {
        if (contentRef.current) {
          onContentChange(contentRef.current.innerText || '');
        }
      }, 300);
    }
  }, [onContentChange, isVisible, chunk.content.length]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isVisible) {
      e.preventDefault();
      return;
    }
    
    // Allow normal editing but prevent cross-chunk navigation
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const selection = window.getSelection();
      if (selection && contentRef.current) {
        const range = selection.getRangeAt(0);
        const rect = contentRef.current.getBoundingClientRect();
        
        // Check if we're at chunk boundaries
        if (e.key === 'ArrowUp' && range.startOffset === 0) {
          e.preventDefault(); // Prevent moving to previous chunk
        }
        if (e.key === 'ArrowDown' && range.startOffset === contentRef.current.innerText.length) {
          e.preventDefault(); // Prevent moving to next chunk
        }
      }
    }
  }, [isVisible]);
  
  return (
    <div style={style} className="chunk-container" data-visible={isVisible}>
      <div 
        ref={contentRef}
        className="px-12 py-4 text-base leading-relaxed editor-content"
        contentEditable={false}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        data-chunk-index={index}
      >
        {renderContent}
      </div>
      {/* Soft page boundary indicator */}
      {index > 0 && <div className="page-boundary-indicator" />}
    </div>
  );
});

ChunkRenderer.displayName = 'ChunkRenderer';

export function OptimizedEditor({
  documentId,
  chunks,
  audioTimestamps = [],
  currentPlaybackTime = 0,
  onScroll,
  onContentChange,
  searchTerm = '',
  scrollToProgress
}: OptimizedEditorProps & { scrollToProgress?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  
  // Fixed height configuration
  const CHUNK_HEIGHT = 400; // Fixed height per chunk
  const CONTAINER_HEIGHT = window.innerHeight - 100; // Account for toolbar
  
  // Virtual scrolling hook
  const {
    virtualItems,
    totalHeight,
    handleScroll,
    getViewportInfo,
    isScrolling
  } = useVirtualScroll({
    chunks,
    itemHeight: CHUNK_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 8, // Increase overscan for better editing experience at boundaries
    scrollThreshold: 0.7
  });
  
  // Search worker hook
  const {
    search,
    searchResults,
    totalMatches,
    isIndexing
  } = useSearchWorker(chunks);
  
  // Audio sync hook
  const { highlightedWordIndex } = useAudioSync({
    audioTimestamps,
    currentPlaybackTime,
    chunks
  });
  
  // Search when term changes
  useEffect(() => {
    if (searchTerm) {
      search(searchTerm);
    }
  }, [searchTerm, search]);
  
  // Convert search results to a set for O(1) lookup
  const searchMatchWords = useMemo(() => {
    const matches = new Set<string>();
    if (searchTerm && searchTerm.length >= 2) {
      const lower = searchTerm.toLowerCase();
      chunks.forEach(chunk => {
        const words = chunk.content.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.includes(lower)) {
            matches.add(word);
          }
        });
      });
    }
    return matches;
  }, [searchTerm, chunks]);
  
  // Handle scroll events with RAF batching
  const handleScrollEvent = useCallback((e: React.UIEvent) => {
    const container = e.currentTarget as HTMLDivElement;
    const scrollTop = container.scrollTop;
    
    // Update virtual scroll
    handleScroll(scrollTop);
    
    // Report progress
    if (onScroll) {
      const { scrollProgress } = getViewportInfo();
      onScroll(scrollProgress);
    }
  }, [handleScroll, getViewportInfo, onScroll]);
  
  // Handle content changes
  const handleChunkChange = useCallback((chunkIndex: number, content: string) => {
    if (onContentChange) {
      onContentChange(chunkIndex, content);
    }
  }, [onContentChange]);

  // Handle external scroll commands
  useEffect(() => {
    if (scrollToProgress !== undefined && containerRef.current) {
      const targetScrollTop = scrollToProgress * (totalHeight - CONTAINER_HEIGHT);
      containerRef.current.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    }
  }, [scrollToProgress, totalHeight, CONTAINER_HEIGHT]);
  
  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col bg-gray-100">
        {/* Show indexing status */}
        {isIndexing && (
          <div className="absolute top-2 right-2 z-10 px-3 py-1 bg-blue-500 text-white text-sm rounded">
            Indexing document...
          </div>
        )}
        
        {/* Show search results count */}
        {searchTerm && totalMatches > 0 && (
          <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-green-500 text-white text-sm rounded">
            Found {totalMatches} matches
          </div>
        )}
        
        {/* Virtual scroll container */}
        <div
          ref={containerRef}
          className={`flex-1 overflow-auto relative optimized-scrollbar ${isScrolling ? 'scroll-optimized' : 'scroll-ended'}`}
          onScroll={handleScrollEvent}
          style={{ height: CONTAINER_HEIGHT }}
        >
          {/* Document container with fixed total height */}
          <div 
            ref={viewportRef}
            className="relative max-w-4xl mx-auto bg-white shadow-lg"
            style={{ 
              height: totalHeight,
              minHeight: '100vh'
            }}
          >
            {/* Render visible chunks as read-only display */}
            {virtualItems.map(item => (
              <ChunkRenderer
                key={`chunk-${item.index}-${item.chunk.id || item.index}`}
                chunk={item.chunk}
                index={item.index}
                offset={item.offset}
                height={item.height}
                isVisible={item.isVisible}
                highlightedWordIndex={highlightedWordIndex}
                searchMatches={searchMatchWords}
                onContentChange={(content) => handleChunkChange(item.index, content)}
              />
            ))}
            
            {/* Single unified editor overlay */}
            <SingleEditorOverlay
              chunks={chunks}
              containerRef={viewportRef}
              onContentChange={handleChunkChange}
              highlightedWordIndex={highlightedWordIndex}
              searchMatches={searchMatchWords}
              searchTerm={searchTerm}
            />
            
            {/* Performance indicator */}
            {isScrolling && (
              <div className="fixed bottom-4 right-4 px-3 py-1 bg-gray-800 text-white text-xs rounded">
                Rendering {virtualItems.filter(i => i.isVisible).length} chunks
              </div>
            )}
          </div>
        </div>
        
        {/* Add CSS for highlight animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          .highlight-audio {
            background-color: #fef3c7;
            border-radius: 2px;
            padding: 0 2px;
            transition: background-color 0.3s ease;
            transform: translateZ(0); /* Force GPU acceleration */
          }
          
          .highlight-search {
            background-color: #bfdbfe;
            border-radius: 2px;
            padding: 0 2px;
            transform: translateZ(0); /* Force GPU acceleration */
          }
          
          .chunk-container {
            backface-visibility: hidden; /* Prevent flickering */
            -webkit-font-smoothing: antialiased;
          }
          
          .page-boundary-indicator {
            height: 1px;
            background: linear-gradient(to right, transparent, #e5e7eb 20%, #e5e7eb 80%, transparent);
            margin: 0 48px;
            opacity: 0.5;
          }
        ` }} />
      </div>
    </ErrorBoundary>
  );
}