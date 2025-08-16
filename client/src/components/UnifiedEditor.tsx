import { useCallback, useRef, useEffect, useMemo } from 'react';
import { ErrorBoundary } from '@/lib/errorHandler';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { useSearchWorker } from '@/hooks/useSearchWorker';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import type { DocumentChunk } from '@shared/schema';

interface UnifiedEditorProps {
  documentId: string;
  chunks: DocumentChunk[];
  audioTimestamps?: number[];
  currentPlaybackTime?: number;
  onScroll?: (scrollProgress: number) => void;
  onContentChange?: (chunkIndex: number, content: string) => void;
  searchTerm?: string;
}

export function UnifiedEditor({
  documentId,
  chunks,
  audioTimestamps = [],
  currentPlaybackTime = 0,
  onScroll,
  onContentChange,
  searchTerm = ''
}: UnifiedEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const contentCache = useRef<Map<number, string>>(new Map());
  
  // Fixed height configuration
  const CHUNK_HEIGHT = 400;
  const CONTAINER_HEIGHT = window.innerHeight - 100;
  
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
    overscan: 3, // Reduce overscan for stability
    scrollThreshold: 0.7
  });
  
  // Search worker hook
  const {
    search,
    searchResults,
    totalMatches,
    isIndexing
  } = useSearchWorker(chunks);
  
  // Performance metrics
  const {
    metrics,
    updateMetrics
  } = usePerformanceMetrics();
  
  // Unified content string
  const unifiedContent = useMemo(() => {
    return chunks.map((chunk, index) => {
      const cached = contentCache.current.get(index);
      return cached || chunk.content;
    }).join('\n\n--- SECTION BREAK ---\n\n');
  }, [chunks]);
  
  // Handle content changes
  const handleContentChange = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (!editorRef.current || !onContentChange) return;
    
    const fullContent = editorRef.current.innerText || '';
    const sections = fullContent.split('\n\n--- SECTION BREAK ---\n\n');
    
    sections.forEach((content, index) => {
      const trimmedContent = content.trim();
      const previousContent = contentCache.current.get(index);
      
      if (trimmedContent !== previousContent) {
        contentCache.current.set(index, trimmedContent);
        onContentChange(index, trimmedContent);
      }
    });
  }, [onContentChange]);
  
  // Handle scroll events
  const handleScrollEvent = useCallback((e: React.UIEvent) => {
    const container = e.currentTarget as HTMLDivElement;
    const scrollTop = container.scrollTop;
    
    handleScroll(scrollTop);
    
    if (onScroll) {
      const { scrollProgress } = getViewportInfo();
      onScroll(scrollProgress);
    }
  }, [handleScroll, getViewportInfo, onScroll]);
  
  // Search effect
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 2) {
      search(searchTerm);
    }
  }, [searchTerm, search]);
  
  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col bg-gray-100">
        {/* Status indicators */}
        {isIndexing && (
          <div className="absolute top-2 right-2 z-10 px-3 py-1 bg-blue-500 text-white text-sm rounded">
            Indexing document...
          </div>
        )}
        
        {searchTerm && totalMatches > 0 && (
          <div className="absolute top-2 left-2 z-10 px-3 py-1 bg-green-500 text-white text-sm rounded">
            Found {totalMatches} matches
          </div>
        )}
        
        {/* Unified editor container */}
        <div
          className="flex-1 overflow-auto relative"
          onScroll={handleScrollEvent}
          style={{ height: CONTAINER_HEIGHT }}
        >
          <div 
            className="max-w-4xl mx-auto bg-white shadow-lg"
            style={{ minHeight: totalHeight }}
          >
            <div
              ref={editorRef}
              className="px-12 py-8 text-base leading-relaxed min-h-full"
              contentEditable={true}
              suppressContentEditableWarning
              onInput={handleContentChange}
              spellCheck={false}
              style={{
                outline: 'none',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}
            >
              {unifiedContent}
            </div>
          </div>
        </div>
        
        {/* Performance metrics */}
        <div className="fixed bottom-4 right-4 text-xs bg-gray-800 text-white p-2 rounded space-y-1">
          <div>DOM: {metrics.domElements} elements</div>
          <div>Memory: {metrics.memoryUsage}MB</div>
          <div>Visible: Pages {Math.floor(getViewportInfo().currentPage)}-{Math.floor(getViewportInfo().currentPage + 2)}</div>
        </div>
      </div>
    </ErrorBoundary>
  );
}