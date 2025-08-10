import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DocumentSelector } from "@/components/DocumentSelector";
import { VirtualizedEditor } from "@/components/VirtualizedEditor";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import type { Document } from "@shared/schema";

export default function DocumentManager() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Fetch document chunks when a document is selected
  const { data: chunks = [], isLoading: chunksLoading } = useQuery({
    queryKey: ["/api/documents", selectedDocument?.id, "chunks"],
    queryFn: async () => {
      if (!selectedDocument) return [];
      const response = await fetch(`/api/documents/${selectedDocument.id}/chunks`);
      if (!response.ok) throw new Error("Failed to fetch chunks");
      return response.json();
    },
    enabled: !!selectedDocument,
  });

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document);
    setCurrentPage(0); // Reset to first page when switching documents
  };

  const handleBackToSelector = () => {
    setSelectedDocument(null);
    setCurrentPage(0);
  };

  if (!selectedDocument) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <FileText className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h1 className="text-3xl font-bold mb-2">Document Manager</h1>
              <p className="text-muted-foreground">
                Upload and manage your text documents for virtualized editing
              </p>
            </div>
            <DocumentSelector 
              onDocumentSelect={handleDocumentSelect}
              selectedDocumentId={selectedDocument?.id || undefined}
            />
          </div>
        </div>
      </div>
    );
  }

  if (chunksLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToSelector}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Documents
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{selectedDocument.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {selectedDocument.wordCount.toLocaleString()} words • {chunks.length} pages
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Navigation Sidebar */}
        <div className="w-80 border-r bg-card">
          <NavigationSidebar
            currentPage={currentPage}
            totalPages={chunks.length}
            onPageChange={setCurrentPage}
            documentId={selectedDocument.id}
          />
        </div>

        {/* Editor */}
        <div className="flex-1">
          <VirtualizedEditor
            documentId={selectedDocument.id}
            chunks={chunks}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}