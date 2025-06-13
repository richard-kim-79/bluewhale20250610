from fastapi import APIRouter, Path, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Any
from app.db.mongo import mongodb
from app.db.qdrant import qdrant_db
from app.core.utils import S3Storage
from app.models.document import DocumentResponse, DocumentUpdate
from app.tasks.document_processing import reprocess_document
from app.core.auth import get_current_active_user
from app.models.user import UserInDB
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Define a model for document status response
from pydantic import BaseModel

class DocumentStatusResponse(BaseModel):
    id: str
    status: str
    error: str = None

@router.get("/document/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str = Path(..., description="Document ID")
):
    """
    Retrieve a document by its ID.
    This endpoint can be accessed without authentication.
    """
    documents_collection = mongodb.get_collection("documents")
    document = await documents_collection.find_one({"id": doc_id})
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Increment AI citation count
    await documents_collection.update_one(
        {"id": doc_id},
        {"$inc": {"ai_citation_count": 1}}
    )
    
    return document

@router.put("/document/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: str,
    document_update: DocumentUpdate,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Update a document's metadata.
    """
    documents_collection = mongodb.get_collection("documents")
    
    # Check if document exists
    existing_document = await documents_collection.find_one({"id": doc_id})
    if not existing_document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if user owns the document or is admin
    if existing_document.get("user_id") and existing_document.get("user_id") != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this document")
    
    # Update only non-None fields
    update_data = {k: v for k, v in document_update.dict().items() if v is not None}
    
    if update_data:
        await documents_collection.update_one(
            {"id": doc_id},
            {"$set": update_data}
        )
    
    # Get updated document
    updated_document = await documents_collection.find_one({"id": doc_id})
    return updated_document

@router.get("/document/{doc_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    doc_id: str = Path(..., description="Document ID"),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Check the processing status of a document.
    Returns the current status (pending, processing, completed, failed) and any error message.
    """
    documents_collection = mongodb.get_collection("documents")
    document = await documents_collection.find_one({"id": doc_id}, {"id": 1, "processing_status": 1, "processing_error": 1})
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": document["id"],
        "status": document.get("processing_status", "unknown"),
        "error": document.get("processing_error")
    }

@router.post("/document/{doc_id}/reprocess")
async def reprocess_document_endpoint(
    background_tasks: BackgroundTasks,
    doc_id: str = Path(..., description="Document ID"),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Reprocess a document to update its summary, tags, and embeddings.
    This is useful if the document processing failed or if you want to update the document with new AI models.
    """
    documents_collection = mongodb.get_collection("documents")
    
    # Check if document exists
    document = await documents_collection.find_one({"id": doc_id})
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if user owns the document or is admin
    if document.get("user_id") and document.get("user_id") != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to reprocess this document")
    
    # Update document status to pending
    await documents_collection.update_one(
        {"id": doc_id},
        {"$set": {"processing_status": "pending", "processing_error": None}}
    )
    
    # Queue document for reprocessing
    background_tasks.add_task(reprocess_document, doc_id)
    
    return {
        "message": "Document queued for reprocessing",
        "id": doc_id,
        "status": "pending"
    }

@router.delete("/document/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Delete a document by its ID.
    This will delete the document metadata from MongoDB, the document vector from Qdrant,
    and the document file from S3 if it exists.
    """
    documents_collection = mongodb.get_collection("documents")
    
    # Check if document exists
    existing_document = await documents_collection.find_one({"id": doc_id})
    if not existing_document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check if user owns the document or is admin
    if existing_document.get("user_id") and existing_document.get("user_id") != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")
    
    # Track success/failure of each deletion step
    deletion_results = {
        "mongodb": False,
        "qdrant": False,
        "s3": False
    }
    
    # 1. Delete document from MongoDB
    try:
        await documents_collection.delete_one({"id": doc_id})
        deletion_results["mongodb"] = True
        logger.info(f"Successfully deleted document {doc_id} from MongoDB")
    except Exception as e:
        logger.error(f"Failed to delete document {doc_id} from MongoDB: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document from database: {str(e)}")
    
    # 2. Delete vector from Qdrant
    try:
        # Get Qdrant client
        qdrant_client = qdrant_db.connect_to_qdrant()
        
        # Delete the vector by its ID (which is the same as the document ID)
        await qdrant_client.delete(
            collection_name=qdrant_db.collection_name,
            points_selector=[doc_id]
        )
        deletion_results["qdrant"] = True
        logger.info(f"Successfully deleted document vector {doc_id} from Qdrant")
    except Exception as e:
        logger.error(f"Failed to delete document vector {doc_id} from Qdrant: {e}")
        # Continue with deletion process even if Qdrant deletion fails
    
    # 3. Delete file from S3 if it exists
    if "s3_url" in existing_document and existing_document["s3_url"]:
        try:
            s3_storage = S3Storage()
            success = await s3_storage.delete_file(existing_document["s3_url"])
            if success:
                deletion_results["s3"] = True
                logger.info(f"Successfully deleted document file for {doc_id} from S3")
            else:
                logger.warning(f"Failed to delete document file for {doc_id} from S3")
        except Exception as e:
            logger.error(f"Error deleting document file for {doc_id} from S3: {e}")
            # Continue with deletion process even if S3 deletion fails
    else:
        deletion_results["s3"] = True  # Mark as success if no file to delete
    
    return {
        "message": "Document deleted successfully",
        "deletion_results": deletion_results
    }
