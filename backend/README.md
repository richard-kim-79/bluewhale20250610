# BlueWhale Backend

BlueWhale is a knowledge management system with vector search capabilities and social features.

## System Architecture

### Backend Components
- **FastAPI**: API server and user document management
- **MongoDB**: Metadata, user information, document records
- **S3/Cloudinary**: Storage for uploaded files
- **Qdrant**: Vector database for semantic search and LLM integration
- **Celery + Redis**: Asynchronous processing for document parsing and embedding
- **AI Models**: HuggingFace/DeepSeek/OpenAI for summarization, tagging, NER, and embeddings

## Getting Started

### Prerequisites
- Python 3.8+
- MongoDB
- Qdrant
- Redis (for Celery)
- AWS S3 account (optional)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file with the following variables:
```
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=bluewhale
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=documents
S3_BUCKET_NAME=bluewhale-documents
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=your_openai_key
HUGGINGFACE_API_KEY=your_huggingface_key
```

4. Run the server:
```bash
uvicorn main:app --reload
```

## API Endpoints

### Document Management
- `POST /api/v1/upload`: Upload a document (file, text, or URL)
- `GET /api/v1/document/{id}`: Get document details
- `PUT /api/v1/document/{id}`: Update document metadata
- `DELETE /api/v1/document/{id}`: Delete a document

### Search
- `GET /api/v1/search?q={query}`: Search documents by semantic similarity
- `GET /api/v1/search/vector?q={query}&format={format}`: LLM-friendly vector search API

### User Management
- `POST /api/v1/user`: Create a new user
- `GET /api/v1/user/{id}`: Get user details
- `PUT /api/v1/user/{id}`: Update user information
- `GET /api/v1/user/{id}/documents`: Get all documents for a user
- `GET /api/v1/user/{id}/recommendations`: Get similar user recommendations

### Authentication
- `POST /api/v1/auth/token`: Login and get access token
- `POST /api/v1/auth/refresh`: Refresh access token
- `POST /api/v1/auth/logout`: Logout and invalidate current session
- `POST /api/v1/auth/logout/all`: Logout from all devices
- `GET /api/v1/auth/sessions`: List active sessions

### Multi-Factor Authentication (MFA)
- `POST /api/v1/auth/mfa/setup`: Generate MFA secret and QR code
- `POST /api/v1/auth/mfa/enable`: Enable MFA for a user
- `POST /api/v1/auth/mfa/disable`: Disable MFA for a user
- `POST /api/v1/auth/mfa/verify`: Verify MFA code during login
- `POST /api/v1/auth/mfa/backup-codes`: Generate or retrieve backup codes

## Directory Structure
```
backend/
├── app/
│   ├── api/routes/       # API route handlers
│   ├── core/             # Core utilities and configuration
│   ├── db/               # Database connections
│   └── models/           # Pydantic models
├── main.py               # FastAPI application entry point
└── requirements.txt      # Project dependencies
```
