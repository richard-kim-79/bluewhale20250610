# 🐋 BlueWhale

[![Backend Tests](https://github.com/richard-kim-79/bluewhale20250610/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/richard-kim-79/bluewhale20250610/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/richard-kim-79/bluewhale20250610/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/richard-kim-79/bluewhale20250610/actions/workflows/frontend-tests.yml)
[![Full Stack Tests](https://github.com/richard-kim-79/bluewhale20250610/actions/workflows/full-stack-tests.yml/badge.svg)](https://github.com/richard-kim-79/bluewhale20250610/actions/workflows/full-stack-tests.yml)

BlueWhale is a knowledge management system with vector search capabilities and social features. It allows users to upload, search, and share documents with AI-friendly formats.

## System Architecture

### Frontend
- **Next.js + React**: UI components and pages
- **TailwindCSS**: Styling
- **Vercel**: Deployment platform

### Backend
- **FastAPI**: API server and user document management
- **MongoDB**: Metadata, user information, document records
- **Qdrant**: Vector database for semantic search
- **S3/Cloudinary**: Storage for uploaded files
- **Celery + Redis**: Asynchronous processing for document parsing and embedding
- **AI Models**: HuggingFace/DeepSeek/OpenAI for summarization, tagging, NER, and embeddings

## Features

### User Interface
- **Document Uploader**: Upload text, PDFs, web pages, and images
- **SNS-style Feed**: "For You", "Local", and "Global" tabs
- **Link Sharing**: Share documents without requiring login

### Search & RAG
- **Semantic Search**: Vector-based document retrieval
- **AI Citation Tracking**: Track how often AI systems reference documents
- **Trust Scoring**: Reliability metrics for documents

### Social Features
- **User Recommendations**: Based on content similarity
- **Feed Customization**: Personalized content feeds

## Project Structure

```
bluewhale20250610/
├── .github/workflows/     # CI/CD workflow configurations
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── api/routes/     # API route handlers
│   │   ├── core/           # Core utilities and configuration
│   │   ├── db/             # Database connections
│   │   └── models/         # Pydantic models
│   ├── tests/              # Backend test suite
│   ├── main.py             # FastAPI application entry point
│   └── requirements.txt    # Backend dependencies
│
└── frontend/               # Next.js frontend
    ├── components/         # Reusable UI components
    ├── lib/                # API client and utilities
    ├── pages/              # Next.js pages
    ├── public/             # Static assets
    ├── styles/             # Global styles
    ├── tests/              # Frontend test suite
    └── types/              # TypeScript type definitions
```

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file with your configuration:
```
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=bluewhale
QDRANT_URL=http://localhost:6333
OPENAI_API_KEY=your_openai_key
```

4. Run the FastAPI server:
```bash
uvicorn main:app --reload
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

### Document Management
- `POST /api/v1/upload`: Upload a document
- `GET /api/v1/document/{id}`: Get document details
- `PUT /api/v1/document/{id}`: Update document metadata
- `DELETE /api/v1/document/{id}`: Delete a document

### Search
- `GET /api/v1/search?q={query}`: Search documents by semantic similarity
- `GET /api/v1/search/vector?q={query}&format={format}`: LLM-friendly vector search API

### User Management
- `POST /api/v1/user`: Create a new user
- `GET /api/v1/user/{id}`: Get user details
- `GET /api/v1/user/{id}/documents`: Get all documents for a user
- `GET /api/v1/user/{id}/recommendations`: Get similar user recommendations

## Continuous Integration and Deployment

BlueWhale uses GitHub Actions for CI/CD. The following workflows are configured:

### Backend Tests

Automatically runs tests for the backend Python code when changes are pushed to the `backend/` directory.

```bash
# Run backend tests locally
cd backend
python -m pytest tests/

# Run MFA tests specifically
python -m pytest tests/test_mfa.py -v
```

### Frontend Tests

Automatically runs tests for the frontend React/TypeScript code when changes are pushed to the `frontend/` directory.

```bash
# Run frontend tests locally
cd frontend
npm test
```

### Full Stack Tests

Runs both backend and frontend tests together on a schedule and when manually triggered.

For more details on the CI/CD setup, see [CI_CD_README.md](CI_CD_README.md).
