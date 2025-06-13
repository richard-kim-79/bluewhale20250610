#!/usr/bin/env python3
"""
Script to test Qdrant Cloud connection with detailed debugging.
This script verifies that the Qdrant Cloud credentials are working correctly.
"""

import os
import sys
import logging
import requests
import json
import dotenv
from urllib.parse import urlparse

# Load environment variables from .env file
dotenv.load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

# Get Qdrant settings directly from environment variables
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "documents")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_qdrant_rest_api():
    """Test Qdrant Cloud connection using direct REST API calls."""
    try:
        # Ensure we're using the correct URL format
        base_url = QDRANT_URL.rstrip('/')
        
        # Test connection by getting collections list
        collections_url = f"{base_url}/collections"
        
        headers = {
            "Content-Type": "application/json",
            "api-key": QDRANT_API_KEY
        }
        
        logger.info(f"Testing connection to Qdrant Cloud at: {collections_url}")
        logger.info(f"Using API key: {QDRANT_API_KEY[:5]}...{QDRANT_API_KEY[-5:]}")
        logger.info(f"Full Qdrant URL: {QDRANT_URL}")
        logger.info(f"Collection name: {QDRANT_COLLECTION_NAME}")
        
        
        response = requests.get(collections_url, headers=headers)
        
        if response.status_code == 200:
            collections = response.json()
            logger.info(f"Successfully connected to Qdrant Cloud API")
            logger.info(f"Response: {json.dumps(collections, indent=2)}")
            return True
        else:
            logger.error(f"Failed to connect to Qdrant Cloud API. Status code: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Error connecting to Qdrant Cloud: {e}")
        return False

def main():
    """Main function to run the test."""
    logger.info("Testing Qdrant Cloud connection...")
    
    success = test_qdrant_rest_api()
    
    if success:
        logger.info("Qdrant Cloud connection test passed!")
        return True
    else:
        logger.error("Qdrant Cloud connection test failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
