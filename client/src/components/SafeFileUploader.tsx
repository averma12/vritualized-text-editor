import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, X, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { safeApiRequest, handleFileError, logError, VirtualTextError } from "@/lib/errorHandler";

interface SafeFileUploaderProps {
  onUploadSuccess: () => void;
  onCancel: () => void;
}

export function SafeFileUploader({ onUploadSuccess, onCancel }: SafeFileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastError, setLastError] = useState<VirtualTextError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await safeApiRequest(
        async () => {
          const response = await fetch("/api/documents/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
            throw new Error(errorData.error || `HTTP ${response.status}: Upload failed`);
          }

          return response.json();
        },
        "file upload"
      );
    },
    onSuccess: (data) => {
      setUploadProgress(100);
      setLastError(null);
      toast({
        title: "Upload successful",
        description: `${data.name} has been processed with ${data.wordCount.toLocaleString()} words.`,
      });
      
      // Reset form
      resetForm();
      onUploadSuccess();
    },
    onError: (error: Error) => {
      const fileError = handleFileError(error, selectedFile?.name);
      setLastError(fileError);
      logError(fileError, { 
        fileName: selectedFile?.name, 
        fileSize: selectedFile?.size,
        operation: 'file_upload' 
      });
      
      toast({
        title: "Upload failed",
        description: fileError.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedFile(null);
    setDocumentName("");
    setUploadProgress(0);
    setLastError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB limit");
      }

      // Validate file type
      if (!file.name.toLowerCase().endsWith('.txt')) {
        throw new Error("Only .txt files are supported");
      }

      setSelectedFile(file);
      setDocumentName(file.name.replace('.txt', ''));
      setLastError(null);
    } catch (error) {
      const fileError = handleFileError(error, file.name);
      setLastError(fileError);
      toast({
        title: "File validation failed",
        description: fileError.message,
        variant: "destructive",
      });
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", documentName || selectedFile.name.replace('.txt', ''));
      
      uploadMutation.mutate(formData);
    } catch (error) {
      const fileError = handleFileError(error, selectedFile.name);
      setLastError(fileError);
      logError(fileError, { operation: 'upload_preparation' });
    }
  };

  const handleRetry = () => {
    setLastError(null);
    setUploadProgress(0);
    if (selectedFile) {
      handleUpload();
    }
  };

  const isUploading = uploadMutation.isPending;

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upload Document</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Error Display */}
          {lastError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{lastError.message}</span>
              </div>
              {lastError.code && (
                <div className="text-xs text-muted-foreground mt-1">
                  Error Code: {lastError.code}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleRetry}
                disabled={!selectedFile}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try Again
              </Button>
            </div>
          )}

          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file">Select Text File (.txt)</Label>
            <Input
              id="file"
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <File className="w-4 h-4" />
                <span>{selectedFile.name}</span>
                <span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {/* Document Name */}
          {selectedFile && (
            <div className="space-y-2">
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Enter document name"
                disabled={isUploading}
              />
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Processing document...
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading || !documentName.trim()}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}