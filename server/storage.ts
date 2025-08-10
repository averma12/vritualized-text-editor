import { type Document, type InsertDocument, type DocumentChunk, type InsertDocumentChunk } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getAllDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;
  
  getDocumentChunks(documentId: string): Promise<DocumentChunk[]>;
  getDocumentChunkRange(documentId: string, startIndex: number, endIndex: number): Promise<DocumentChunk[]>;
  createDocumentChunk(chunk: InsertDocumentChunk): Promise<DocumentChunk>;
  updateDocumentChunk(id: string, updates: Partial<DocumentChunk>): Promise<DocumentChunk | undefined>;
  
  searchInDocument(documentId: string, query: string): Promise<Array<{chunkIndex: number, excerpt: string}>>;
}

export class MemStorage implements IStorage {
  private documents: Map<string, Document>;
  private documentChunks: Map<string, DocumentChunk>;

  constructor() {
    this.documents = new Map();
    this.documentChunks = new Map();
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const now = new Date();
    const document: Document = { 
      ...insertDocument,
      wordCount: insertDocument.wordCount || 0,
      audioPath: insertDocument.audioPath || null,
      audioDuration: insertDocument.audioDuration || null,
      wordTimestamps: insertDocument.wordTimestamps || null,
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { 
      ...document, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const deleted = this.documents.delete(id);
    
    // Also delete associated chunks
    const chunksToDelete = Array.from(this.documentChunks.values())
      .filter(chunk => chunk.documentId === id);
    
    chunksToDelete.forEach(chunk => this.documentChunks.delete(chunk.id));
    
    return deleted;
  }

  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    return Array.from(this.documentChunks.values())
      .filter(chunk => chunk.documentId === documentId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async getDocumentChunkRange(documentId: string, startIndex: number, endIndex: number): Promise<DocumentChunk[]> {
    return Array.from(this.documentChunks.values())
      .filter(chunk => 
        chunk.documentId === documentId && 
        chunk.chunkIndex >= startIndex && 
        chunk.chunkIndex <= endIndex
      )
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async createDocumentChunk(insertChunk: InsertDocumentChunk): Promise<DocumentChunk> {
    const id = randomUUID();
    const chunk: DocumentChunk = { ...insertChunk, id };
    this.documentChunks.set(id, chunk);
    return chunk;
  }

  async updateDocumentChunk(id: string, updates: Partial<DocumentChunk>): Promise<DocumentChunk | undefined> {
    const chunk = this.documentChunks.get(id);
    if (!chunk) return undefined;
    
    const updatedChunk = { ...chunk, ...updates };
    this.documentChunks.set(id, updatedChunk);
    return updatedChunk;
  }

  async searchInDocument(documentId: string, query: string): Promise<Array<{chunkIndex: number, excerpt: string}>> {
    const chunks = await this.getDocumentChunks(documentId);
    const results: Array<{chunkIndex: number, excerpt: string}> = [];
    
    chunks.forEach(chunk => {
      if (chunk.content.toLowerCase().includes(query.toLowerCase())) {
        const index = chunk.content.toLowerCase().indexOf(query.toLowerCase());
        const start = Math.max(0, index - 50);
        const end = Math.min(chunk.content.length, index + query.length + 50);
        const excerpt = chunk.content.substring(start, end);
        
        results.push({
          chunkIndex: chunk.chunkIndex,
          excerpt: `...${excerpt}...`
        });
      }
    });
    
    return results;
  }
}

export const storage = new MemStorage();
