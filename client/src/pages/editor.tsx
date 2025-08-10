import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VirtualizedEditor } from '@/components/VirtualizedEditor';
import { NavigationSidebar } from '@/components/NavigationSidebar';
import { AudioPlayer } from '@/components/AudioPlayer';
import { EditorToolbar } from '@/components/EditorToolbar';
import { SearchOverlay } from '@/components/SearchOverlay';
import { UploadModal } from '@/components/UploadModal';
import { type Document, type DocumentChunk } from '@shared/schema';
import { useParams } from 'wouter';

export default function Editor() {
  const params = useParams();
  const documentId = params.id || 'demo';
  
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [chunkSize, setChunkSize] = useState(2000);
  const [bufferSize, setBufferSize] = useState(2);

  // Fetch document data
  const { data: document } = useQuery<Document>({
    queryKey: ['/api/documents', documentId],
    enabled: documentId !== 'demo'
  });

  // Fetch document chunks
  const { data: chunks = [] } = useQuery<DocumentChunk[]>({
    queryKey: ['/api/documents', documentId, 'chunks'],
    enabled: documentId !== 'demo'
  });

  // Generate realistic large demo document
  const generateDemoContent = (chunkIndex: number): string => {
    const topics = [
      'The Evolution of Artificial Intelligence and Machine Learning',
      'Climate Change and Environmental Science Research',
      'Modern Web Development and Software Architecture',
      'Quantum Computing and Future Technology Trends',
      'Biomedical Engineering and Healthcare Innovation',
      'Space Exploration and Astrophysics Discoveries',
      'Economic Systems and Financial Technology',
      'Educational Psychology and Learning Theory',
      'Urban Planning and Sustainable Development',
      'Neuroscience and Cognitive Research'
    ];
    
    const topic = topics[chunkIndex % topics.length];
    
    let content = `Chapter ${chunkIndex + 1}: ${topic}. `;
    
    // Generate approximately 2000 words per chunk
    for (let i = 0; i < 50; i++) {
      content += `This is paragraph ${i + 1} discussing various aspects of ${topic.toLowerCase()}. We delve deep into the fundamental concepts that shape our understanding of this field. The research methodologies employed in this area are diverse and complex, requiring interdisciplinary collaboration between experts from multiple domains. Historical developments have shown us that innovation often comes from unexpected connections between seemingly unrelated fields of study. Modern approaches to problem-solving in this domain leverage advanced computational techniques and data analysis methods. The implications of these discoveries extend far beyond the immediate scope of the research, influencing policy decisions, technological development, and societal progress. Researchers continue to push the boundaries of what is possible, constantly challenging existing paradigms and proposing novel theoretical frameworks. `;
    }
    
    return content;
  };

  // Demo data for when no document is loaded
  const demoDocument: Document = {
    id: 'demo',
    name: 'Large Demo Document - Virtualization Test (100k+ words)',
    content: { demo: true },
    wordCount: 100000,
    audioPath: null,
    audioDuration: 7452,
    wordTimestamps: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Generate 50 chunks of ~2000 words each = ~100k words total
  const demoChunks: DocumentChunk[] = Array.from({ length: 50 }, (_, index) => ({
    id: `demo-chunk-${index + 1}`,
    documentId: 'demo',
    chunkIndex: index,
    content: generateDemoContent(index),
    wordCount: 2000,
    startWordIndex: index * 2000,
    endWordIndex: (index + 1) * 2000 - 1
  }));

  const activeDocument = document || demoDocument;
  const activeChunks = chunks.length > 0 ? chunks : demoChunks;

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentPlaybackTime(time);
  }, []);

  const handlePageClick = useCallback((pageIndex: number) => {
    setCurrentPage(pageIndex);
    // Trigger scroll to the selected page
    const event = new CustomEvent('scrollToChunk', { detail: pageIndex });
    window.dispatchEvent(event);
  }, []);

  const handleSearchResultClick = useCallback((chunkIndex: number) => {
    setCurrentPage(chunkIndex);
    setShowSearch(false);
    // Scroll to the specific chunk
    const event = new CustomEvent('scrollToChunk', { detail: chunkIndex });
    window.dispatchEvent(event);
  }, []);

  const handleUploadSuccess = useCallback((newDocumentId: string) => {
    // TODO: Navigate to new document
    console.log('Upload successful, document ID:', newDocumentId);
  }, []);

  const documentProgress = activeChunks.length > 0 ? 
    ((currentPage + 1) / activeChunks.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <EditorToolbar
        documentName={activeDocument.name}
        wordCount={activeDocument.wordCount}
        onSearchClick={() => setShowSearch(true)}
        onSettingsClick={() => {}}
        onUploadClick={() => setShowUpload(true)}
      />

      <div className="flex h-screen overflow-hidden">
        {/* Navigation Sidebar */}
        <NavigationSidebar
          chunks={activeChunks}
          currentPage={currentPage}
          totalPages={activeChunks.length}
          onPageClick={handlePageClick}
          documentProgress={documentProgress}
          chunkSize={chunkSize}
          bufferSize={bufferSize}
          onChunkSizeChange={setChunkSize}
          onBufferSizeChange={setBufferSize}
        />
        
        {/* Main Editor */}
        <VirtualizedEditor
          documentId={activeDocument.id}
          chunks={activeChunks}
          audioTimestamps={activeDocument.wordTimestamps as any}
          currentPlaybackTime={currentPlaybackTime}
          chunkSize={chunkSize}
          bufferSize={bufferSize}
        />
      </div>

      {/* Audio Player */}
      {activeDocument.audioPath && (
        <AudioPlayer
          audioPath={activeDocument.audioPath}
          duration={activeDocument.audioDuration || 0}
          currentTime={currentPlaybackTime}
          isPlaying={isPlaying}
          onTimeUpdate={setCurrentPlaybackTime}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          currentWordIndex={Math.floor(currentPlaybackTime * 2.5)} // Rough estimation
          totalWords={activeDocument.wordCount}
          filename={activeDocument.name}
        />
      )}

      {/* Search Overlay */}
      <SearchOverlay
        isVisible={showSearch}
        onClose={() => setShowSearch(false)}
        documentId={activeDocument.id}
        onResultClick={handleSearchResultClick}
      />

      {/* Upload Modal */}
      <UploadModal
        isVisible={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
