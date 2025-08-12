import React, { useRef, useEffect, useState, useCallback } from 'react';
import { type DocumentChunk } from '@shared/schema';
import { useAudioSync } from '@/hooks/useAudioSync';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ContinuousEditorProps {
  documentId: string;
  chunks: DocumentChunk[];
  audioTimestamps?: Array<{word: string, start: number, end: number}>;
  currentPlaybackTime?: number;
  onScroll?: (scrollProgress: number) => void;
  onContentChange?: (content: string) => void;
  searchTerm?: string;
  onSearchResultsFound?: (results: number) => void;
}

export function ContinuousEditor({ 
  documentId, 
  chunks, 
  audioTimestamps = [], 
  currentPlaybackTime = 0,
  onScroll,
  onContentChange,
  searchTerm = '',
  onSearchResultsFound
}: ContinuousEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const {
    highlightedWordIndex
  } = useAudioSync({
    audioTimestamps,
    currentPlaybackTime,
    chunks
  });

  // Handle scrolling with better calculation
  const handleScrollEvent = useCallback((e: React.UIEvent) => {
    const container = e.currentTarget as HTMLDivElement;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    // Calculate scroll progress (0-1) - more precise calculation
    let scrollProgress = 0;
    if (maxScroll > 0) {
      scrollProgress = Math.max(0, Math.min(1, scrollTop / maxScroll));
    }
    
    onScroll?.(scrollProgress);
  }, [onScroll]);

  // Combine all chunks into one continuous text - no virtualization for now
  const combinedContent = chunks.map(chunk => chunk.content).join('\n\n');

  // Handle content editing
  const handleContentEdit = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    onContentChange?.(newContent);
  }, [onContentChange]);

  // Render continuous text with word highlighting and search highlighting
  const renderContent = () => {
    const paragraphs = combinedContent.split('\n\n').filter((p: string) => p.trim());
    let globalWordIndex = 0;
    let searchMatches = 0;

    return paragraphs.map((paragraph: string, paraIndex: number) => {
      const words = paragraph.split(/\s+/).filter((w: string) => w.length > 0);
      
      const renderedWords = words.map((word: string, wordIndex: number) => {
        const currentGlobalIndex = globalWordIndex++;
        const isHighlighted = highlightedWordIndex !== -1 && currentGlobalIndex === highlightedWordIndex;
        
        // Check for search matches
        const isSearchMatch = searchTerm && searchTerm.length > 2 && 
          word.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (isSearchMatch) {
          searchMatches++;
        }
        
        let className = '';
        if (isHighlighted) {
          className = 'bg-yellow-300 rounded px-1';
        } else if (isSearchMatch) {
          className = 'bg-blue-200 rounded px-1';
        }
        
        return (
          <span
            key={`${paraIndex}-${wordIndex}`}
            className={className}
            data-word-index={currentGlobalIndex}
          >
            {word}
          </span>
        );
      });

      return (
        <p key={paraIndex} className="mb-4 leading-relaxed">
          {renderedWords.reduce((acc: React.ReactNode[], word: React.ReactNode, index: number) => {
            if (index === 0) return [word];
            return [...acc, ' ', word];
          }, [] as React.ReactNode[])}
        </p>
      );
    });
  };

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col bg-white">
        {/* Editor container with virtual scrolling */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-100"
          onScroll={handleScrollEvent}
          style={{
            height: '100vh'
          }}
        >
          {/* Main content area - continuous document like Google Docs */}
          <div 
            ref={editorRef}
            className="max-w-4xl mx-auto my-8 px-12 py-12 bg-white shadow-lg"
            style={{
              minHeight: '100vh',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '16px',
              lineHeight: '1.8',
              color: '#1a1a1a'
            }}
            contentEditable
            suppressContentEditableWarning
            onInput={handleContentEdit}
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}