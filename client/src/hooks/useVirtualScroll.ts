import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type DocumentChunk } from '@shared/schema';

interface VirtualScrollOptions {
  chunks: DocumentChunk[];
  itemHeight: number; // Fixed height per chunk
  containerHeight: number;
  overscan?: number; // Number of items to render outside viewport
  scrollThreshold?: number; // Threshold for predictive loading
}

interface VirtualItem {
  chunk: DocumentChunk;
  index: number;
  offset: number;
  height: number;
  isVisible: boolean;
  isPrefetched: boolean;
}

export function useVirtualScroll({
  chunks,
  itemHeight,
  containerHeight,
  overscan = 1, // Minimal overscan to prevent interference
  scrollThreshold = 0.8
}: VirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const rafRef = useRef<number>();
  const cacheRef = useRef<Map<number, VirtualItem>>(new Map());
  
  // Calculate total height with fixed heights
  const totalHeight = chunks.length * itemHeight;
  
  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      chunks.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, chunks.length]);
  
  // Calculate predictive prefetch range
  const prefetchRange = useMemo(() => {
    const scrollProgress = scrollTop / (totalHeight - containerHeight);
    
    if (scrollProgress > scrollThreshold) {
      // Prefetch ahead when nearing bottom
      const prefetchStart = visibleRange.endIndex + 1;
      const prefetchEnd = Math.min(chunks.length - 1, prefetchStart + overscan * 2);
      return { prefetchStart, prefetchEnd };
    }
    
    return null;
  }, [scrollTop, totalHeight, containerHeight, scrollThreshold, visibleRange, overscan, chunks.length]);
  
  // Generate virtual items with caching
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    
    // Add visible items with strict positioning
    const processedIndices = new Set<number>();
    
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (i >= chunks.length || processedIndices.has(i)) continue;
      
      processedIndices.add(i);
      const item: VirtualItem = {
        chunk: chunks[i],
        index: i,
        offset: i * itemHeight, // Strict sequential positioning
        height: itemHeight,
        isVisible: true,
        isPrefetched: false
      };
      items.push(item);
    }
    
    // Simplified: Only render visible items to prevent overlapping
    // Remove prefetch for now to debug positioning
    
    // Simplified cache management - clear cache for clean positioning
    cacheRef.current.clear();
    
    return items;
  }, [visibleRange, prefetchRange, chunks, itemHeight]);
  
  // Handle scroll with RAF batching
  const handleScroll = useCallback((newScrollTop: number) => {
    // Cancel previous RAF if exists
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // Batch DOM updates with requestAnimationFrame
    rafRef.current = requestAnimationFrame(() => {
      setScrollTop(newScrollTop);
      setIsScrolling(true);
      
      // Debounce scroll end detection
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    });
  }, []);
  
  // Scroll to specific chunk
  const scrollToChunk = useCallback((chunkIndex: number) => {
    const targetScroll = chunkIndex * itemHeight;
    return targetScroll;
  }, [itemHeight]);
  
  // Get current viewport info
  const getViewportInfo = useCallback(() => {
    const firstVisible = Math.floor(scrollTop / itemHeight);
    const lastVisible = Math.ceil((scrollTop + containerHeight) / itemHeight);
    const totalVisible = lastVisible - firstVisible + 1;
    
    return {
      firstVisible,
      lastVisible,
      totalVisible,
      scrollProgress: scrollTop / (totalHeight - containerHeight)
    };
  }, [scrollTop, itemHeight, containerHeight, totalHeight]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      cacheRef.current.clear();
    };
  }, []);
  
  return {
    virtualItems,
    totalHeight,
    handleScroll,
    scrollToChunk,
    getViewportInfo,
    isScrolling,
    visibleRange,
    prefetchRange
  };
}