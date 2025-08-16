import React, { useRef, useEffect, useCallback, useMemo, memo, Fragment } from 'react';
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
    opacity: isVisible ? 1 : 0.3, // Keep slightly visible to prevent jarring transitions
    pointerEvents: isVisible ? 'auto' as const : 'none' as const,
    transition: 'opacity 0.15s ease-in-out',
    minHeight: `${height}px`, // Ensure minimum height is maintained
    overflow: 'hidden' // Prevent overflow issues at boundaries
  }), [offset, height, isVisible]);
  
  // Render content with highlights using CSS classes (avoid DOM manipulation)
  const renderContent = useMemo(() => {
    const paragraphs = chunk.content.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, pIndex) => {
      const words = paragraph.split(/\s+/);
      let wordIndex = 0;
      
      const wordElements = words.map((word, wIndex) => {
        const isHighlighted = highlightedWordIndex === wordIndex++;
        const isSearchMatch = searchMatches.has(word.toLowerCase());
        
        // Use CSS classes for styling (no inline styles)
        let className = '';
        if (isHighlighted) {
          className = 'highlight-audio';
        } else if (isSearchMatch) {
          className = 'highlight-search';
        }
        
        return (
          <span key={`${pIndex}-${wIndex}`}>
            {wIndex > 0 && ' '}
            {className ? (
              <span className={className}>{word}</span>
            ) : (
              word
            )}
          </span>
        );
      });
      
      return (
        <p key={pIndex} className="mb-4 leading-relaxed">
          {wordElements}
        </p>
      );
    });
  }, [chunk.content, highlightedWordIndex, searchMatches]);
  
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    // Prevent editing if not visible
    if (!isVisible) {
      e.preventDefault();
      return;
    }
    
    if (onContentChange && contentRef.current) {
      const newContent = contentRef.current.innerText || contentRef.current.textContent || '';
      onContentChange(newContent);
    }
  }, [onContentChange, isVisible]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter key specially to prevent chunk boundary issues
    if (e.key === 'Enter') {
      if (!isVisible) {
        e.preventDefault();
        return;
      }
      
      // Let the default behavior handle it, but ensure proper formatting
      setTimeout(() => {
        if (contentRef.current && onContentChange) {
          const newContent = contentRef.current.innerText || contentRef.current.textContent || '';
          onContentChange(newContent);
        }
      }, 10);
    }
  }, [isVisible, onContentChange]);
  
  return (
    <div style={style} className="chunk-container" data-visible={isVisible}>
      <div 
        ref={contentRef}
        className="px-12 py-4 text-base leading-relaxed editor-content"
        contentEditable={isVisible}
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
    overscan: 5, // Increase overscan for better editing experience
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