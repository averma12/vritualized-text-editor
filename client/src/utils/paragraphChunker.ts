/**
 * Chunk text into pages based on paragraphs and estimated A4 page capacity
 * This ensures paragraphs stay complete within page boundaries
 */

interface ChunkOptions {
  maxWordsPerPage?: number;
  minWordsPerPage?: number;
  lineHeight?: number;
  fontSize?: number;
  pageHeight?: number; // in pixels
  marginTop?: number;
  marginBottom?: number;
}

export interface ParagraphChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  startWordIndex: number;
  endWordIndex: number;
  paragraphs: string[];
}

/**
 * Estimate how many words can fit on an A4 page
 * Based on typical Google Docs formatting:
 * - A4: 8.27" x 11.7" 
 * - Margins: 0.75" (top/bottom/left/right)
 * - Content area: 6.77" x 10.2"
 * - Line height: ~1.15
 * - Font size: 11pt (typical)
 * - Characters per line: ~75-80
 * - Lines per page: ~45-50
 * - Words per line: ~12-15
 * - Estimated words per page: 500-650 words
 */
function estimateWordsPerPage(options: ChunkOptions = {}): number {
  const {
    lineHeight = 1.15,
    fontSize = 11, // points
    pageHeight = 11.7 * 96, // A4 height in pixels (96 DPI)
    marginTop = 0.75 * 96,
    marginBottom = 0.75 * 96
  } = options;

  // Content height in pixels
  const contentHeight = pageHeight - marginTop - marginBottom;
  
  // Line height in pixels (approximate)
  const lineHeightPx = fontSize * 1.33 * lineHeight; // 1.33 = points to pixels ratio
  
  // Number of lines that fit
  const linesPerPage = Math.floor(contentHeight / lineHeightPx);
  
  // Average words per line (Google Docs style)
  const avgWordsPerLine = 13;
  
  return Math.floor(linesPerPage * avgWordsPerLine * 0.85); // 0.85 safety factor
}

/**
 * Split text into paragraphs and chunk them into pages
 */
export function chunkTextByParagraphs(
  text: string, 
  documentId: string, 
  options: ChunkOptions = {}
): ParagraphChunk[] {
  const maxWordsPerPage = options.maxWordsPerPage || estimateWordsPerPage(options);
  const minWordsPerPage = options.minWordsPerPage || Math.floor(maxWordsPerPage * 0.3);

  // Split text into paragraphs (double line breaks or single line breaks)
  const paragraphs = text
    .split(/\n\s*\n|\n/) // Split on double newlines or single newlines
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: ParagraphChunk[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;
  let totalWordIndex = 0;
  let chunkStartWordIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const paragraphWords = paragraph.split(/\s+/).filter(w => w.length > 0);
    const paragraphWordCount = paragraphWords.length;

    // Check if adding this paragraph would exceed the page limit
    if (currentWordCount > 0 && currentWordCount + paragraphWordCount > maxWordsPerPage) {
      // Only create chunk if it has meaningful content
      if (currentWordCount >= minWordsPerPage || i === paragraphs.length - 1) {
        // Create current chunk
        chunks.push({
          id: `${documentId}-chunk-${chunks.length}`,
          documentId,
          chunkIndex: chunks.length,
          content: currentChunk.join('\n\n'),
          wordCount: currentWordCount,
          startWordIndex: chunkStartWordIndex,
          endWordIndex: totalWordIndex - 1,
          paragraphs: [...currentChunk]
        });

        // Start new chunk
        currentChunk = [paragraph];
        currentWordCount = paragraphWordCount;
        chunkStartWordIndex = totalWordIndex;
      } else {
        // Current chunk is too small, add the paragraph anyway
        currentChunk.push(paragraph);
        currentWordCount += paragraphWordCount;
      }
    } else {
      // Add paragraph to current chunk
      currentChunk.push(paragraph);
      currentWordCount += paragraphWordCount;
    }

    totalWordIndex += paragraphWordCount;
  }

  // Add final chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push({
      id: `${documentId}-chunk-${chunks.length}`,
      documentId,
      chunkIndex: chunks.length,
      content: currentChunk.join('\n\n'),
      wordCount: currentWordCount,
      startWordIndex: chunkStartWordIndex,
      endWordIndex: totalWordIndex - 1,
      paragraphs: currentChunk
    });
  }

  return chunks;
}

/**
 * Convert paragraph chunks to DocumentChunk format for compatibility
 */
export function convertToDocumentChunks(paragraphChunks: ParagraphChunk[]): Array<{
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  startWordIndex: number;
  endWordIndex: number;
}> {
  return paragraphChunks.map(chunk => ({
    id: chunk.id,
    documentId: chunk.documentId,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    wordCount: chunk.wordCount,
    startWordIndex: chunk.startWordIndex,
    endWordIndex: chunk.endWordIndex
  }));
}