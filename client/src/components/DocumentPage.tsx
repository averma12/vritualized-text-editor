import { useCallback, useMemo } from 'react';
import { type DocumentChunk } from '@shared/schema';

interface DocumentPageProps {
  chunk: DocumentChunk;
  pageNumber: number;
  totalPages: number;
  isActive: boolean;
  highlightedWordIndex: number;
  onEdit: (content: string) => void;
  audioTimestamps: Array<{word: string, start: number, end: number}>;
}

export function DocumentPage({ 
  chunk, 
  pageNumber, 
  totalPages, 
  isActive, 
  highlightedWordIndex,
  onEdit,
  audioTimestamps 
}: DocumentPageProps) {
  
  const words = useMemo(() => {
    return chunk.content.split(' ').map((word, index) => ({
      text: word,
      globalIndex: chunk.startWordIndex + index,
      localIndex: index
    }));
  }, [chunk.content, chunk.startWordIndex]);

  const getWordTimestamp = useCallback((globalIndex: number) => {
    return audioTimestamps.find(ts => ts.word === words.find(w => w.globalIndex === globalIndex)?.text);
  }, [audioTimestamps, words]);

  const handleContentChange = useCallback((event: React.FormEvent<HTMLDivElement>) => {
    const newContent = event.currentTarget.textContent || '';
    onEdit(newContent);
  }, [onEdit]);

  const pageClasses = `
    editor-page page-shadow mb-8 
    ${isActive ? '' : 'opacity-50 transform scale-95'}
    ${pageNumber === 1 ? 'mt-0' : ''}
  `;

  return (
    <div className={pageClasses} data-page={pageNumber}>
      <div className="text-sm text-textSecondary mb-4 text-center">
        Page {pageNumber} of {totalPages}
      </div>
      
      <div 
        className="prose max-w-none leading-relaxed min-h-96"
        contentEditable={isActive}
        onInput={handleContentChange}
        suppressContentEditableWarning={true}
      >
        {words.map((word, index) => {
          const isHighlighted = highlightedWordIndex !== -1 && 
                               word.globalIndex === highlightedWordIndex;
          const timestamp = getWordTimestamp(word.globalIndex);
          
          return (
            <span
              key={`${word.globalIndex}-${word.text}`}
              className={`${isHighlighted ? 'highlighted-word' : ''}`}
              data-word-id={`w_${word.globalIndex}`}
              data-audio-timestamp={timestamp?.start || 0}
              style={{ marginRight: '0.25em' }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}