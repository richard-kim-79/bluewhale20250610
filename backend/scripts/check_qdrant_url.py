#!/usr/bin/env python3
"""
Script to check Qdrant URL format and connectivity.
"""

import os
import sys
import logging
import dotenv
import socket
import requests
from urllib.parse import urlparse

# Load environment variables from .env file
dotenv.load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_domain_resolution(domain):
    """Check if a domain can be resolved."""
    try:
        socket.gethostbyname(domain)
        return True
    except socket.gaierror:
        return False

def main():
    """Main function to check Qdrant URL format and connectivity."""
    # Get Qdrant URL from environment variables
    qdrant_url = os.getenv("QDRANT_URL")
    
    if not qdrant_url:
        logger.error("QDRANT_URL environment variable is not set")
        return False
    
    logger.info(f"Checking Qdrant URL: {qdrant_url}")
    
    # Parse URL
    parsed_url = urlparse(qdrant_url)
    domain = parsed_url.netloc
    
    logger.info(f"Domain: {domain}")
    
    # Check if domain can be resolved
    if check_domain_resolution(domain):
        logger.info(f"Domain '{domain}' can be resolved")
    else:
        logger.error(f"Domain '{domain}' cannot be resolved")
        
        # Check if it's using the old .api.qdrant.tech format
        if ".api.qdrant.tech" in domain:
            logger.info("URL appears to be using .api.qdrant.tech format")
            logger.info("Recommended format is: https://[cluster-id].qdrant.io")
            
            # Try with .qdrant.io instead
            new_domain = domain.replace(".api.qdrant.tech", ".qdrant.io")
            logger.info(f"Trying with domain: {new_domain}")
            
            if check_domain_resolution(new_domain):
                logger.info(f"Domain '{new_domain}' can be resolved")
                logger.info(f"Consider updating your QDRANT_URL to: https://{new_domain}")
            else:
                logger.error(f"Domain '{new_domain}' cannot be resolved either")
    
    # Try to make a request to the URL
    try:
        logger.info(f"Attempting to connect to {qdrant_url}/collections")
        response = requests.get(f"{qdrant_url}/collections", timeout=5)
        logger.info(f"Response status code: {response.status_code}")
        logger.info(f"Response content: {response.text[:100]}...")
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to connect to {qdrant_url}: {e}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
