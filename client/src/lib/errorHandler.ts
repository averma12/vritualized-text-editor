/**
 * Centralized error handling utilities for the VirtualText Editor
 */

export interface ErrorInfo {
  message: string;
  code?: string;
  context?: Record<string, any>;
  timestamp: Date;
}

/**
 * Enhanced error class with additional context
 */
export class VirtualTextError extends Error {
  public code?: string;
  public context?: Record<string, any>;
  public timestamp: Date;

  constructor(message: string, code?: string, context?: Record<string, any>) {
    super(message);
    this.name = 'VirtualTextError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
  }
}

/**
 * Safely executes an async function with error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  errorContext?: Record<string, any>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('SafeAsync error:', error, errorContext);
    return fallback;
  }
}

/**
 * Safely executes a sync function with error handling
 */
export function safeSync<T>(
  fn: () => T,
  fallback: T,
  errorContext?: Record<string, any>
): T {
  try {
    return fn();
  } catch (error) {
    console.error('SafeSync error:', error, errorContext);
    return fallback;
  }
}

/**
 * Wraps API requests with consistent error handling
 */
export async function safeApiRequest<T>(
  request: () => Promise<T>,
  operation: string,
  fallback?: T
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for common API error patterns
    if (errorMessage.includes('fetch')) {
      throw new VirtualTextError(
        `Network error during ${operation}. Please check your connection.`,
        'NETWORK_ERROR',
        { operation, originalError: errorMessage }
      );
    }
    
    if (errorMessage.includes('401')) {
      throw new VirtualTextError(
        `Authentication error during ${operation}.`,
        'AUTH_ERROR',
        { operation, originalError: errorMessage }
      );
    }
    
    if (errorMessage.includes('413') || errorMessage.includes('too large')) {
      throw new VirtualTextError(
        `File too large for ${operation}. Try a smaller document.`,
        'FILE_TOO_LARGE',
        { operation, originalError: errorMessage }
      );
    }
    
    // Generic error
    throw new VirtualTextError(
      `Error during ${operation}: ${errorMessage}`,
      'API_ERROR',
      { operation, originalError: errorMessage }
    );
  }
}

/**
 * Handles file processing errors specifically
 */
export function handleFileError(error: any, filename?: string): VirtualTextError {
  const errorMessage = error instanceof Error ? error.message : 'Unknown file error';
  
  if (errorMessage.includes('size') || errorMessage.includes('large')) {
    return new VirtualTextError(
      `File "${filename || 'selected file'}" is too large. Try a smaller document (max 10MB).`,
      'FILE_TOO_LARGE',
      { filename, originalError: errorMessage }
    );
  }
  
  if (errorMessage.includes('format') || errorMessage.includes('type')) {
    return new VirtualTextError(
      `File "${filename || 'selected file'}" is not supported. Please use .txt files only.`,
      'INVALID_FILE_TYPE',
      { filename, originalError: errorMessage }
    );
  }
  
  if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
    return new VirtualTextError(
      `Not enough memory to process "${filename || 'file'}". Try refreshing the page or using a smaller document.`,
      'MEMORY_ERROR',
      { filename, originalError: errorMessage }
    );
  }
  
  return new VirtualTextError(
    `Failed to process "${filename || 'file'}": ${errorMessage}`,
    'FILE_PROCESSING_ERROR',
    { filename, originalError: errorMessage }
  );
}

/**
 * Handles virtualization-specific errors
 */
export function handleVirtualizationError(error: any, context?: Record<string, any>): VirtualTextError {
  const errorMessage = error instanceof Error ? error.message : 'Unknown virtualization error';
  
  if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
    return new VirtualTextError(
      'Document is too large for your browser memory. Try refreshing the page or using a smaller document.',
      'VIRTUALIZATION_MEMORY_ERROR',
      { ...context, originalError: errorMessage }
    );
  }
  
  if (errorMessage.includes('DOM') || errorMessage.includes('render')) {
    return new VirtualTextError(
      'Error rendering document sections. The document might be corrupted or too complex.',
      'VIRTUALIZATION_RENDER_ERROR',
      { ...context, originalError: errorMessage }
    );
  }
  
  return new VirtualTextError(
    `Virtualization error: ${errorMessage}`,
    'VIRTUALIZATION_ERROR',
    { ...context, originalError: errorMessage }
  );
}

/**
 * Logs errors consistently across the application
 */
export function logError(error: Error | VirtualTextError, context?: Record<string, any>) {
  const errorInfo: ErrorInfo = {
    message: error.message,
    code: error instanceof VirtualTextError ? error.code : undefined,
    context: error instanceof VirtualTextError ? { ...error.context, ...context } : context,
    timestamp: new Date(),
  };
  
  // Console logging for development
  console.error('VirtualText Error:', errorInfo);
  
  // In production, you might send this to an error tracking service:
  // - Sentry.captureException(error, { extra: errorInfo });
  // - LogRocket.captureException(error);
  // - Custom error reporting API
}

/**
 * User-friendly error messages for common scenarios
 */
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File is too large. Please use documents under 10MB.',
  NETWORK_ERROR: 'Network connection issue. Please check your internet and try again.',
  MEMORY_ERROR: 'Not enough memory available. Try refreshing the page or using a smaller document.',
  FILE_CORRUPT: 'File appears to be corrupted or in an unsupported format.',
  PROCESSING_FAILED: 'Failed to process document. Please try again or use a different file.',
  VIRTUALIZATION_FAILED: 'Error displaying document. Try refreshing the page.',
} as const;