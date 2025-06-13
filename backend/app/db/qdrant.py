from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class QdrantDB:
    client = None
    collection_name = None
    
    def __init__(self):
        self.collection_name = settings.QDRANT_COLLECTION_NAME
    
    def connect_to_qdrant(self):
        """Connect to Qdrant vector database."""
        try:
            if settings.QDRANT_MODE.lower() == "cloud":
                # Use API key for Qdrant Cloud authentication
                logger.info(f"Connecting to Qdrant Cloud at {settings.QDRANT_URL}")
                self.client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY
                )
                logger.info(f"Connected to Qdrant Cloud with collection: {self.collection_name}")
            elif settings.QDRANT_MODE.lower() == "local":
                # Connect to local Qdrant instance
                logger.info(f"Connecting to local Qdrant at {settings.QDRANT_URL}")
                self.client = QdrantClient(url=settings.QDRANT_URL)
                logger.info(f"Connected to local Qdrant with collection: {self.collection_name}")
            else:  # memory mode
                # Use in-memory Qdrant instance
                logger.info("Using in-memory Qdrant instance")
                self.client = QdrantClient(":memory:")
                logger.info(f"Connected to in-memory Qdrant with collection: {self.collection_name}")
            
            return self.client
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant: {e}")
            raise
    
    async def create_collection_if_not_exists(self):
        """Create collection if it doesn't exist."""
        try:
            collections = self.client.get_collections().collections
            collection_names = [collection.name for collection in collections]
            
            if self.collection_name not in collection_names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=settings.VECTOR_SIZE,
                        distance=models.Distance.COSINE
                    )
                )
                logger.info(f"Created collection: {self.collection_name}")
            else:
                logger.info(f"Collection {self.collection_name} already exists")
            return True
        except Exception as e:
            logger.error(f"Failed to create collection: {e}")
            return False
    
    async def store_vectors(self, vectors, metadata, ids=None):
        """Store vectors in Qdrant."""
        try:
            points = []
            for i, (vector, payload) in enumerate(zip(vectors, metadata)):
                point_id = ids[i] if ids else i
                points.append(models.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=payload
                ))
            
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            return True
        except Exception as e:
            logger.error(f"Failed to store vectors: {e}")
            return False
    
    async def search_vectors(self, query_vector, limit=10):
        """Search for similar vectors in Qdrant."""
        try:
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=limit
            )
            return results
        except Exception as e:
            logger.error(f"Failed to search vectors: {e}")
            return []
    
    async def store_vector(self, id, vector, metadata):
        """Store a single vector in Qdrant."""
        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    models.PointStruct(
                        id=id,
                        vector=vector,
                        payload=metadata
                    )
                ]
            )
            logger.info(f"Stored vector with ID: {id}")
            return True
        except Exception as e:
            logger.error(f"Failed to store vector: {e}")
            return False
    
    async def delete_vector(self, id):
        """Delete a vector from Qdrant."""
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=models.PointIdsList(points=[id])
            )
            logger.info(f"Deleted vector with ID: {id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete vector: {e}")
            return False
    
    async def search_similar(self, query_vector, limit=10):
        """Search for similar vectors and return formatted results."""
        try:
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=limit
            )
            
            formatted_results = []
            for result in results:
                formatted_results.append({
                    "id": result.id,
                    "score": result.score,
                    "metadata": result.payload
                })
            
            return formatted_results
        except Exception as e:
            logger.error(f"Failed to search similar vectors: {e}")
            return []

qdrant = QdrantDB()
