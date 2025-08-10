import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUploader } from "./FileUploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Document } from "@shared/schema";

interface DocumentSelectorProps {
  onDocumentSelect: (document: Document) => void;
  selectedDocumentId?: string;
}

export function DocumentSelector({ onDocumentSelect, selectedDocumentId }: DocumentSelectorProps) {
  const [showUploader, setShowUploader] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents list
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
    },
    onError: (error) => {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete the document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUploadSuccess = () => {
    setShowUploader(false);
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    toast({
      title: "Upload successful",
      description: "Your document has been uploaded and processed.",
    });
  };

  const handleDeleteDocument = async (documentId: string, documentName: string) => {
    if (confirm(`Are you sure you want to delete "${documentName}"? This action cannot be undone.`)) {
      deleteDocumentMutation.mutate(documentId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload New Document
          </CardTitle>
          <CardDescription>
            Upload a text file (.txt) to create a new document for editing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showUploader ? (
            <div className="space-y-4">
              <FileUploader
                onUploadSuccess={handleUploadSuccess}
                onCancel={() => setShowUploader(false)}
              />
            </div>
          ) : (
            <Button onClick={() => setShowUploader(true)} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Choose File to Upload
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Documents</h3>
        
        {documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No documents yet. Upload your first text file to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {documents.map((document) => (
              <Card 
                key={document.id} 
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  selectedDocumentId === document.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => onDocumentSelect(document)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-medium">{document.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(document.createdAt!)}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {document.wordCount.toLocaleString()} words
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(document.id, document.name);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>Text Document</span>
                    {selectedDocumentId === document.id && (
                      <Badge variant="default" className="ml-auto">
                        Selected
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}