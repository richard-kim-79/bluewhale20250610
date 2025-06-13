#!/usr/bin/env python3
"""
Script to test Qdrant vector database connection and operations.
This script verifies that the Qdrant credentials are working correctly and
that collections can be created and queried.
"""

import os
import sys
import logging
import numpy as np
import uuid
import asyncio

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.db.qdrant import QdrantDB

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_qdrant_connection():
    """Test that Qdrant connection is working."""
    try:
        qdrant_db = QdrantDB()
        client = qdrant_db.connect_to_qdrant()
        
        # Check if connection is successful by listing collections
        collections = client.get_collections().collections
        collection_names = [collection.name for collection in collections]
        
        logger.info(f"Successfully connected to Qdrant. Available collections: {collection_names}")
        return True, qdrant_db
    except Exception as e:
        logger.error(f"Failed to connect to Qdrant: {e}")
        return False, None

async def test_collection_operations(qdrant_db):
    """Test collection operations (create, list)."""
    try:
        # Create collection if it doesn't exist
        qdrant_db.create_collection_if_not_exists()
        
        # Verify collection exists
        collections = qdrant_db.client.get_collections().collections
        collection_names = [collection.name for collection in collections]
        
        if qdrant_db.collection_name in collection_names:
            logger.info(f"Collection '{qdrant_db.collection_name}' exists")
            return True
        else:
            logger.error(f"Collection '{qdrant_db.collection_name}' was not created")
            return False
    except Exception as e:
        logger.error(f"Failed to perform collection operations: {e}")
        return False

async def test_vector_operations(qdrant_db):
    """Test vector operations (upsert, search, delete)."""
    try:
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
        qdrant_db.store_vectors(test_vectors, test_metadata, test_ids)
        
        # Search for vectors
        logger.info("Searching for similar vectors...")
        query_vector = test_vectors[0]  # Use the first vector as query
        search_results = await qdrant_db.search_vectors(query_vector, limit=5)
        
        if not search_results:
            logger.error("No search results returned")
            return False
        
        logger.info(f"Search returned {len(search_results)} results")
        logger.info(f"Top result ID: {search_results[0].id}, Score: {search_results[0].score}")
        
        # Delete test vectors
        logger.info("Deleting test vectors...")
        for test_id in test_ids:
            await qdrant_db.client.delete(
                collection_name=qdrant_db.collection_name,
                points_selector=[test_id]
            )
        
        logger.info("Successfully deleted test vectors")
        return True
    except Exception as e:
        logger.error(f"Failed to perform vector operations: {e}")
        return False

async def main():
    """Main function to run all tests."""
    logger.info("Testing Qdrant setup for BlueWhale project...")
    
    # Test connection
    connection_success, qdrant_db = await test_qdrant_connection()
    if not connection_success:
        logger.error("Qdrant connection test failed")
        return False
    
    # Test collection operations
    if not await test_collection_operations(qdrant_db):
        logger.error("Qdrant collection operations test failed")
        return False
    
    # Test vector operations
    if not await test_vector_operations(qdrant_db):
        logger.error("Qdrant vector operations test failed")
        return False
    
    logger.info("All Qdrant tests passed successfully!")
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
