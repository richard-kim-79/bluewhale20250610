#!/usr/bin/env python3
"""
Script to test Qdrant Cloud connection with the updated credentials.
This script verifies that the Qdrant Cloud credentials are working correctly.
"""

import os
import sys
import logging
import numpy as np
import uuid
import asyncio
import dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models

# Load environment variables from .env file
dotenv.load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

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

def test_direct_connection():
    """Test direct connection to Qdrant Cloud."""
    try:
        # Print the actual URL from settings
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        logger.info(f"Testing direct connection to Qdrant Cloud at {qdrant_url}")
        logger.info(f"Using API key: {qdrant_api_key[:10]}...{qdrant_api_key[-10:]}")
        
        # Connect directly to Qdrant Cloud using environment variables
        client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key
        )
        
        # Test connection by listing collections
        collections = client.get_collections()
        collection_names = [collection.name for collection in collections.collections]
        
        logger.info(f"Successfully connected to Qdrant Cloud!")
        logger.info(f"Available collections: {collection_names}")
        
        return True, client
    except Exception as e:
        logger.error(f"Failed to connect to Qdrant Cloud: {e}")
        return False, None

async def test_db_class_connection():
    """Test connection using the QdrantDB class."""
    try:
        logger.info("Testing connection using QdrantDB class")
        
        # Initialize QdrantDB
        qdrant_db = QdrantDB()
        
        # Connect to Qdrant
        client = qdrant_db.connect_to_qdrant()
        
        if client:
            logger.info("Successfully connected to Qdrant using QdrantDB class")
            return True, qdrant_db
        else:
            logger.error("Failed to connect to Qdrant using QdrantDB class")
            return False, None
    except Exception as e:
        logger.error(f"Failed to connect to Qdrant using QdrantDB class: {e}")
        return False, None

async def test_collection_operations(qdrant_db):
    """Test collection operations."""
    try:
        # Create collection if it doesn't exist
        success = await qdrant_db.create_collection_if_not_exists()
        
        if success:
            logger.info(f"Successfully created or verified collection: {qdrant_db.collection_name}")
            return True
        else:
            logger.error(f"Failed to create collection: {qdrant_db.collection_name}")
            return False
    except Exception as e:
        logger.error(f"Failed to perform collection operations: {e}")
        return False

async def test_vector_operations(qdrant_db):
    """Test vector operations."""
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
        
        return True
    except Exception as e:
        logger.error(f"Failed to perform vector operations: {e}")
        return False

async def main():
    """Main function to run all tests."""
    logger.info("Testing Qdrant Cloud connection for BlueWhale project...")
    
    # Test direct connection
    direct_success, _ = test_direct_connection()
    if not direct_success:
        logger.error("Direct Qdrant Cloud connection test failed")
        return False
    
    # Test connection using QdrantDB class
    db_success, qdrant_db = await test_db_class_connection()
    if not db_success:
        logger.error("QdrantDB class connection test failed")
        return False
    
    # Test collection operations
    if not await test_collection_operations(qdrant_db):
        logger.error("Collection operations test failed")
        return False
    
    # Test vector operations
    if not await test_vector_operations(qdrant_db):
        logger.error("Vector operations test failed")
        return False
    
    logger.info("All Qdrant Cloud tests passed successfully!")
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
