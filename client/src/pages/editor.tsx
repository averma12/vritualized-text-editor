import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OptimizedEditor } from '@/components/OptimizedEditor';
import { DocumentScrollbar } from '@/components/DocumentScrollbar';
import { AudioPlayer } from '@/components/AudioPlayer';
import { EditorToolbar } from '@/components/EditorToolbar';
import { SearchOverlay } from '@/components/SearchOverlay';
import { FileUploader } from '@/components/FileUploader';
import { UploadModal } from '@/components/UploadModal';
import { type Document, type DocumentChunk } from '@shared/schema';
import { useParams } from 'wouter';
import { chunkTextByParagraphs, convertToDocumentChunks } from '@/utils/paragraphChunker';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';

export default function Editor() {
  const params = useParams();
  const documentId = params.id || 'demo';
  
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [chunkSize, setChunkSize] = useState(2000);
  const [bufferSize, setBufferSize] = useState(2);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<{
    id: string;
    name: string;
    content: string;
    wordCount: number;
    audioPath?: string | null;
    audioDuration?: number | null;
    wordTimestamps?: any[];
    chunks: DocumentChunk[];
  } | null>(null);
  const [scrollToTrigger, setScrollToTrigger] = useState<number | undefined>();

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

  // Generate realistic demo content with proper paragraph structure
  const generateDemoText = (): string => {
    const topics = [
      { 
        title: 'The Evolution of Artificial Intelligence and Machine Learning',
        content: [
          'Artificial Intelligence has undergone remarkable transformation over the past decade, evolving from theoretical concepts to practical applications that permeate every aspect of our daily lives.',
          'Machine learning algorithms now power recommendation systems, autonomous vehicles, and medical diagnostic tools with unprecedented accuracy and efficiency.',
          'The development of neural networks, particularly deep learning architectures, has revolutionized how computers process and understand complex data patterns.',
          'From natural language processing to computer vision, AI systems demonstrate capabilities that were once thought to be exclusively human domains.'
        ]
      },
      {
        title: 'Climate Change and Environmental Science Research',
        content: [
          'Climate science has reached a critical juncture where the evidence for anthropogenic climate change is overwhelming and undeniable.',
          'Rising global temperatures, melting ice caps, and extreme weather events demonstrate the urgent need for comprehensive environmental action.',
          'Research institutions worldwide collaborate to develop climate models that predict future scenarios and inform policy decisions.',
          'The transition to renewable energy sources represents both a challenge and an opportunity for sustainable development.'
        ]
      },
      {
        title: 'Modern Web Development and Software Architecture',
        content: [
          'Web development has evolved from static HTML pages to dynamic, interactive applications that rival traditional desktop software.',
          'Modern frameworks like React, Vue, and Angular enable developers to create sophisticated user interfaces with enhanced performance.',
          'Microservices architecture and cloud computing have transformed how applications are designed, deployed, and scaled.',
          'The emphasis on user experience, accessibility, and performance optimization drives innovation in web technologies.'
        ]
      }
    ];

    let fullText = 'A4 Format Demo Document - Comprehensive Research Compilation\n\n';
    
    // Repeat topics to create substantial content
    for (let chapter = 1; chapter <= 15; chapter++) {
      const topic = topics[(chapter - 1) % topics.length];
      fullText += `Chapter ${chapter}: ${topic.title}\n\n`;
      
      for (let section = 1; section <= 4; section++) {
        fullText += `Section ${section}.\n\n`;
        
        // Add multiple paragraphs for each section
        for (let para = 0; para < topic.content.length; para++) {
          fullText += topic.content[para] + '\n\n';
          
          // Add additional elaboration paragraphs
          fullText += `This research demonstrates significant implications for the field, providing new insights into the underlying mechanisms and potential applications. The methodology employed in these studies follows rigorous scientific standards and incorporates peer-reviewed protocols.\n\n`;
          
          fullText += `Furthermore, the interdisciplinary approach taken in this investigation reveals connections between seemingly disparate domains, opening new avenues for future research and practical implementation.\n\n`;
        }
      }
    }

    return fullText;
  };

  // Demo data for when no document is loaded
  // Generate demo content with paragraph-based chunking
  const demoText = generateDemoText();
  const demoParagraphChunks = chunkTextByParagraphs(demoText, 'demo', {
    maxWordsPerPage: 600, // A4 page capacity
    minWordsPerPage: 150  // Minimum before page break
  });
  const demoChunks = convertToDocumentChunks(demoParagraphChunks);

  const demoDocument: Document = {
    id: 'demo',
    name: `A4 Demo Document - ${demoChunks.length} Pages (${demoText.split(/\s+/).length.toLocaleString()} words)`,
    content: { demo: true },
    wordCount: demoText.split(/\s+/).length,
    audioPath: null,
    audioDuration: 7452,
    wordTimestamps: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const activeDocument = uploadedDocument || document || demoDocument;
  const activeChunks = uploadedDocument?.chunks || (chunks.length > 0 ? chunks : demoChunks);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentPlaybackTime(time);
  }, []);

  const handleScrollTo = useCallback((progress: number) => {
    setScrollProgress(progress);
    // Convert progress to section index for tracking
    const sectionIndex = Math.floor(progress * activeChunks.length);
    setCurrentSection(Math.max(0, Math.min(activeChunks.length - 1, sectionIndex)));
    // Force editor to scroll to position
    setScrollToTrigger(progress);
  }, [activeChunks.length]);
  
  const handleScroll = useCallback((progress: number) => {
    setScrollProgress(progress);
    // Better calculation for current section based on scroll progress
    const totalSections = Math.max(1, activeChunks.length);
    const sectionIndex = Math.floor(progress * totalSections);
    setCurrentSection(Math.max(0, Math.min(totalSections - 1, sectionIndex)));
  }, [activeChunks.length]);
  
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchTerm('');
    }
  }, []);

  const handleSearchResultClick = useCallback((chunkIndex: number) => {
    const progress = chunkIndex / Math.max(1, activeChunks.length - 1);
    handleScrollTo(progress);
    setShowSearch(false);
  }, [handleScrollTo, activeChunks.length]);

  const handleFileProcessed = useCallback((processedDocument: {
    id: string;
    name: string;
    content: string;
    wordCount: number;
    audioPath?: string | null;
    audioDuration?: number | null;
    wordTimestamps?: any[];
    chunks: DocumentChunk[];
  }) => {
    setUploadedDocument(processedDocument);
    setScrollProgress(0); // Reset to top
  }, []);

  const handleUploadSuccess = useCallback(() => {
    // Close the uploader modal after successful upload
    setShowFileUploader(false);
    console.log('Upload successful');
  }, []);

  // Get real performance metrics
  const performanceMetrics = usePerformanceMetrics({
    currentPage: currentSection,
    totalPages: activeChunks.length,
    visibleChunks: [], // Will be populated by ContinuousEditor
    containerRef: undefined // Will be passed from ContinuousEditor if needed
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <EditorToolbar
        documentName={activeDocument.name}
        wordCount={activeDocument.wordCount}
        memoryUsage={performanceMetrics.memoryUsage}
        domElements={performanceMetrics.domElements}
        viewportInfo={performanceMetrics.viewportInfo}
        onSearchClick={() => setShowSearch(true)}
        onSettingsClick={() => {}}
        onUploadClick={() => setShowFileUploader(true)}
      />

      <div className="flex h-screen overflow-hidden">
        {/* Optimized Editor with all performance enhancements */}
        <OptimizedEditor
          documentId={activeDocument.id}
          chunks={activeChunks}
          audioTimestamps={activeDocument.wordTimestamps as any}
          currentPlaybackTime={currentPlaybackTime}
          onScroll={handleScroll}
          searchTerm={searchTerm}
          scrollToProgress={scrollToTrigger}
          onContentChange={(chunkIndex, content) => {
            // Handle content changes per chunk
            console.log(`Chunk ${chunkIndex} changed:`, content.length, 'characters');
          }}
        />
        
        {/* Minimal Document Scrollbar - Replaces sidebar */}
        <DocumentScrollbar
          scrollProgress={scrollProgress}
          totalChunks={activeChunks.length}
          currentChunk={currentSection}
          onScrollTo={handleScrollTo}
          onSearch={handleSearch}
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

      {/* File Uploader */}
      {showFileUploader && (
        <FileUploader
          onUploadSuccess={handleUploadSuccess}
          onCancel={() => setShowFileUploader(false)}
        />
      )}
    </div>
  );
}
