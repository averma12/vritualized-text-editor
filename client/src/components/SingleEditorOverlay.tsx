import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import type { DocumentChunk } from '@shared/schema';

interface SingleEditorOverlayProps {
  chunks: DocumentChunk[];
  containerRef: React.RefObject<HTMLDivElement>;
  onContentChange?: (chunkIndex: number, content: string) => void;
  highlightedWordIndex?: number;
  searchMatches?: Set<string>;
  searchTerm?: string;
}

export function SingleEditorOverlay({
  chunks,
  containerRef,
  onContentChange,
  highlightedWordIndex,
  searchMatches,
  searchTerm
}: SingleEditorOverlayProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<string>('');
  
  // Create unified content without visible section markers
  const unifiedContent = useMemo(() => {
    return chunks.map((chunk, index) => chunk.content).join('\n\n\n\n');
  }, [chunks]);
  
  // Handle content changes and split back into chunks
  const handleContentChange = useCallback(() => {
    if (!editorRef.current || !onContentChange) return;
    
    const currentContent = editorRef.current.innerText || '';
    
    // Avoid processing if content hasn't meaningfully changed
    if (currentContent === lastContentRef.current) return;
    lastContentRef.current = currentContent;
    
    // Split content back into chunks
    const sections = currentContent.split('\n\n\n\n');
    
    sections.forEach((content, index) => {
      if (index < chunks.length && content.trim() !== chunks[index].content.trim()) {
        onContentChange(index, content.trim());
      }
    });
  }, [chunks, onContentChange]);
  
  // Sync content when chunks change externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== unifiedContent) {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const startOffset = range?.startOffset || 0;
      
      editorRef.current.innerText = unifiedContent;
      
      // Restore cursor position
      if (selection && range) {
        try {
          const newRange = document.createRange();
          const textNode = editorRef.current.firstChild;
          if (textNode) {
            newRange.setStart(textNode, Math.min(startOffset, textNode.textContent?.length || 0));
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        } catch (e) {
          // Ignore cursor restoration errors
        }
      }
    }
  }, [unifiedContent]);
  
  return (
    <div
      ref={editorRef}
      className="absolute inset-0 px-12 py-8 text-base leading-relaxed outline-none"
      contentEditable
      suppressContentEditableWarning
      onInput={handleContentChange}
      onBlur={handleContentChange}
      spellCheck={false}
      style={{
        zIndex: 100, // Above all chunks
        backgroundColor: 'white', // Opaque white background
        color: 'black',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        minHeight: '100%',
        lineHeight: 1.75 // Match chunk line height
      }}
    >
      {unifiedContent}
    </div>
  );
}