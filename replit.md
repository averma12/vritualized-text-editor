# VirtualText Document Editor

## Overview

VirtualText is a high-performance document editor designed for handling large transcribed audio files (around 100k words) with virtualization to prevent DOM overload. The editor features real-time word highlighting synchronized with audio playback, Google Docs-style A4 page layout, dynamic file uploading with paragraph-based chunking, and authentic real-time performance monitoring.

## Recent Changes

**Latest Update - High-Performance Optimizations (August 2025)**
- ✅ Implemented fixed-height virtual scrolling eliminating layout recalculations
- ✅ Added predictive pre-rendering to load chunks before they're visible
- ✅ Using CSS transforms for GPU-accelerated animations (highlights, positioning)
- ✅ Batch DOM updates with requestAnimationFrame for smooth rendering
- ✅ Aggressive caching with smart cleanup to control memory usage
- ✅ Web Workers for offloading search indexing and processing
- ✅ Soft page boundaries with graceful overflow handling
- ✅ Optimized scrollbar with performance indicators
- ✅ Fixed scroll progress tracking and section detection
- ✅ Search highlighting now uses CSS classes instead of inline styles
- ✅ Memory-efficient chunk rendering with contain CSS property

**Previous Update - GitHub Integration & Documentation (August 2025)**
- ✅ Successfully connected project to GitHub repository: averma12/vritualized-text-editor
- ✅ Created comprehensive README.md with full technical documentation
- ✅ Implemented real-time performance metrics using browser APIs
- ✅ Fixed page navigation interface conflicts between different components
- ✅ Added authentic memory usage tracking via performance.memory API
- ✅ Real DOM element counting from virtualized view
- ✅ Dynamic viewport information showing currently visible pages
- ✅ Performance metrics update every 10 seconds with authentic data
- ✅ Navigation system fully debugged and working across all views
- ✅ Project now publicly available and documented for collaboration

**Previous Updates**
- ✅ Document upload workflow fully implemented and tested successfully
- ✅ Page navigation system completely debugged and fixed after extensive troubleshooting
- ✅ NavigationSidebar made compatible with both onPageChange and onPageClick interfaces
- ✅ Virtualization system working correctly - only renders visible range of chunks

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
The application implements advanced fixed-height virtualization for optimal performance:
- **Fixed-Height Chunks**: Each chunk has a predetermined height (400px) eliminating layout recalculations
- **Predictive Pre-rendering**: Chunks are loaded before they enter viewport based on scroll velocity
- **Overscan Buffer**: Renders 3 chunks above/below viewport for seamless scrolling
- **Smart Caching**: LRU cache with automatic cleanup when exceeding 30% of total chunks
- **GPU Acceleration**: CSS transforms for positioning avoiding reflow/repaint
- **Batch Updates**: All DOM modifications use requestAnimationFrame for 60fps scrolling
- **Memory Management**: Aggressive cleanup with configurable thresholds

### Audio Synchronization System
- **Timestamp Mapping**: Word-level timestamps stored as JSON arrays linking text to audio positions
- **Real-time Highlighting**: CSS transform-based highlighting avoiding DOM manipulation
- **Playback Controls**: Full audio player with speed control, seeking, and play/pause functionality
- **Cross-chunk Navigation**: Automatic scrolling to maintain visual sync across document chunks

### Search System Architecture
- **Web Worker Processing**: Search indexing runs in separate thread preventing UI blocking
- **Inverted Index**: Word-to-position mapping for O(1) lookups
- **Partial Matching**: Supports both exact and substring matches
- **Context Extraction**: Shows 5 words before/after matches for preview
- **Result Limiting**: Caps at 100 results to prevent UI overload
- **CSS-based Highlighting**: Uses classes instead of inline styles for performance

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