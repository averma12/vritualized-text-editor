# VirtualText Document Editor

## Overview

VirtualText is a sophisticated document editor application designed for handling large text documents with synchronized audio playback. The application provides a virtualized editing experience that can efficiently manage documents with tens of thousands of words while maintaining smooth performance. Key features include real-time audio-text synchronization, document chunking for optimal performance, search functionality, and file upload capabilities with object storage integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui design system for consistent, accessible components
- **Styling**: Tailwind CSS with custom CSS variables for theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js for RESTful API endpoints
- **Language**: TypeScript for type safety across the entire stack
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured via Neon Database serverless)
- **File Processing**: Multer for handling multipart file uploads
- **Development**: Hot module replacement and error overlay for development experience

### Data Storage Solutions
- **Primary Database**: PostgreSQL with two main tables:
  - `documents`: Stores document metadata, content as JSON, audio paths, and word timestamps
  - `document_chunks`: Stores chunked document content for efficient virtualization
- **Object Storage**: Google Cloud Storage integration for file storage with custom ACL policies
- **Caching**: In-memory storage implementation (`MemStorage`) for development/demo purposes
- **Schema Management**: Drizzle migrations for database schema versioning

### Virtualization Strategy
The application implements sophisticated document virtualization to handle large documents:
- **Chunk-based Rendering**: Documents are split into manageable chunks (typically 2000 words each)
- **Buffer System**: Renders visible chunks plus buffer zones for smooth scrolling
- **Performance Optimization**: Only renders DOM elements for visible content areas
- **Memory Management**: Efficient cleanup of non-visible chunks to prevent memory leaks

### Audio Synchronization System
- **Timestamp Mapping**: Word-level timestamps stored as JSON arrays linking text to audio positions
- **Real-time Highlighting**: Custom hooks (`useAudioSync`) for highlighting current word during playback
- **Playback Controls**: Full audio player with speed control, seeking, and play/pause functionality
- **Cross-chunk Navigation**: Automatic scrolling to maintain visual sync across document chunks

### External Dependencies

#### Cloud Services
- **Google Cloud Storage**: Primary object storage for uploaded files and audio content
- **Neon Database**: Serverless PostgreSQL hosting for production database needs

#### File Upload System
- **Uppy**: Modern file uploader with dashboard interface, progress tracking, and AWS S3 integration
- **Direct Upload**: Presigned URLs for secure direct-to-storage uploads bypassing server bandwidth

#### Development Tools
- **Replit Integration**: Custom cartographer plugin and runtime error modal for Replit environment
- **TypeScript**: Full type safety across client, server, and shared code
- **ESBuild**: Fast bundling for production server builds

#### UI Framework Dependencies
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Lucide Icons**: Modern icon library for consistent iconography
- **React Hook Form**: Form validation and state management with Zod schema validation
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens

The architecture prioritizes performance for large documents through virtualization, maintains type safety throughout the stack, and provides a scalable foundation for document processing workflows.