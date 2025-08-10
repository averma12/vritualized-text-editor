import React from 'react';

interface EditorToolbarProps {
  documentName: string;
  wordCount: number;
  memoryUsage: number;
  domElements: number;
  viewportInfo: string;
  onSearchClick: () => void;
  onSettingsClick: () => void;
  onUploadClick: () => void;
}

export function EditorToolbar({
  documentName,
  wordCount,
  memoryUsage,
  domElements,
  viewportInfo,
  onSearchClick,
  onSettingsClick,
  onUploadClick
}: EditorToolbarProps) {
  
  return (
    <header className="bg-surface border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-full px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo and File Name */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-file-text text-primary text-xl"></i>
              <h1 className="text-lg font-semibold text-textPrimary">VirtualText</h1>
            </div>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-textSecondary">{documentName}</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                {wordCount.toLocaleString()} words
              </span>
            </div>
          </div>
          
          {/* Center: Performance Metrics */}
          <div className="hidden md:flex items-center space-x-6 text-sm text-textSecondary">
            <div className="flex items-center space-x-2">
              <i className="fas fa-memory text-green-600"></i>
              <span>Memory: {memoryUsage}MB</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-tachometer-alt text-blue-600"></i>
              <span>DOM: {domElements.toLocaleString()} elements</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-eye text-purple-600"></i>
              <span>Viewport: {viewportInfo}</span>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center space-x-3">
            <button 
              className="p-2 text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded-lg transition-colors"
              onClick={onSearchClick}
            >
              <i className="fas fa-search"></i>
            </button>
            <button 
              className="p-2 text-textSecondary hover:text-textPrimary hover:bg-gray-100 rounded-lg transition-colors"
              onClick={onSettingsClick}
            >
              <i className="fas fa-cog"></i>
            </button>
            <button 
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              onClick={onUploadClick}
            >
              <i className="fas fa-upload mr-2"></i>
              Upload Audio
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
