# BlueWhale Frontend

BlueWhale is a knowledge management system with vector search capabilities and social features. This is the frontend part of the application built with Next.js and TailwindCSS.

## Features

- Document upload (text, PDF, URL)
- Vector-based semantic search
- SNS-style feed with "For You", "Local", and "Global" tabs
- AI citation tracking and trust scoring
- User recommendations based on content similarity
- Shareable document links

## Getting Started

### Prerequisites
- Node.js 14.x or higher
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Create a `.env.local` file with the following variables:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Directory Structure

```
frontend/
├── components/        # Reusable UI components
├── lib/              # API client and utilities
├── pages/            # Next.js pages
├── public/           # Static assets
├── styles/           # Global styles and Tailwind config
└── types/            # TypeScript type definitions
```

## Pages

- `/` - Home page with feed tabs (For You, Local, Global)
- `/search` - Search page for vector-based document search
- `/upload` - Document upload page
- `/document/[id]` - Document detail page
- `/profile` - User profile page

## Components

- `Layout` - Main layout component with header and footer
- `DocumentCard` - Card component for displaying document information
- `UploadForm` - Form for uploading documents
- `SearchBar` - Search input component
- `FeedTabs` - Tab navigation for different feed views

## API Integration

The frontend communicates with the BlueWhale backend API using the API client in `lib/api.ts`. This includes endpoints for:

- Document upload and retrieval
- Vector-based search
- User management
- Recommendations
