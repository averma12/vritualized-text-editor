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

    // Only update visible range, let intersection observer handle page detection
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    // Find the topmost visible page for range calculation
    const pages = Array.from(container.querySelectorAll('[data-page]'));
    let topMostPageIndex = 0;
    
    for (const page of pages) {
      const rect = page.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Find the first page whose top is at or above the container top
      if (rect.top <= containerRect.top + 100) { // 100px tolerance
        const pageNum = parseInt(page.getAttribute('data-page') || '1');
        topMostPageIndex = pageNum - 1;
      } else {
        break;
      }
    }

    // Update visible range based on the topmost visible page
    const bufferStart = Math.max(0, topMostPageIndex - bufferSize);
    const bufferEnd = Math.min(chunks.length, topMostPageIndex + 3 + bufferSize); // Show 3 pages ahead
    
    setVisibleRange({
      start: bufferStart,
      end: bufferEnd
    });
  }, [containerRef, chunks.length, bufferSize]);

  const scrollToChunk = useCallback((chunkIndex: number) => {
    const container = containerRef.current;
    if (!container) return;

    // Prevent scroll event conflicts during navigation
    container.style.scrollBehavior = 'auto';
    
    // First, ensure the target chunk is rendered by updating the visible range
    const newStart = Math.max(0, chunkIndex - bufferSize);
    const newEnd = Math.min(chunks.length, chunkIndex + bufferSize + 1);
    
    setVisibleRange({
      start: newStart,
      end: newEnd
    });

    // Set current page immediately to prevent conflicts
    setCurrentPage(chunkIndex);

    // Small delay to ensure DOM is updated, then scroll precisely to the TOP
    setTimeout(() => {
      const targetPageElement = container.querySelector(`[data-page="${chunkIndex + 1}"]`);
      if (targetPageElement) {
        // Get the exact top position of the target page
        const elementRect = targetPageElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const targetScrollTop = container.scrollTop + elementRect.top - containerRect.top;
        
        // Scroll directly to the exact top position
        container.scrollTop = targetScrollTop;
        
        // Brief delay to restore smooth scrolling for user interactions
        setTimeout(() => {
          container.style.scrollBehavior = 'smooth';
        }, 100);
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
        // Find the topmost page that meets our criteria
        let topMostPage: IntersectionObserverEntry | null = null;
        let topMostPosition = Infinity;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.1 && entry.target instanceof HTMLElement) {
            const rect = entry.boundingClientRect;
            
            // Prefer pages whose top is closer to the container top
            if (rect.top < topMostPosition) {
              topMostPosition = rect.top;
              topMostPage = entry;
            }
          }
        });

        if (topMostPage && topMostPage.target instanceof HTMLElement) {
          const pageElement = topMostPage.target as HTMLElement;
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
        rootMargin: '-10% 0px -50% 0px', // More precise: page is "current" when its top 10% is visible
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
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
    setCurrentPage,
    totalPages,
    currentPage,
    handleScroll,
    scrollToChunk,
    visibleRange
  };
}
