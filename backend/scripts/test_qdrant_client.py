#!/usr/bin/env python3
"""
Script to test Qdrant Cloud connection using the official Qdrant client.
This script verifies that the Qdrant Cloud credentials are working correctly.
"""

import os
import sys
import logging
import dotenv
from qdrant_client import QdrantClient

# Load environment variables from .env file
dotenv.load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main function to test Qdrant Cloud connection."""
    # Get Qdrant settings from environment variables
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    collection_name = os.getenv("QDRANT_COLLECTION_NAME", "documents")
    
    logger.info(f"Testing Qdrant Cloud connection with URL: {qdrant_url}")
    logger.info(f"API Key: {qdrant_api_key[:5]}...{qdrant_api_key[-5:]}")
    logger.info(f"Collection name: {collection_name}")
    
    try:
        # Try with standard Qdrant Cloud URL format
        logger.info("Attempting connection with standard Qdrant Cloud URL...")
        client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key
        )
        
        # Test connection by listing collections
        collections = client.get_collections()
        logger.info(f"Successfully connected to Qdrant Cloud!")
        logger.info(f"Available collections: {collections.collections}")
        
        # Check if our collection exists
        collection_exists = False
        for collection in collections.collections:
            if collection.name == collection_name:
                collection_exists = True
                logger.info(f"Collection '{collection_name}' exists")
                break
        
        if not collection_exists:
            logger.info(f"Collection '{collection_name}' does not exist")
        
        return True
    except Exception as e:
        logger.error(f"Error connecting to Qdrant Cloud: {e}")
        
        # Try alternative URL format (without https://)
        try:
            logger.info("Attempting connection with alternative URL format...")
            # Remove https:// if present
            alt_url = qdrant_url
            if alt_url.startswith("https://"):
                alt_url = alt_url[8:]
            
            client = QdrantClient(
                host=alt_url,
                api_key=qdrant_api_key
            )
            
            # Test connection by listing collections
            collections = client.get_collections()
            logger.info(f"Successfully connected to Qdrant Cloud with alternative URL format!")
            logger.info(f"Available collections: {collections.collections}")
            return True
        except Exception as e2:
            logger.error(f"Error connecting with alternative URL format: {e2}")
            return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
