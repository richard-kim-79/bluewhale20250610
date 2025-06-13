from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional
import uuid
import os
from app.core.utils import s3_storage, file_parser
from app.core.llm_client import llm_client
from app.db.mongo import mongodb
from app.db.qdrant import qdrant
from app.models.document import DocumentCreate, DocumentInDB, DocumentResponse
from app.tasks.document_processing import process_document
from app.core.auth import get_current_active_user
from app.models.user import UserInDB

router = APIRouter()

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_active_user),
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    title: Optional[str] = Form(None)
):
    """
    Upload a document (file, text, or URL) and process it asynchronously.
    The document will be parsed, uploaded to S3 if needed, and queued for processing.
    """
    if not any([file, text, url]):
        raise HTTPException(status_code=400, detail="You must provide either a file, text, or URL")
    
    # Generate a unique document ID
    doc_id = str(uuid.uuid4())
    
    # Parse content based on input type
    content = ""
    s3_url = None
    file_type = None
    
    try:
        if file:
            # Get file type
            file_type = os.path.splitext(file.filename)[1].lower().replace(".", "")
            
            # Parse file content
            content = await file_parser.parse_file(file)
            
            # Upload file to S3
            await file.seek(0)
            s3_url = await s3_storage.upload_file(file.file, file.filename)
        elif text:
            content = text
            file_type = "text"
        elif url:
            # Basic URL handling
            content = f"URL: {url}\n\nContent will be fetched during processing."
            file_type = "url"
        
        # Generate title if not provided
        if not title:
            # Use first few words as title
            title = " ".join(content.split()[:5]) + "..."
        
        # Create initial document object with minimal information
        document = DocumentInDB(
            id=doc_id,
            title=title,
            summary="Processing...",
            tags=[],
            original_text=content[:1000],  # Store first 1000 chars only
            user_id=current_user.id,
            s3_url=s3_url,
            file_type=file_type,
            qdrant_id=doc_id,
            processing_status="pending"
        )
        
        # Store initial document in MongoDB
        documents_collection = mongodb.get_collection("documents")
        await documents_collection.insert_one(document.dict())
        
        # Queue document for async processing
        background_tasks.add_task(
            process_document,
            doc_id=doc_id,
            content=content,
            title=title,
            user_id=current_user.id,
            s3_url=s3_url,
            file_type=file_type
        )
        
        return document
    
    except Exception as e:
        # Log the error
        print(f"Error uploading document: {str(e)}")
        
        # Create failed document record
        try:
            documents_collection = mongodb.get_collection("documents")
            document = DocumentInDB(
                id=doc_id,
                title=title or "Upload failed",
                summary="Document upload failed",
                tags=[],
                original_text="",
                user_id=user_id,
                s3_url=s3_url,
                file_type=file_type,
                qdrant_id=doc_id,
                processing_status="failed",
                processing_error=str(e)
            )
            await documents_collection.insert_one(document.dict())
        except Exception as mongo_error:
            print(f"Error creating failed document record: {str(mongo_error)}")
        
        raise HTTPException(status_code=500, detail=f"Document upload failed: {str(e)}")
