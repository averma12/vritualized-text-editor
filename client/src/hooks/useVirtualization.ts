import { useState, useEffect, useCallback, useMemo, RefObject } from 'react';
import { type DocumentChunk } from '@shared/schema';

interface UseVirtualizationProps {
  chunks: DocumentChunk[];
  containerRef: RefObject<HTMLDivElement>;
  chunkSize: number;
  bufferSize: number;
}

export function useVirtualization({
  chunks,
  containerRef,
  chunkSize,
  bufferSize
}: UseVirtualizationProps) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: bufferSize });
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = chunks.length;

  const visibleChunks = useMemo(() => {
    const start = Math.max(0, visibleRange.start - bufferSize);
    const end = Math.min(chunks.length, visibleRange.end + bufferSize);
    const visible = chunks.slice(start, end);
    
    // Log virtualization info for testing
    console.log(`🔧 Virtualization: Rendering ${visible.length} chunks (${start}-${end-1}) out of ${chunks.length} total chunks`);
    
    return visible;
  }, [chunks, visibleRange, bufferSize]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;

    // Estimate page height (assuming standard page dimensions)
    const estimatedPageHeight = 1056; // 11 inches * 96 DPI
    const currentPageIndex = Math.floor(scrollTop / estimatedPageHeight);
    const visiblePageCount = Math.ceil(containerHeight / estimatedPageHeight);

    setCurrentPage(currentPageIndex);
    setVisibleRange({
      start: currentPageIndex,
      end: currentPageIndex + visiblePageCount
    });
  }, [containerRef]);

  const scrollToChunk = useCallback((chunkIndex: number) => {
    const container = containerRef.current;
    if (!container) return;

    const estimatedPageHeight = 1056;
    const targetScroll = chunkIndex * estimatedPageHeight;
    
    container.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
  }, [containerRef]);

  // Set up intersection observer for more accurate visibility detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageElement = entry.target as HTMLElement;
            const pageIndex = parseInt(pageElement.dataset.page || '0') - 1;
            setCurrentPage(pageIndex);
          }
        });
      },
      {
        root: container,
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
      }
    );

    // Observe all page elements
    const pageElements = container.querySelectorAll('[data-page]');
    pageElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [containerRef, visibleChunks]);

  return {
    visibleChunks,
    totalPages,
    currentPage,
    handleScroll,
    scrollToChunk,
    visibleRange
  };
}
