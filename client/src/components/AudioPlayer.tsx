import React, { useState, useRef, useEffect, useCallback } from 'react';

interface AudioPlayerProps {
  audioPath?: string;
  duration?: number;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  currentWordIndex?: number;
  totalWords?: number;
  filename?: string;
}

export function AudioPlayer({
  audioPath,
  duration = 0,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onPlayPause,
  onSeek,
  currentWordIndex = 0,
  totalWords = 0,
  filename = "No audio loaded"
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(audio.currentTime);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onTimeUpdate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play();
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  const handleSeekClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    onSeek(newTime);
  }, [duration, onSeek]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isVisible) return null;

  return (
    <>
      {audioPath && (
        <audio
          ref={audioRef}
          src={audioPath}
          preload="metadata"
        />
      )}
      
      <div className="fixed bottom-6 right-6 bg-surface rounded-xl shadow-2xl border border-gray-200 w-96 max-w-[calc(100vw-3rem)] z-40">
        {/* Player Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-microphone text-white"></i>
            </div>
            <div>
              <h3 className="font-medium text-textPrimary text-sm">{filename}</h3>
              <p className="text-xs text-textSecondary">
                {formatTime(duration)} • {totalWords.toLocaleString()} words
              </p>
            </div>
          </div>
          <button 
            className="text-textSecondary hover:text-textPrimary p-1"
            onClick={() => setIsVisible(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        {/* Playback Controls */}
        <div className="p-4">
          <div className="flex items-center space-x-4 mb-3">
            <button 
              className="text-textSecondary hover:text-textPrimary"
              onClick={() => onSeek(Math.max(0, currentTime - 10))}
            >
              <i className="fas fa-backward"></i>
            </button>
            <button 
              className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
              onClick={onPlayPause}
            >
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} ${!isPlaying ? 'ml-px' : ''}`}></i>
            </button>
            <button 
              className="text-textSecondary hover:text-textPrimary"
              onClick={() => onSeek(Math.min(duration, currentTime + 10))}
            >
              <i className="fas fa-forward"></i>
            </button>
            <div className="flex-1 flex items-center space-x-2">
              <span className="text-xs text-textSecondary">{formatTime(currentTime)}</span>
              <div 
                className="flex-1 bg-gray-200 rounded-full h-1.5 cursor-pointer"
                onClick={handleSeekClick}
              >
                <div className="bg-primary h-1.5 rounded-full relative" style={{ width: `${progressPercentage}%` }}>
                  <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-white shadow"></div>
                </div>
              </div>
              <span className="text-xs text-textSecondary">{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Playback Speed and Options */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <i className="fas fa-tachometer-alt text-textSecondary"></i>
                <select 
                  className="text-xs border border-gray-300 rounded px-1 py-0.5"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>
              <button className="text-textSecondary hover:text-textPrimary">
                <i className="fas fa-arrows-alt-v"></i>
              </button>
            </div>
            
            <div className="text-xs text-textSecondary">
              Word: <span className="font-medium">{currentWordIndex.toLocaleString()}</span> of <span>{totalWords.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        {/* Sync Status */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-textSecondary">Audio synchronized</span>
            </div>
            <button className="text-primary hover:text-blue-700 font-medium">
              Jump to Current
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
