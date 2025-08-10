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
// Import the paragraph chunking utility
function generateDemoText(): string {
  const topics = [
    { 
      title: 'The Evolution of Artificial Intelligence and Machine Learning',
      content: [
        'Artificial Intelligence has undergone remarkable transformation over the past decade, evolving from theoretical concepts to practical applications that permeate every aspect of our daily lives.',
        'Machine learning algorithms now power recommendation systems, autonomous vehicles, and medical diagnostic tools with unprecedented accuracy and efficiency.',
        'The development of neural networks, particularly deep learning architectures, has revolutionized how computers process and understand complex data patterns.',
        'From natural language processing to computer vision, AI systems demonstrate capabilities that were once thought to be exclusively human domains.'
      ]
    },
    {
      title: 'Climate Change and Environmental Science Research',
      content: [
        'Climate science has reached a critical juncture where the evidence for anthropogenic climate change is overwhelming and undeniable.',
        'Rising global temperatures, melting ice caps, and extreme weather events demonstrate the urgent need for comprehensive environmental action.',
        'Research institutions worldwide collaborate to develop climate models that predict future scenarios and inform policy decisions.',
        'The transition to renewable energy sources represents both a challenge and an opportunity for sustainable development.'
      ]
    },
    {
      title: 'Modern Web Development and Software Architecture',
      content: [
        'Web development has evolved from static HTML pages to dynamic, interactive applications that rival traditional desktop software.',
        'Modern frameworks like React, Vue, and Angular enable developers to create sophisticated user interfaces with enhanced performance.',
        'Microservices architecture and cloud computing have transformed how applications are designed, deployed, and scaled.',
        'The emphasis on user experience, accessibility, and performance optimization drives innovation in web technologies.'
      ]
    }
  ];

  let fullText = 'A4 Format Demo Document - Comprehensive Research Compilation\n\n';
  
  // Repeat topics to create substantial content
  for (let chapter = 1; chapter <= 15; chapter++) {
    const topic = topics[(chapter - 1) % topics.length];
    fullText += `Chapter ${chapter}: ${topic.title}\n\n`;
    
    for (let section = 1; section <= 4; section++) {
      fullText += `Section ${section}.\n\n`;
      
      // Add multiple paragraphs for each section
      for (let para = 0; para < topic.content.length; para++) {
        fullText += topic.content[para] + '\n\n';
        
        // Add additional elaboration paragraphs
        fullText += `This research demonstrates significant implications for the field, providing new insights into the underlying mechanisms and potential applications. The methodology employed in these studies follows rigorous scientific standards and incorporates peer-reviewed protocols.\n\n`;
        
        fullText += `Furthermore, the interdisciplinary approach taken in this investigation reveals connections between seemingly disparate domains, opening new avenues for future research and practical implementation.\n\n`;
      }
    }
  }

  return fullText;
}

function chunkTextByParagraphs(text: string, documentId: string): Array<{
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  startWordIndex: number;
  endWordIndex: number;
}> {
  const maxWordsPerPage = 600; // A4 page capacity
  const minWordsPerPage = 150; // Minimum before page break

  // Split text into paragraphs (double line breaks or single line breaks)
  const paragraphs = text
    .split(/\n\s*\n|\n/) // Split on double newlines or single newlines
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: any[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;
  let totalWordIndex = 0;
  let chunkStartWordIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const paragraphWords = paragraph.split(/\s+/).filter(w => w.length > 0);
    const paragraphWordCount = paragraphWords.length;

    // Check if adding this paragraph would exceed the page limit
    if (currentWordCount > 0 && currentWordCount + paragraphWordCount > maxWordsPerPage) {
      // Only create chunk if it has meaningful content
      if (currentWordCount >= minWordsPerPage || i === paragraphs.length - 1) {
        // Create current chunk
        chunks.push({
          id: `${documentId}-chunk-${chunks.length}`,
          documentId,
          chunkIndex: chunks.length,
          content: currentChunk.join('\n\n'),
          wordCount: currentWordCount,
          startWordIndex: chunkStartWordIndex,
          endWordIndex: totalWordIndex - 1
        });

        // Start new chunk
        currentChunk = [paragraph];
        currentWordCount = paragraphWordCount;
        chunkStartWordIndex = totalWordIndex;
      } else {
        // Current chunk is too small, add the paragraph anyway
        currentChunk.push(paragraph);
        currentWordCount += paragraphWordCount;
      }
    } else {
      // Add paragraph to current chunk
      currentChunk.push(paragraph);
      currentWordCount += paragraphWordCount;
    }

    totalWordIndex += paragraphWordCount;
  }

  // Add final chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push({
      id: `${documentId}-chunk-${chunks.length}`,
      documentId,
      chunkIndex: chunks.length,
      content: currentChunk.join('\n\n'),
      wordCount: currentWordCount,
      startWordIndex: chunkStartWordIndex,
      endWordIndex: totalWordIndex - 1
    });
  }

  return chunks;
}

function searchInDemoDocument(query: string): Array<{chunkIndex: number, excerpt: string}> {
  const results: Array<{chunkIndex: number, excerpt: string}> = [];
  
  // Use the same paragraph-based chunking as the main editor
  const demoText = generateDemoText();
  const demoChunks = chunkTextByParagraphs(demoText, 'demo');
  
  // Search through the paragraph-based chunks (same as editor)
  demoChunks.forEach(chunk => {
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
