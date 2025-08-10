import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { chunkTextByParagraphs, convertToDocumentChunks } from '@/utils/paragraphChunker';

interface FileUploaderProps {
  onFileProcessed: (document: {
    id: string;
    name: string; // Changed from 'title' to 'name' to match schema
    content: string;
    wordCount: number;
    audioPath?: string | null;
    audioDuration?: number | null;
    wordTimestamps?: any[];
    chunks: Array<{
      id: string;
      documentId: string;
      chunkIndex: number;
      content: string;
      wordCount: number;
      startWordIndex: number;
      endWordIndex: number;
    }>;
  }) => void;
  onClose: () => void;
}

export function FileUploader({ onFileProcessed, onClose }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processTextFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const words = text.split(/\s+/).filter(word => word.length > 0);
      
      if (words.length === 0) {
        throw new Error('File appears to be empty');
      }

      // Create document and chunk by paragraphs
      const documentId = `uploaded-${Date.now()}`;
      
      // Use paragraph-based chunking for proper page breaks
      const paragraphChunks = chunkTextByParagraphs(text, documentId, {
        maxWordsPerPage: 600, // Conservative estimate for A4 pages
        minWordsPerPage: 150  // Minimum words before forcing page break
      });
      
      // Convert to compatible format
      const chunks = convertToDocumentChunks(paragraphChunks);

      const processedDocument = {
        id: documentId,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        content: text,
        wordCount: words.length,
        audioPath: null,
        audioDuration: null,
        wordTimestamps: [],
        chunks
      };

      onFileProcessed(processedDocument);
      
      toast({
        title: "File processed successfully",
        description: `${file.name} with ${words.length.toLocaleString()} words split into ${chunks.length} chunks`
      });

      onClose();
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check file type
    if (!file.type.startsWith('text/') && !file.name.endsWith('.txt')) {
      toast({
        title: "Invalid file type",
        description: "Please select a text file (.txt)",
        variant: "destructive"
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    processTextFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Upload Text File</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'}
            ${isProcessing ? 'opacity-50' : 'hover:border-primary hover:bg-primary/5'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isProcessing ? (
            <div className="space-y-4">
              <div className="animate-spin mx-auto w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
              <p className="text-sm text-gray-600">Processing file...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium">Drop your text file here</p>
                <p className="text-sm text-gray-600">or click to browse</p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4"
              >
                <Upload className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={isProcessing}
        />

        <div className="mt-4 text-xs text-gray-500">
          <p>• Supported formats: .txt files</p>
          <p>• Maximum file size: 10MB</p>
          <p>• Files will be automatically chunked for optimal performance</p>
        </div>
      </div>
    </div>
  );
}