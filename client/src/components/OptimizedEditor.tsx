import React, { useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { type DocumentChunk } from '@shared/schema';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { useSearchWorker } from '@/hooks/useSearchWorker';
import { useAudioSync } from '@/hooks/useAudioSync';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  
  // Apply CSS transforms for positioning (GPU accelerated)
  const style = useMemo(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: `${height}px`,
    transform: `translateY(${offset}px)`,
    willChange: isVisible ? 'transform' : 'auto',
    opacity: isVisible ? 1 : 0,
    pointerEvents: isVisible ? 'auto' as const : 'none' as const,
    transition: 'opacity 0.2s ease-in-out'
  }), [offset, height, isVisible]);
  
  // Render content with highlights using CSS classes (avoid DOM manipulation)
  const renderContent = useMemo(() => {
    const words = chunk.content.split(/\s+/);
    let wordIndex = 0;
    
    return words.map((word, i) => {
      const isHighlighted = highlightedWordIndex === wordIndex++;
      const isSearchMatch = searchMatches.has(word.toLowerCase());
      
      // Use CSS classes for styling (no inline styles)
      let className = 'inline-block mx-1';
      if (isHighlighted) {
        className += ' highlight-audio';
      } else if (isSearchMatch) {
        className += ' highlight-search';
      }
      
      return (
        <span key={i} className={className}>
          {word}
        </span>
      );
    });
  }, [chunk.content, highlightedWordIndex, searchMatches]);
  
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (onContentChange && contentRef.current) {
      const newContent = contentRef.current.textContent || '';
      onContentChange(newContent);
    }
  }, [onContentChange]);
  
  return (
    <div style={style} className="chunk-container">
      <div 
        ref={contentRef}
        className="px-12 py-4 text-base leading-relaxed"
        contentEditable={isVisible}
        suppressContentEditableWarning
        onInput={handleInput}
      >
        {renderContent}
      </div>
      {/* Soft page boundary indicator */}
      <div className="page-boundary-indicator" />
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
  searchTerm = ''
}: OptimizedEditorProps) {
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
    overscan: 3,
    scrollThreshold: 0.8
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
            {/* Render only visible chunks */}
            {virtualItems.map(item => (
              <ChunkRenderer
                key={item.index}
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