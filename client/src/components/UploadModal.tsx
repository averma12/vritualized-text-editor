import React, { useState, useCallback } from 'react';
import { ObjectUploader } from './ObjectUploader';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { UploadResult } from '@uppy/core';

interface UploadModalProps {
  isVisible: boolean;
  onClose: () => void;
  onUploadSuccess: (documentId: string) => void;
}

export function UploadModal({ isVisible, onClose, onUploadSuccess }: UploadModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const processAudioMutation = useMutation({
    mutationFn: async (data: { audioPath: string; documentName: string }) => {
      const response = await apiRequest('POST', '/api/process-audio', data);
      return response.json();
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setIsProcessing(false);
      setProcessingProgress(0);
      onUploadSuccess(document.id);
      onClose();
    },
    onError: (error) => {
      console.error('Failed to process audio:', error);
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  });

  const handleGetUploadParameters = useCallback(async () => {
    const response = await apiRequest('POST', '/api/objects/upload', {});
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  }, []);

  const handleUploadComplete = useCallback((result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL as string;
      setUploadedFile(uploadURL);
      
      // Start processing simulation
      setIsProcessing(true);
      
      // Simulate processing progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Start actual processing
          processAudioMutation.mutate({
            audioPath: uploadURL,
            documentName: `Transcript_${new Date().toISOString().split('T')[0]}`
          });
        }
        setProcessingProgress(progress);
      }, 500);
    }
  }, [processAudioMutation]);

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      onClose();
      setUploadedFile(null);
      setProcessingProgress(0);
    }
  }, [isProcessing, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md mx-4">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-textPrimary">Upload Audio File</h2>
          <button 
            className="text-textSecondary hover:text-textPrimary disabled:opacity-50"
            onClick={handleClose}
            disabled={isProcessing}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        {/* Upload Area */}
        <div className="p-6">
          {!uploadedFile && !isProcessing && (
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={500 * 1024 * 1024} // 500MB
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="w-full"
            >
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer w-full">
                <i className="fas fa-cloud-upload-alt text-4xl text-textSecondary mb-4"></i>
                <h3 className="text-lg font-medium text-textPrimary mb-2">Drop your audio file here</h3>
                <p className="text-textSecondary mb-4">or click to browse</p>
                <div className="text-xs text-textSecondary">
                  Supports MP3, WAV, M4A up to 500MB
                </div>
              </div>
            </ObjectUploader>
          )}
          
          {/* Processing Status */}
          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <h4 className="font-medium text-textPrimary">Processing Audio</h4>
                  <p className="text-sm text-textSecondary">Transcribing and preparing for virtualization...</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Transcription</span>
                  <span className="text-textPrimary">{Math.round(processingProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-blue-800">
                  <strong>Optimization in progress:</strong> Breaking transcript into 2,000-word chunks for optimal performance with large documents.
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Modal Actions */}
        {!isProcessing && (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <button 
              className="px-4 py-2 text-textSecondary hover:text-textPrimary transition-colors"
              onClick={handleClose}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
