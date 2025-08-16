import { useEffect, useRef, useCallback, useState } from 'react';
import { type DocumentChunk } from '@shared/schema';

interface SearchResult {
  chunkIndex: number;
  wordIndex: number;
  context: string;
}

export function useSearchWorker(chunks: DocumentChunk[]) {
  const workerRef = useRef<Worker>();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  
  // Initialize worker
  useEffect(() => {
    // Create worker from inline code (Vite will handle this)
    const workerCode = `
      let searchIndex = { wordMap: new Map(), chunkWords: [] };
      
      function buildIndex(chunks) {
        searchIndex.wordMap.clear();
        searchIndex.chunkWords = [];
        
        chunks.forEach(({ content, index: chunkIndex }) => {
          const words = content.toLowerCase().split(/\\s+/).filter(w => w.length > 0);
          searchIndex.chunkWords[chunkIndex] = words;
          
          words.forEach((word, wordIndex) => {
            const positions = searchIndex.wordMap.get(word) || [];
            positions.push(chunkIndex * 10000 + wordIndex);
            searchIndex.wordMap.set(word, positions);
          });
        });
        
        postMessage({
          type: 'indexed',
          totalWords: searchIndex.wordMap.size,
          totalChunks: chunks.length
        });
      }
      
      function search(query) {
        const queryLower = query.toLowerCase();
        const results = [];
        
        const exactMatches = searchIndex.wordMap.get(queryLower) || [];
        
        const partialMatches = [];
        if (queryLower.length >= 3) {
          searchIndex.wordMap.forEach((positions, word) => {
            if (word.includes(queryLower) && word !== queryLower) {
              partialMatches.push(...positions);
            }
          });
        }
        
        [...exactMatches, ...partialMatches].forEach(encoded => {
          const chunkIndex = Math.floor(encoded / 10000);
          const wordIndex = encoded % 10000;
          const words = searchIndex.chunkWords[chunkIndex];
          
          if (words) {
            const start = Math.max(0, wordIndex - 5);
            const end = Math.min(words.length, wordIndex + 6);
            const context = words.slice(start, end).join(' ');
            
            results.push({
              chunkIndex,
              wordIndex,
              context
            });
          }
        });
        
        const limitedResults = results.slice(0, 100);
        
        postMessage({
          type: 'searchResults',
          query,
          results: limitedResults,
          totalMatches: results.length
        });
      }
      
      self.addEventListener('message', (event) => {
        const message = event.data;
        
        switch (message.type) {
          case 'index':
            buildIndex(message.chunks);
            break;
          case 'search':
            search(message.query);
            break;
          case 'clear':
            searchIndex.wordMap.clear();
            searchIndex.chunkWords = [];
            postMessage({ type: 'cleared' });
            break;
        }
      });
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);
    
    // Handle messages from worker
    workerRef.current.onmessage = (event) => {
      const message = event.data;
      
      switch (message.type) {
        case 'indexed':
          setIsIndexing(false);
          console.log(`Indexed ${message.totalWords} unique words from ${message.totalChunks} chunks`);
          break;
          
        case 'searchResults':
          setSearchResults(message.results);
          setTotalMatches(message.totalMatches);
          break;
          
        case 'cleared':
          setSearchResults([]);
          setTotalMatches(0);
          break;
      }
    };
    
    // Cleanup
    return () => {
      workerRef.current?.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);
  
  // Index chunks when they change
  useEffect(() => {
    if (workerRef.current && chunks.length > 0) {
      setIsIndexing(true);
      workerRef.current.postMessage({
        type: 'index',
        chunks: chunks.map((chunk, index) => ({
          content: chunk.content,
          index
        }))
      });
    }
  }, [chunks]);
  
  // Search function
  const search = useCallback((query: string) => {
    if (workerRef.current && query.trim().length >= 2) {
      workerRef.current.postMessage({
        type: 'search',
        query: query.trim()
      });
    } else {
      setSearchResults([]);
      setTotalMatches(0);
    }
  }, []);
  
  // Clear search
  const clearSearch = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'clear' });
    }
    setSearchResults([]);
    setTotalMatches(0);
  }, []);
  
  return {
    search,
    clearSearch,
    searchResults,
    totalMatches,
    isIndexing
  };
}