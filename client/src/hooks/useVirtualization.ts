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
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = chunks.length;

  const visibleChunks = useMemo(() => {
    // Calculate visible range centered around current page
    const start = Math.max(0, currentPage - bufferSize);
    const end = Math.min(chunks.length, currentPage + bufferSize + 1);
    const visible = chunks.slice(start, end);
    
    // Log virtualization info for testing
    console.log(`🔧 Virtualization: Rendering ${visible.length} chunks (${start}-${end-1}) out of ${chunks.length} total chunks`);
    
    return visible;
  }, [chunks, currentPage, bufferSize]);

  const handleScroll = useCallback(() => {
    // Let intersection observer handle page detection, but we can add scroll-based optimizations here if needed
    const container = containerRef.current;
    if (!container) return;
    
    // Optional: Could add scroll-based performance optimizations here
  }, [containerRef]);

  const scrollToChunk = useCallback((chunkIndex: number) => {
    console.log('🎯 scrollToChunk called with index:', chunkIndex);
    const container = containerRef.current;
    if (!container) {
      console.log('❌ scrollToChunk: No container ref');
      return;
    }

    // Prevent scroll event conflicts during navigation
    container.style.scrollBehavior = 'auto';
    
    // Set current page immediately - this will trigger re-render with correct chunks
    setCurrentPage(chunkIndex);

    // Small delay to ensure DOM is updated, then scroll precisely to the TOP
    setTimeout(() => {
      const targetPageElement = container.querySelector(`[data-page="${chunkIndex + 1}"]`);
      console.log('🔍 scrollToChunk: Target element found:', !!targetPageElement);
      if (targetPageElement) {
        // Get the exact top position of the target page
        const elementRect = targetPageElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const targetScrollTop = container.scrollTop + elementRect.top - containerRect.top;
        
        console.log('📍 scrollToChunk: Scrolling to position:', targetScrollTop);
        // Scroll directly to the exact top position
        container.scrollTop = targetScrollTop;
        
        // Brief delay to restore smooth scrolling for user interactions
        setTimeout(() => {
          container.style.scrollBehavior = 'smooth';
        }, 100);
      } else {
        console.log('❌ scrollToChunk: Target page element not found for page', chunkIndex + 1);
      }
    }, 50);
  }, [containerRef, bufferSize, chunks.length]);

  // Set up intersection observer for accurate page detection during scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isScrolling = false;
    let scrollTimer: NodeJS.Timeout;

    const observer = new IntersectionObserver(
      (entries) => {
        console.log('👁️ IntersectionObserver triggered with', entries.length, 'entries');
        
        // Find all intersecting pages and sort by how much they're visible
        const intersectingPages = entries
          .filter(entry => entry.isIntersecting && entry.target instanceof HTMLElement)
          .map(entry => {
            const pageElement = entry.target as HTMLElement;
            const pageAttribute = pageElement.getAttribute('data-page');
            const pageIndex = pageAttribute ? parseInt(pageAttribute) - 1 : -1;
            const rect = entry.boundingClientRect;
            const containerRect = container.getBoundingClientRect();
            
            // Calculate how far the page is from the ideal position (top of container)
            const distanceFromTop = Math.abs(rect.top - containerRect.top);
            
            return {
              pageIndex,
              distanceFromTop,
              intersectionRatio: entry.intersectionRatio,
              rect,
              entry
            };
          })
          .filter(page => page.pageIndex >= 0)
          .sort((a, b) => {
            // Prefer pages that are closer to the top and have higher intersection ratio
            if (Math.abs(a.distanceFromTop - b.distanceFromTop) < 50) {
              return b.intersectionRatio - a.intersectionRatio;
            }
            return a.distanceFromTop - b.distanceFromTop;
          });

        if (intersectingPages.length > 0) {
          const newCurrentPage = intersectingPages[0].pageIndex;
          console.log('👁️ IntersectionObserver: New current page detected:', newCurrentPage + 1, 
                      'distance from top:', intersectingPages[0].distanceFromTop, 
                      'intersection ratio:', intersectingPages[0].intersectionRatio);
          
          if (newCurrentPage !== currentPage) {
            console.log('👁️ IntersectionObserver: Updating current page from', currentPage + 1, 'to', newCurrentPage + 1);
            setCurrentPage(newCurrentPage);
          }
        }
      },
      {
        root: container,
        rootMargin: '-20% 0px -20% 0px', // Page becomes "current" when it's well within view
        threshold: [0, 0.1, 0.3, 0.5, 0.7, 1.0]
      }
    );

    // Function to observe all visible pages
    const observePages = () => {
      observer.disconnect(); // Clear previous observations
      const pageElements = container.querySelectorAll('[data-page]');
      console.log('👁️ Observing', pageElements.length, 'page elements');
      pageElements.forEach(el => {
        observer.observe(el);
        const pageNum = el.getAttribute('data-page');
        console.log('👁️ Observing page', pageNum);
      });
    };

    // Initial observation
    setTimeout(observePages, 100);

    // Re-observe when content changes (when new chunks are rendered)
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldReobserve = false;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && 
            Array.from(mutation.addedNodes).some(node => 
              node instanceof Element && node.hasAttribute('data-page'))) {
          shouldReobserve = true;
        }
      });
      
      if (shouldReobserve) {
        console.log('👁️ DOM changed, re-observing pages');
        setTimeout(observePages, 50);
      }
    });

    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef, currentPage]); // Include currentPage in dependencies

  return {
    visibleChunks,
    setCurrentPage,
    totalPages,
    currentPage,
    handleScroll,
    scrollToChunk
  };
}
