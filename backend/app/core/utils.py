import os
import uuid
import logging
import json
from typing import List, Dict, Any, Optional, BinaryIO
import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile
import PyPDF2
import io
from app.core.config import settings

logger = logging.getLogger(__name__)

class S3Storage:
    """Utility for S3 storage operations."""
    
    def __init__(self):
        self.s3_client = None
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION
                )
                logger.info(f"Successfully initialized S3 client for bucket: {settings.S3_BUCKET_NAME}")
                
                # Ensure the bucket exists
                self._ensure_bucket_exists()
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
    
    def _ensure_bucket_exists(self):
        """Ensure that the configured S3 bucket exists, create it if it doesn't."""
        if not self.s3_client:
            return
            
        try:
            self.s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
            logger.info(f"S3 bucket '{settings.S3_BUCKET_NAME}' exists")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                logger.info(f"S3 bucket '{settings.S3_BUCKET_NAME}' does not exist, creating it")
                try:
                    # Create the bucket in the specified region
                    if settings.AWS_REGION == 'us-east-1':
                        self.s3_client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
                    else:
                        self.s3_client.create_bucket(
                            Bucket=settings.S3_BUCKET_NAME,
                            CreateBucketConfiguration={'LocationConstraint': settings.AWS_REGION}
                        )
                    
                    # Set bucket policy for public read access if needed
                    # self._set_bucket_public_read_policy()
                    
                    logger.info(f"Created S3 bucket: {settings.S3_BUCKET_NAME}")
                except ClientError as create_error:
                    logger.error(f"Failed to create S3 bucket: {create_error}")
            else:
                logger.error(f"Error checking S3 bucket: {e}")
    
    def _set_bucket_public_read_policy(self):
        """Set a bucket policy to allow public read access."""
        bucket_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadGetObject",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{settings.S3_BUCKET_NAME}/*"]
                }
            ]
        }
        
        try:
            self.s3_client.put_bucket_policy(
                Bucket=settings.S3_BUCKET_NAME,
                Policy=json.dumps(bucket_policy)
            )
            logger.info(f"Set public read policy for bucket: {settings.S3_BUCKET_NAME}")
        except ClientError as e:
            logger.error(f"Failed to set bucket policy: {e}")
    
    async def upload_file(self, file: BinaryIO, filename: str) -> Optional[str]:
        """Upload file to S3 and return the URL."""
        if not self.s3_client:
            logger.warning("S3 client not configured, skipping upload")
            return None
        
        try:
            # Generate a unique filename to avoid collisions
            unique_filename = f"{uuid.uuid4()}-{filename}"
            
            # Determine content type (default to application/octet-stream)
            content_type = 'application/octet-stream'
            if filename.endswith('.pdf'):
                content_type = 'application/pdf'
            elif filename.endswith('.txt'):
                content_type = 'text/plain'
            elif filename.endswith('.docx'):
                content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            
            # Upload file with content type
            self.s3_client.upload_fileobj(
                file,
                settings.S3_BUCKET_NAME,
                unique_filename,
                ExtraArgs={'ContentType': content_type}
            )
            
            # Generate URL
            url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{unique_filename}"
            logger.info(f"File uploaded successfully: {url}")
            return url
        except Exception as e:
            logger.error(f"Failed to upload file to S3: {e}")
            return None
    
    def _get_content_type(self, filename: str) -> str:
        """Determine content type based on file extension."""
        extension = os.path.splitext(filename)[1].lower()
        content_types = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.csv': 'text/csv',
            '.json': 'application/json',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png'
        }
        return content_types.get(extension, 'application/octet-stream')
    
    async def download_file(self, file_key: str) -> Optional[bytes]:
        """Download a file from S3 by its key."""
        if not self.s3_client:
            logger.warning("S3 client not configured, skipping download")
            return None
        
        try:
            # Extract the file key from the URL if a full URL is provided
            if file_key.startswith('http'):
                file_key = file_key.split('/')[-1]
            
            # Download file from S3
            response = self.s3_client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=file_key)
            return response['Body'].read()
        except ClientError as e:
            logger.error(f"Failed to download file from S3: {e}")
            return None
    
    async def delete_file(self, file_key: str) -> bool:
        """Delete a file from S3 by its key."""
        if not self.s3_client:
            logger.warning("S3 client not configured, skipping deletion")
            return False
        
        try:
            # Extract the file key from the URL if a full URL is provided
            if file_key.startswith('http'):
                file_key = file_key.split('/')[-1]
            
            # Delete file from S3
            self.s3_client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=file_key)
            logger.info(f"Successfully deleted file from S3: {file_key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete file from S3: {e}")
            return False

class FileParser:
    """Utility for parsing different file types."""
    
    @staticmethod
    async def parse_pdf(file: UploadFile) -> str:
        """Extract text from PDF file."""
        try:
            # Read the uploaded file into memory
            content = await file.read()
            pdf_file = io.BytesIO(content)
            
            # Parse PDF content
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text
        except Exception as e:
            logger.error(f"Failed to parse PDF: {e}")
            return ""
        finally:
            # Reset file pointer for potential future use
            await file.seek(0)
    
    @staticmethod
    async def parse_text(file: UploadFile) -> str:
        """Extract text from plain text file."""
        try:
            content = await file.read()
            return content.decode("utf-8")
        except Exception as e:
            logger.error(f"Failed to parse text file: {e}")
            return ""
        finally:
            await file.seek(0)
    
    @staticmethod
    async def parse_file(file: UploadFile) -> str:
        """Parse file based on its content type."""
        content_type = file.content_type
        
        if content_type == "application/pdf":
            return await FileParser.parse_pdf(file)
        elif content_type.startswith("text/"):
            return await FileParser.parse_text(file)
        else:
            logger.warning(f"Unsupported file type: {content_type}")
            return ""

def generate_share_link(doc_id: str) -> str:
    """Generate a shareable link for a document."""
    # In a production environment, this would use a proper domain
    return f"/document/{doc_id}"

s3_storage = S3Storage()
file_parser = FileParser()
