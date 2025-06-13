#!/usr/bin/env python3
"""
Script to test local Qdrant instance setup.
This script verifies that the local Qdrant instance is running and accessible.
"""

import os
import sys
import logging
import numpy as np
import uuid
import asyncio
from qdrant_client import QdrantClient
from qdrant_client.http import models

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_local_qdrant_connection():
    """Test that local Qdrant connection is working."""
    try:
        # Connect to local Qdrant
        client = QdrantClient(url=settings.QDRANT_URL)
        
        # Check if connection is successful by listing collections
        collections = client.get_collections().collections
        collection_names = [collection.name for collection in collections]
        
        logger.info(f"Successfully connected to local Qdrant at {settings.QDRANT_URL}")
        logger.info(f"Available collections: {collection_names}")
        return True, client
    except Exception as e:
        logger.error(f"Failed to connect to local Qdrant: {e}")
        return False, None

def test_collection_operations(client):
    """Test collection operations (create, list)."""
    try:
        collection_name = settings.QDRANT_COLLECTION_NAME
        
        # Check if collection exists
        collections = client.get_collections().collections
        collection_names = [collection.name for collection in collections]
        
        if collection_name in collection_names:
            logger.info(f"Collection '{collection_name}' exists")
        else:
            logger.info(f"Collection '{collection_name}' does not exist, creating it")
            # Create collection
            client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=settings.VECTOR_SIZE,
                    distance=models.Distance.COSINE
                )
            )
            logger.info(f"Created collection: {collection_name}")
        
        # Verify collection exists
        collections = client.get_collections().collections
        collection_names = [collection.name for collection in collections]
        
        if collection_name in collection_names:
            logger.info(f"Collection '{collection_name}' exists")
            return True
        else:
            logger.error(f"Collection '{collection_name}' was not created")
            return False
    except Exception as e:
        logger.error(f"Failed to perform collection operations: {e}")
        return False

def test_vector_operations(client):
    """Test vector operations (upsert, search, delete)."""
    try:
        collection_name = settings.QDRANT_COLLECTION_NAME
        
        # Generate random test vectors
        test_vectors = [np.random.rand(settings.VECTOR_SIZE).tolist() for _ in range(3)]
        
        # Generate test IDs and metadata
        test_ids = [str(uuid.uuid4()) for _ in range(3)]
        test_metadata = [
            {"title": f"Test Document {i}", "content": f"Test content for document {i}"} 
            for i in range(3)
        ]
        
        # Store vectors
        logger.info("Storing test vectors in Qdrant...")
        points = []
        for i, (vector, payload) in enumerate(zip(test_vectors, test_metadata)):
            points.append(models.PointStruct(
                id=test_ids[i],
                vector=vector,
                payload=payload
            ))
        
        client.upsert(
            collection_name=collection_name,
            points=points
        )
        
        # Search for vectors
        logger.info("Searching for similar vectors...")
        query_vector = test_vectors[0]  # Use the first vector as query
        search_results = client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=5
        )
        
        if not search_results:
            logger.error("No search results returned")
            return False
        
        logger.info(f"Search returned {len(search_results)} results")
        logger.info(f"Top result ID: {search_results[0].id}, Score: {search_results[0].score}")
        
        # Delete test vectors
        logger.info("Deleting test vectors...")
        for test_id in test_ids:
            client.delete(
                collection_name=collection_name,
                points_selector=models.PointIdsList(
                    points=[test_id]
                )
            )
        
        logger.info("Successfully deleted test vectors")
        return True
    except Exception as e:
        logger.error(f"Failed to perform vector operations: {e}")
        return False

def main():
    """Main function to run all tests."""
    logger.info("Testing local Qdrant setup for BlueWhale project...")
    
    # Test connection
    connection_success, client = test_local_qdrant_connection()
    if not connection_success:
        logger.error("Local Qdrant connection test failed")
        logger.info("Make sure Docker is running and the Qdrant container is started")
        logger.info("Run 'docker-compose up -d' to start the Qdrant container")
        return False
    
    # Test collection operations
    if not test_collection_operations(client):
        logger.error("Local Qdrant collection operations test failed")
        return False
    
    # Test vector operations
    if not test_vector_operations(client):
        logger.error("Local Qdrant vector operations test failed")
        return False
    
    logger.info("All local Qdrant tests passed successfully!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
