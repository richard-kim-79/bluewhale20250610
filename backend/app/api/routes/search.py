from fastapi import APIRouter, Query, HTTPException, Depends
from typing import List, Optional
from app.core.llm_client import llm_client
from app.db.mongo import mongodb
from app.db.qdrant import qdrant
from app.models.document import DocumentSearchResponse, DocumentSearchResult
from app.core.auth import get_current_active_user
from app.models.user import UserInDB
import json

router = APIRouter()

@router.get("/search", response_model=DocumentSearchResponse)
async def search_documents(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, description="Maximum number of results to return"),
    format: str = Query("json", description="Response format: json, markdown, or jsonld"),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Search for documents using vector similarity.
    Returns documents that are semantically similar to the query.
    """
    # Generate embedding for the query
    query_embeddings = await llm_client.get_embeddings([q])
    query_vector = query_embeddings[0]
    
    # Search for similar vectors in Qdrant
    search_results = await qdrant.search_vectors(query_vector, limit=limit)
    
    # Get document IDs from search results
    doc_ids = [result.id for result in search_results]
    
    # Retrieve documents from MongoDB
    documents_collection = mongodb.get_collection("documents")
    documents = await documents_collection.find({"id": {"$in": doc_ids}}).to_list(length=limit)
    
    # Map documents to search results
    results = []
    for result, document in zip(search_results, documents):
        doc_result = DocumentSearchResult(
            id=document["id"],
            title=document["title"],
            summary=document["summary"],
            url=f"/document/{document['id']}",
            embedding_similarity=result.score,
            tags=document.get("tags", []),
            ai_citation_count=document.get("ai_citation_count", 0),
            trust_score=document.get("trust_score", 0.0)
        )
        
        # Add format-specific data
        if format == "jsonld":
            doc_result.jsonld = {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": document["title"],
                "description": document["summary"],
                "keywords": document.get("tags", []),
                "url": f"/document/{document['id']}"
            }
        
        results.append(doc_result)
    
    return DocumentSearchResponse(results=results)

@router.get("/search/vector", response_model=DocumentSearchResponse)
async def vector_search(
    q: str = Query(..., description="Search query"),
    format: str = Query("json", description="Response format: json, markdown, or jsonld"),
    limit: int = Query(10, description="Maximum number of results to return"),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    LLM-friendly API for vector search.
    Returns documents in the specified format (json, markdown, or jsonld).
    """
    # Generate embedding for the query
    query_embeddings = await llm_client.get_embeddings([q])
    query_vector = query_embeddings[0]
    
    # Search for similar vectors in Qdrant
    search_results = await qdrant.search_vectors(query_vector, limit=limit)
    
    # Get document IDs from search results
    doc_ids = [result.id for result in search_results]
    
    # Retrieve documents from MongoDB
    documents_collection = mongodb.get_collection("documents")
    documents = await documents_collection.find({"id": {"$in": doc_ids}}).to_list(length=limit)
    
    # Map documents to search results based on format
    results = []
    for result, document in zip(search_results, documents):
        doc_result = DocumentSearchResult(
            id=document["id"],
            title=document["title"],
            summary=document["summary"],
            url=f"/document/{document['id']}",
            embedding_similarity=result.score,
            tags=document.get("tags", []),
            ai_citation_count=document.get("ai_citation_count", 0),
            trust_score=document.get("trust_score", 0.0)
        )
        results.append(doc_result)
    
    return DocumentSearchResponse(results=results)
