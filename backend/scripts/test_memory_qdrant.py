#!/usr/bin/env python3
"""
Script to test in-memory Qdrant implementation.
This script verifies that the in-memory Qdrant instance works correctly.
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
        # Initialize QdrantDB
        qdrant_db = QdrantDB()
        
        # Connect to Qdrant
        client = qdrant_db.connect_to_qdrant()
        
        if client:
            logger.info("Successfully connected to Qdrant")
            return True, qdrant_db
        else:
            logger.error("Failed to connect to Qdrant")
            return False, None
    except Exception as e:
        logger.error(f"Failed to connect to Qdrant: {e}")
        return False, None

async def test_collection_creation(qdrant_db):
    """Test collection creation."""
    try:
        # Create collection
        success = await qdrant_db.create_collection_if_not_exists()
        
        if success:
            logger.info(f"Successfully created or verified collection: {qdrant_db.collection_name}")
            return True
        else:
            logger.error(f"Failed to create collection: {qdrant_db.collection_name}")
            return False
    except Exception as e:
        logger.error(f"Failed to create collection: {e}")
        return False

async def test_vector_operations(qdrant_db):
    """Test vector operations (upsert, search, delete)."""
    try:
        # Generate test document
        doc_id = str(uuid.uuid4())
        test_vector = np.random.rand(settings.VECTOR_SIZE).tolist()
        test_metadata = {
            "id": doc_id,
            "title": "Test Document",
            "content": "This is a test document for vector operations",
            "tags": ["test", "vector", "operations"]
        }
        
        # Store vector
        logger.info(f"Storing test vector with ID: {doc_id}")
        success = await qdrant_db.store_vector(doc_id, test_vector, test_metadata)
        
        if not success:
            logger.error("Failed to store vector")
            return False
        
        logger.info("Successfully stored vector")
        
        # Search for similar vectors
        logger.info("Searching for similar vectors...")
        search_results = await qdrant_db.search_similar(test_vector, limit=5)
        
        if not search_results:
            logger.error("No search results returned")
            return False
        
        logger.info(f"Search returned {len(search_results)} results")
        logger.info(f"Top result ID: {search_results[0]['id']}, Score: {search_results[0]['score']}")
        
        # Delete vector
        logger.info(f"Deleting test vector with ID: {doc_id}")
        delete_success = await qdrant_db.delete_vector(doc_id)
        
        if not delete_success:
            logger.error("Failed to delete vector")
            return False
        
        logger.info("Successfully deleted vector")
        
        # Verify deletion
        search_results = await qdrant_db.search_similar(test_vector, limit=5)
        if not search_results or search_results[0]['id'] != doc_id:
            logger.info("Vector deletion confirmed")
        else:
            logger.error("Vector was not deleted")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to perform vector operations: {e}")
        return False

async def main():
    """Main function to run all tests."""
    logger.info("Testing in-memory Qdrant implementation for BlueWhale project...")
    
    # Test connection
    connection_success, qdrant_db = await test_qdrant_connection()
    if not connection_success:
        logger.error("Qdrant connection test failed")
        return False
    
    # Test collection creation
    if not await test_collection_creation(qdrant_db):
        logger.error("Qdrant collection creation test failed")
        return False
    
    # Test vector operations
    if not await test_vector_operations(qdrant_db):
        logger.error("Qdrant vector operations test failed")
        return False
    
    logger.info("All in-memory Qdrant tests passed successfully!")
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
