"""
Celery tasks for document processing.
"""
import logging
from app.core.celery_app import celery_app
from app.core.utils import file_parser, s3_storage
from app.core.llm_client import llm_client
from app.db.mongo import mongodb
from app.db.qdrant import qdrant
from app.models.document import DocumentInDB
import uuid
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

@celery_app.task(name="process_document")
async def process_document(
    doc_id: str,
    content: str,
    title: Optional[str] = None,
    user_id: Optional[str] = None,
    s3_url: Optional[str] = None,
    file_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Process a document asynchronously:
    1. Generate summary and tags using LLM
    2. Generate embeddings
    3. Store document in MongoDB
    4. Store vector in Qdrant
    """
    try:
        logger.info(f"Processing document {doc_id}")
        
        # Process content with LLM
        summary_task = llm_client.summarize_text(content)
        tags_task = llm_client.extract_tags(content)
        
        # Wait for LLM tasks to complete
        summary = await summary_task
        tags = await tags_task
        
        # Generate embeddings
        embeddings = await llm_client.get_embeddings([content])
        
        # Generate title if not provided
        if not title:
            title = " ".join(content.split()[:5]) + "..."
        
        # Create document object
        document = DocumentInDB(
            id=doc_id,
            title=title,
            summary=summary,
            tags=tags,
            original_text=content[:1000],  # Store first 1000 chars only
            user_id=user_id,
            s3_url=s3_url,
            file_type=file_type,
            qdrant_id=doc_id,
            processing_status="completed"
        )
        
        # Store document in MongoDB
        documents_collection = mongodb.get_collection("documents")
        await documents_collection.update_one(
            {"id": doc_id},
            {"$set": document.dict()},
            upsert=True
        )
        
        # Store vector in Qdrant
        metadata = {
            "doc_id": doc_id,
            "user_id": user_id,
            "title": title,
            "summary": summary,
            "tags": tags
        }
        await qdrant.store_vector(doc_id, embeddings[0], metadata)
        
        logger.info(f"Document {doc_id} processed successfully")
        return {"status": "success", "document_id": doc_id}
    
    except Exception as e:
        logger.error(f"Error processing document {doc_id}: {e}")
        
        # Update document status to failed
        try:
            documents_collection = mongodb.get_collection("documents")
            await documents_collection.update_one(
                {"id": doc_id},
                {"$set": {"processing_status": "failed", "processing_error": str(e)}}
            )
        except Exception as update_error:
            logger.error(f"Error updating document status: {update_error}")
        
        return {"status": "error", "document_id": doc_id, "error": str(e)}

@celery_app.task(name="reprocess_document")
async def reprocess_document(doc_id: str) -> Dict[str, Any]:
    """
    Reprocess an existing document:
    1. Fetch document from MongoDB
    2. Process content again
    """
    try:
        logger.info(f"Reprocessing document {doc_id}")
        
        # Fetch document from MongoDB
        documents_collection = mongodb.get_collection("documents")
        document = await documents_collection.find_one({"id": doc_id})
        
        if not document:
            raise ValueError(f"Document {doc_id} not found")
        
        # If document has S3 URL, download content
        content = document.get("original_text", "")
        if document.get("s3_url") and not content:
            file_content = await s3_storage.download_file(document["s3_url"])
            content = await file_parser.parse_content(file_content, document.get("file_type", ""))
        
        if not content:
            raise ValueError(f"No content found for document {doc_id}")
        
        # Process document
        return await process_document(
            doc_id=doc_id,
            content=content,
            title=document.get("title"),
            user_id=document.get("user_id"),
            s3_url=document.get("s3_url"),
            file_type=document.get("file_type")
        )
    
    except Exception as e:
        logger.error(f"Error reprocessing document {doc_id}: {e}")
        return {"status": "error", "document_id": doc_id, "error": str(e)}

@celery_app.task(name="batch_process_documents")
async def batch_process_documents(doc_ids: List[str]) -> Dict[str, Any]:
    """
    Process multiple documents in batch
    """
    results = []
    for doc_id in doc_ids:
        try:
            result = await reprocess_document(doc_id)
            results.append(result)
        except Exception as e:
            logger.error(f"Error processing document {doc_id} in batch: {e}")
            results.append({"status": "error", "document_id": doc_id, "error": str(e)})
    
    return {"status": "completed", "results": results}
