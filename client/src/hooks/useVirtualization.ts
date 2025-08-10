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

    // Use intersection observer results for more accurate page detection
    // This function is mainly for updating visible range for virtualization
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    // Find pages currently in viewport
    const pages = Array.from(container.querySelectorAll('[data-page]'));
    const visiblePages = pages.filter(page => {
      const rect = page.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return rect.top < containerRect.bottom && rect.bottom > containerRect.top;
    });

    if (visiblePages.length > 0) {
      const firstVisiblePage = visiblePages[0];
      const pageNum = parseInt(firstVisiblePage.getAttribute('data-page') || '1');
      const pageIndex = pageNum - 1;
      
      // Update visible range based on actual visible pages
      const bufferStart = Math.max(0, pageIndex - bufferSize);
      const bufferEnd = Math.min(chunks.length, pageIndex + visiblePages.length + bufferSize);
      
      setVisibleRange({
        start: bufferStart,
        end: bufferEnd
      });
    }
  }, [containerRef, chunks.length, bufferSize]);

  const scrollToChunk = useCallback((chunkIndex: number) => {
    const container = containerRef.current;
    if (!container) return;

    // First, ensure the target chunk is rendered by updating the visible range
    const newStart = Math.max(0, chunkIndex - bufferSize);
    const newEnd = Math.min(chunks.length, chunkIndex + bufferSize + 1);
    
    setVisibleRange({
      start: newStart,
      end: newEnd
    });

    // Small delay to ensure DOM is updated, then scroll
    setTimeout(() => {
      const targetPageElement = container.querySelector(`[data-page="${chunkIndex + 1}"]`);
      if (targetPageElement) {
        // Use instant scroll for precise navigation
        targetPageElement.scrollIntoView({
          behavior: 'instant',
          block: 'start'
        });
        // Set current page immediately to avoid flickering
        setCurrentPage(chunkIndex);
      }
    }, 50);
  }, [containerRef, bufferSize, chunks.length]);

  // Set up intersection observer for accurate page detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastIntersectingPage = -1;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible page (highest intersection ratio)
        let mostVisibleEntry = null;
        let maxRatio = 0;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        });

        if (mostVisibleEntry) {
          const pageElement = mostVisibleEntry.target as HTMLElement;
          const pageAttribute = pageElement.getAttribute('data-page');
          if (pageAttribute) {
            const pageIndex = parseInt(pageAttribute) - 1;
            if (pageIndex !== lastIntersectingPage) {
              setCurrentPage(pageIndex);
              lastIntersectingPage = pageIndex;
            }
          }
        }
      },
      {
        root: container,
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1.0]
      }
    );

    // Re-observe pages when visible chunks change
    const observePages = () => {
      const pageElements = container.querySelectorAll('[data-page]');
      pageElements.forEach(el => observer.observe(el));
    };

    // Initial observation with a slight delay to ensure DOM is ready
    setTimeout(observePages, 100);

    // Re-observe when content changes
    const mutationObserver = new MutationObserver(() => {
      observer.disconnect();
      setTimeout(observePages, 50);
    });

    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef]);

  return {
    visibleChunks,
    totalPages,
    currentPage,
    handleScroll,
    scrollToChunk,
    visibleRange
  };
}
