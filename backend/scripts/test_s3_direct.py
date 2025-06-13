#!/usr/bin/env python3
"""
Script to directly test AWS S3 connection and bucket operations.
This script verifies that the S3 credentials are working correctly and
that the bucket can be accessed or created if it doesn't exist.
"""

import os
import sys
import logging
import boto3
from botocore.exceptions import ClientError
import uuid
import io
import asyncio

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_s3_credentials():
    """Test that AWS S3 credentials are valid."""
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        # List buckets to verify credentials
        response = s3_client.list_buckets()
        buckets = [bucket['Name'] for bucket in response['Buckets']]
        logger.info(f"Successfully connected to AWS S3. Available buckets: {buckets}")
        return True, s3_client
    except ClientError as e:
        logger.error(f"Failed to connect to AWS S3: {e}")
        return False, None

def test_bucket_operations(s3_client):
    """Test bucket operations (create, list, delete)."""
    try:
        # Check if our bucket exists
        bucket_exists = False
        response = s3_client.list_buckets()
        for bucket in response['Buckets']:
            if bucket['Name'] == settings.S3_BUCKET_NAME:
                bucket_exists = True
                logger.info(f"Bucket '{settings.S3_BUCKET_NAME}' already exists")
                break
        
        # Create bucket if it doesn't exist
        if not bucket_exists:
            logger.info(f"Creating bucket '{settings.S3_BUCKET_NAME}'...")
            if settings.AWS_REGION == 'us-east-1':
                s3_client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
            else:
                s3_client.create_bucket(
                    Bucket=settings.S3_BUCKET_NAME,
                    CreateBucketConfiguration={'LocationConstraint': settings.AWS_REGION}
                )
            logger.info(f"Successfully created bucket '{settings.S3_BUCKET_NAME}'")
        
        return True
    except ClientError as e:
        logger.error(f"Failed to perform bucket operations: {e}")
        return False

def test_file_operations(s3_client):
    """Test file operations (upload, download, delete)."""
    try:
        # Create a test file
        test_content = f"This is a test file created at {uuid.uuid4()}"
        test_file = io.BytesIO(test_content.encode('utf-8'))
        test_filename = f"test-{uuid.uuid4()}.txt"
        
        # Upload the file
        logger.info(f"Uploading test file '{test_filename}'...")
        s3_client.upload_fileobj(
            test_file,
            settings.S3_BUCKET_NAME,
            test_filename,
            ExtraArgs={'ContentType': 'text/plain'}
        )
        
        # Generate URL
        file_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{test_filename}"
        logger.info(f"Successfully uploaded test file to {file_url}")
        
        # Download the file
        logger.info(f"Downloading test file...")
        response = s3_client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=test_filename)
        downloaded_content = response['Body'].read()
        
        # Verify content
        if downloaded_content.decode('utf-8') == test_content:
            logger.info("Successfully verified file content")
        else:
            logger.error(f"File content does not match. Expected: '{test_content}', Got: '{downloaded_content.decode('utf-8')}'")
            return False
        
        # Delete the file
        logger.info(f"Deleting test file...")
        s3_client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=test_filename)
        logger.info("Successfully deleted test file")
        
        return True
    except Exception as e:
        logger.error(f"Failed to perform file operations: {e}")
        return False

def main():
    """Main function to run all tests."""
    logger.info("Testing AWS S3 setup for BlueWhale project...")
    
    # Test credentials
    credentials_success, s3_client = test_s3_credentials()
    if not credentials_success:
        logger.error("AWS S3 credentials test failed")
        return False
    
    # Test bucket operations
    if not test_bucket_operations(s3_client):
        logger.error("AWS S3 bucket operations test failed")
        return False
    
    # Test file operations
    if not test_file_operations(s3_client):
        logger.error("AWS S3 file operations test failed")
        return False
    
    logger.info("All AWS S3 tests passed successfully!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
