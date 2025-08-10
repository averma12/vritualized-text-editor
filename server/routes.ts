import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService } from "./objectStorage";
import { insertDocumentSchema } from "@shared/schema";
import multer from "multer";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Get document by ID
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  // Get document chunks
  app.get("/api/documents/:id/chunks", async (req, res) => {
    try {
      const chunks = await storage.getDocumentChunks(req.params.id);
      res.json(chunks);
    } catch (error) {
      console.error("Error fetching document chunks:", error);
      res.status(500).json({ error: "Failed to fetch document chunks" });
    }
  });

  // Get specific document chunk range
  app.get("/api/documents/:id/chunks/:startIndex/:endIndex", async (req, res) => {
    try {
      const startIndex = parseInt(req.params.startIndex);
      const endIndex = parseInt(req.params.endIndex);
      const chunks = await storage.getDocumentChunkRange(req.params.id, startIndex, endIndex);
      res.json(chunks);
    } catch (error) {
      console.error("Error fetching document chunk range:", error);
      res.status(500).json({ error: "Failed to fetch document chunk range" });
    }
  });

  // Create new document
  app.post("/api/documents", async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  // Update document
  app.put("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.updateDocument(req.params.id, req.body);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // Upload audio file
  app.post("/api/upload-audio", upload.single('audio'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // TODO: In a real implementation, you would:
      // 1. Upload the file to object storage using the presigned URL
      // 2. Process the audio file for transcription
      // 3. Generate word-level timestamps
      // 4. Create document chunks
      
      res.json({ 
        uploadURL,
        message: "Audio file upload initiated",
        filename: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Error uploading audio:", error);
      res.status(500).json({ error: "Failed to upload audio file" });
    }
  });

  // Process uploaded audio (transcription simulation)
  app.post("/api/process-audio", async (req, res) => {
    try {
      const { audioPath, documentName } = req.body;
      
      // TODO: In a real implementation, you would:
      // 1. Use a transcription service (Whisper, etc.)
      // 2. Generate word-level timestamps
      // 3. Chunk the transcript into manageable pieces
      // 4. Store in database
      
      // For now, simulate processing
      const simulatedTranscript = "This is a simulated transcript from the uploaded audio file. In a real implementation, this would contain the actual transcribed text with word-level timestamps for synchronization.";
      
      const wordCount = simulatedTranscript.split(' ').length;
      const chunks = chunkText(simulatedTranscript, 2000); // 2000 words per chunk
      
      const document = await storage.createDocument({
        name: documentName || "Untitled Transcript",
        content: { chunks: chunks.map((chunk, index) => ({ index, content: chunk })) },
        wordCount,
        audioPath,
        audioDuration: 7452, // Simulated duration in seconds
        wordTimestamps: generateSimulatedTimestamps(simulatedTranscript)
      });

      // Create chunk records
      for (let i = 0; i < chunks.length; i++) {
        const chunkWordCount = chunks[i].split(' ').length;
        const startWordIndex = i * 2000;
        await storage.createDocumentChunk({
          documentId: document.id,
          chunkIndex: i,
          content: chunks[i],
          wordCount: chunkWordCount,
          startWordIndex,
          endWordIndex: startWordIndex + chunkWordCount - 1
        });
      }

      res.json(document);
    } catch (error) {
      console.error("Error processing audio:", error);
      res.status(500).json({ error: "Failed to process audio file" });
    }
  });

  // Search within document
  app.get("/api/documents/:id/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Search query required" });
      }

      // Handle demo document search
      if (req.params.id === 'demo') {
        const results = searchInDemoDocument(query);
        return res.json(results);
      }

      const results = await storage.searchInDocument(req.params.id, query);
      res.json(results);
    } catch (error) {
      console.error("Error searching document:", error);
      res.status(500).json({ error: "Failed to search document" });
    }
  });

  // Object storage routes for audio files
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      return res.sendStatus(404);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  const httpServer = createServer(app);
  return httpServer;
}

function chunkText(text: string, wordsPerChunk: number): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  
  return chunks;
}

function generateSimulatedTimestamps(text: string): Array<{word: string, start: number, end: number}> {
  const words = text.split(' ');
  const timestamps: Array<{word: string, start: number, end: number}> = [];
  
  let currentTime = 0;
  for (const word of words) {
    const duration = (word.length * 0.1) + 0.2; // Simulate word duration
    timestamps.push({
      word,
      start: currentTime,
      end: currentTime + duration
    });
    currentTime += duration + 0.1; // Add small pause between words
  }
  
  return timestamps;
}

// Generate demo content (same as client-side)
function generateDemoContent(chunkIndex: number): string {
  const topics = [
    'The Evolution of Artificial Intelligence and Machine Learning',
    'Climate Change and Environmental Science Research',
    'Modern Web Development and Software Architecture',
    'Quantum Computing and Future Technology Trends',
    'Biomedical Engineering and Healthcare Innovation',
    'Space Exploration and Astrophysics Discoveries',
    'Economic Systems and Financial Technology',
    'Educational Psychology and Learning Theory',
    'Urban Planning and Sustainable Development',
    'Neuroscience and Cognitive Research'
  ];
  
  const topic = topics[chunkIndex % topics.length];
  
  let content = `Chapter ${chunkIndex + 1}: ${topic}. `;
  
  // Generate approximately 2000 words per chunk
  for (let i = 0; i < 50; i++) {
    content += `This is paragraph ${i + 1} discussing various aspects of ${topic.toLowerCase()}. We delve deep into the fundamental concepts that shape our understanding of this field. The research methodologies employed in this area are diverse and complex, requiring interdisciplinary collaboration between experts from multiple domains. Historical developments have shown us that innovation often comes from unexpected connections between seemingly unrelated fields of study. Modern approaches to problem-solving in this domain leverage advanced computational techniques and data analysis methods. The implications of these discoveries extend far beyond the immediate scope of the research, influencing policy decisions, technological development, and societal progress. Researchers continue to push the boundaries of what is possible, constantly challenging existing paradigms and proposing novel theoretical frameworks. `;
  }
  
  return content;
}

// Search within demo document
function searchInDemoDocument(query: string): Array<{chunkIndex: number, excerpt: string}> {
  const results: Array<{chunkIndex: number, excerpt: string}> = [];
  
  // Generate and search through 50 demo chunks
  for (let i = 0; i < 50; i++) {
    const content = generateDemoContent(i);
    if (content.toLowerCase().includes(query.toLowerCase())) {
      const index = content.toLowerCase().indexOf(query.toLowerCase());
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + query.length + 50);
      const excerpt = content.substring(start, end);
      
      results.push({
        chunkIndex: i,
        excerpt: `...${excerpt}...`
      });
    }
  }
  
  return results;
}
