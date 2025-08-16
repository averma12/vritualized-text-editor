// Web Worker for offloading search indexing and processing
interface SearchIndex {
  wordMap: Map<string, number[]>; // word -> [chunkIndex, wordIndex][]
  chunkWords: string[][]; // All words per chunk
}

let searchIndex: SearchIndex = {
  wordMap: new Map(),
  chunkWords: []
};

// Message types
interface IndexMessage {
  type: 'index';
  chunks: Array<{ content: string; index: number }>;
}

interface SearchMessage {
  type: 'search';
  query: string;
}

interface ClearMessage {
  type: 'clear';
}

type WorkerMessage = IndexMessage | SearchMessage | ClearMessage;

// Build search index from chunks
function buildIndex(chunks: Array<{ content: string; index: number }>) {
  searchIndex.wordMap.clear();
  searchIndex.chunkWords = [];
  
  chunks.forEach(({ content, index: chunkIndex }) => {
    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    searchIndex.chunkWords[chunkIndex] = words;
    
    words.forEach((word, wordIndex) => {
      const positions = searchIndex.wordMap.get(word) || [];
      positions.push(chunkIndex * 10000 + wordIndex); // Encode position
      searchIndex.wordMap.set(word, positions);
    });
  });
  
  postMessage({
    type: 'indexed',
    totalWords: searchIndex.wordMap.size,
    totalChunks: chunks.length
  });
}

// Search for a query in the index
function search(query: string) {
  const queryLower = query.toLowerCase();
  const results: Array<{ chunkIndex: number; wordIndex: number; context: string }> = [];
  
  // Find exact matches
  const exactMatches = searchIndex.wordMap.get(queryLower) || [];
  
  // Find partial matches (more expensive)
  const partialMatches: number[] = [];
  if (queryLower.length >= 3) {
    searchIndex.wordMap.forEach((positions, word) => {
      if (word.includes(queryLower) && word !== queryLower) {
        partialMatches.push(...positions);
      }
    });
  }
  
  // Decode positions and get context
  [...exactMatches, ...partialMatches].forEach(encoded => {
    const chunkIndex = Math.floor(encoded / 10000);
    const wordIndex = encoded % 10000;
    const words = searchIndex.chunkWords[chunkIndex];
    
    if (words) {
      // Get surrounding context (5 words before and after)
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
  
  // Limit results to prevent UI overload
  const limitedResults = results.slice(0, 100);
  
  postMessage({
    type: 'searchResults',
    query,
    results: limitedResults,
    totalMatches: results.length
  });
}

// Handle messages from main thread
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
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

export {};