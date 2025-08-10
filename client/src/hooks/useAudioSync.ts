import { useState, useEffect, useMemo } from 'react';
import { type DocumentChunk } from '@shared/schema';

interface UseAudioSyncProps {
  audioTimestamps: Array<{word: string, start: number, end: number}>;
  currentPlaybackTime: number;
  chunks: DocumentChunk[];
}

export function useAudioSync({
  audioTimestamps,
  currentPlaybackTime,
  chunks
}: UseAudioSyncProps) {
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(-1);

  // Create a map of word positions across all chunks
  const wordPositionMap = useMemo(() => {
    const map = new Map<string, { globalIndex: number, chunkIndex: number, localIndex: number }>();
    let globalWordIndex = 0;

    chunks.forEach((chunk, chunkIndex) => {
      const words = chunk.content.split(' ');
      words.forEach((word, localIndex) => {
        // Clean word for matching (remove punctuation, lowercase)
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        if (cleanWord) {
          map.set(`${globalWordIndex}`, {
            globalIndex: globalWordIndex,
            chunkIndex,
            localIndex
          });
        }
        globalWordIndex++;
      });
    });

    return map;
  }, [chunks]);

  // Find current word based on audio timestamp
  useEffect(() => {
    if (audioTimestamps.length === 0) return;

    // Find the word that should be highlighted at current time
    const currentTimestamp = audioTimestamps.find((ts, index) => {
      const nextTs = audioTimestamps[index + 1];
      return ts.start <= currentPlaybackTime && 
             (!nextTs || currentPlaybackTime < nextTs.start);
    });

    if (currentTimestamp) {
      // Find the word index in our document
      const timestampIndex = audioTimestamps.indexOf(currentTimestamp);
      const wordPosition = wordPositionMap.get(timestampIndex.toString());

      if (wordPosition) {
        setHighlightedWordIndex(wordPosition.globalIndex);
        setCurrentChunkIndex(wordPosition.chunkIndex);
      }
    } else {
      setHighlightedWordIndex(-1);
      setCurrentChunkIndex(-1);
    }
  }, [currentPlaybackTime, audioTimestamps, wordPositionMap]);

  return {
    highlightedWordIndex,
    currentChunkIndex,
    wordPositionMap
  };
}
