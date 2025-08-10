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

  // Demo data for when no document is loaded
  const demoDocument: Document = {
    id: 'demo',
    name: 'Demo Document',
    content: { demo: true },
    wordCount: 98547,
    audioPath: null,
    audioDuration: 7452,
    wordTimestamps: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const demoChunks: DocumentChunk[] = [
    {
      id: 'demo-chunk-1',
      documentId: 'demo',
      chunkIndex: 0,
      content: 'In this section, we explore the fascinating world of natural language processing and its applications in modern technology. The algorithms that power these systems are incredibly sophisticated, utilizing machine learning techniques that have evolved over decades of research and development. One of the primary challenges in handling large documents is the performance bottleneck created when rendering extensive amounts of text content simultaneously. Traditional approaches often result in thousands of DOM elements being created at once, leading to significant memory consumption and degraded user experience. Virtualization techniques address this issue by implementing a windowing strategy where only the visible content plus a small buffer is rendered in the DOM. This approach dramatically reduces memory usage while maintaining smooth scrolling and interaction capabilities.',
      wordCount: 500,
      startWordIndex: 0,
      endWordIndex: 499
    }
  ];

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
    // TODO: Implement smooth scroll to page
  }, []);

  const handleSearchResultClick = useCallback((chunkIndex: number) => {
    setCurrentPage(chunkIndex);
    // TODO: Implement navigation to search result
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
        />
        
        {/* Main Editor */}
        <VirtualizedEditor
          documentId={activeDocument.id}
          chunks={activeChunks}
          audioTimestamps={activeDocument.wordTimestamps as any}
          currentPlaybackTime={currentPlaybackTime}
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
