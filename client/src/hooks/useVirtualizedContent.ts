import { useState, useEffect, useCallback, useMemo, RefObject } from 'react';
import { type DocumentChunk } from '@shared/schema';

interface VirtualChunk extends DocumentChunk {
  virtualTop: number;
  virtualBottom: number;
  isVisible: boolean;
}

interface UseVirtualizedContentProps {
  chunks: DocumentChunk[];
  containerRef: RefObject<HTMLDivElement>;
  viewportHeight: number;
  chunkHeight: number;
}

export function useVirtualizedContent({
  chunks,
  containerRef,
  viewportHeight,
  chunkHeight
}: UseVirtualizedContentProps) {
  const [scrollTop, setScrollTop] = useState(0);
  
  // Calculate virtual positions for each chunk
  const virtualChunks: VirtualChunk[] = useMemo(() => {
    return chunks.map((chunk, index) => ({
      ...chunk,
      virtualTop: index * chunkHeight,
      virtualBottom: (index + 1) * chunkHeight,
      isVisible: false
    }));
  }, [chunks, chunkHeight]);

  // Calculate total virtual height
  const totalHeight = chunks.length * chunkHeight;

  // Determine visible chunks based on scroll position
  const visibleContent = useMemo(() => {
    const container = containerRef.current;
    if (!container) return virtualChunks.slice(0, 5); // Show first 5 chunks initially

    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + viewportHeight;
    
    // Add buffer above and below for smooth scrolling
    const bufferSize = chunkHeight;
    const bufferedTop = Math.max(0, viewportTop - bufferSize);
    const bufferedBottom = viewportBottom + bufferSize;

    return virtualChunks.filter(chunk => 
      chunk.virtualBottom >= bufferedTop && chunk.virtualTop <= bufferedBottom
    ).map(chunk => ({
      ...chunk,
      isVisible: chunk.virtualBottom >= viewportTop && chunk.virtualTop <= viewportBottom
    }));
  }, [scrollTop, viewportHeight, chunkHeight, virtualChunks, containerRef]);

  // Handle scroll events
  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  // Scroll to specific position in document
  const scrollToPosition = useCallback((position: number) => {
    const container = containerRef.current;
    if (!container) return;

    // Convert position (0-1) to scroll offset
    const maxScroll = totalHeight - viewportHeight;
    const targetScroll = Math.max(0, Math.min(maxScroll, position * maxScroll));
    
    container.scrollTop = targetScroll;
    setScrollTop(targetScroll);
  }, [totalHeight, viewportHeight, containerRef]);

  // Scroll to specific chunk
  const scrollToChunk = useCallback((chunkIndex: number) => {
    const container = containerRef.current;
    if (!container || chunkIndex < 0 || chunkIndex >= chunks.length) return;

    const targetPosition = chunkIndex * chunkHeight;
    container.scrollTop = targetPosition;
    setScrollTop(targetPosition);
  }, [chunkHeight, chunks.length, containerRef]);

  return {
    visibleContent,
    totalHeight,
    scrollTop,
    handleScroll,
    scrollToPosition,
    scrollToChunk
  };
}