import { useState, useEffect, useRef } from 'react';

interface PerformanceMetrics {
  memoryUsage: number;
  domElements: number;
  viewportInfo: string;
}

interface UsePerformanceMetricsProps {
  currentPage: number;
  totalPages: number;
  visibleChunks?: any[];
  containerRef?: React.RefObject<HTMLElement>;
}

export function usePerformanceMetrics({
  currentPage,
  totalPages,
  visibleChunks = [],
  containerRef
}: UsePerformanceMetricsProps): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    domElements: 0,
    viewportInfo: `Page ${currentPage + 1} of ${totalPages}`
  });

  const updateMetrics = () => {
    // Calculate memory usage
    let memoryUsage = 0;
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    }

    // Calculate DOM elements
    let domElements = 0;
    if (containerRef?.current) {
      // Count all elements within the container
      domElements = containerRef.current.querySelectorAll('*').length;
    } else {
      // Fallback to document-wide count
      domElements = document.querySelectorAll('*').length;
    }

    // Calculate viewport info based on visible chunks
    let viewportInfo: string;
    if (visibleChunks.length > 0) {
      const firstVisible = visibleChunks[0]?.chunkIndex + 1 || currentPage + 1;
      const lastVisible = visibleChunks[visibleChunks.length - 1]?.chunkIndex + 1 || currentPage + 1;
      
      if (firstVisible === lastVisible) {
        viewportInfo = `Page ${firstVisible}`;
      } else {
        viewportInfo = `Page ${firstVisible}-${lastVisible}`;
      }
    } else {
      viewportInfo = `Page ${currentPage + 1}`;
    }

    setMetrics({
      memoryUsage,
      domElements,
      viewportInfo
    });
  };

  // Update metrics when dependencies change
  useEffect(() => {
    updateMetrics();
  }, [currentPage, totalPages, visibleChunks.length, containerRef?.current]);

  // Update metrics periodically (less frequently to reduce console noise)
  useEffect(() => {
    const interval = setInterval(updateMetrics, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return metrics;
}