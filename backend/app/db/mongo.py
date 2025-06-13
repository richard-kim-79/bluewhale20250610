from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from app.core.config import settings
import logging
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)

class MongoDB:
    client: AsyncIOMotorClient = None
    
    async def connect_to_mongo(self):
        """Connect to MongoDB."""
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URL)
            # Verify connection is working
            await self.client.admin.command('ping')
            logger.info("Connected to MongoDB")
        except ConnectionFailure:
            logger.error("Failed to connect to MongoDB")
            raise
    
    async def close_mongo_connection(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
    
    def get_db(self):
        """Get database instance."""
        return self.client[settings.MONGODB_DB_NAME]
    
    def get_collection(self, collection_name: str):
        """Get collection from database."""
        return self.get_db()[collection_name]

mongodb = MongoDB()

# Provide global connection functions for the application
async def connect_to_mongo():
    await mongodb.connect_to_mongo()

async def close_mongo_connection():
    await mongodb.close_mongo_connection()

# Create indexes for collections that need them
async def create_indexes():
    """Create indexes for MongoDB collections."""
    try:
        # Create index for users collection (for email and username uniqueness)
        users_collection = mongodb.get_collection("users")
        await users_collection.create_index("email", unique=True)
        await users_collection.create_index("username", unique=True)
        
        # Create index for refresh tokens collection
        refresh_tokens_collection = mongodb.get_collection("refresh_tokens")
        await refresh_tokens_collection.create_index("token", unique=True)
        await refresh_tokens_collection.create_index("user_id")
        await refresh_tokens_collection.create_index("expires_at")
        
        # Create TTL index to automatically remove expired tokens
        await refresh_tokens_collection.create_index(
            "expires_at", 
            expireAfterSeconds=0  # Remove documents after they expire
        )
        
        logger.info("MongoDB indexes created successfully")
    except Exception as e:
        logger.error(f"Failed to create MongoDB indexes: {e}")
        raise
