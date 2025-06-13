import os
import logging
from typing import List, Dict, Any, Optional
import httpx
import json
from sentence_transformers import SentenceTransformer
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMClient:
    """Client for interacting with various LLM APIs."""
    
    def __init__(self):
        self.embedding_model = None
    
    async def load_embedding_model(self):
        """Load the embedding model."""
        try:
            self.embedding_model = SentenceTransformer(settings.DEFAULT_EMBEDDING_MODEL)
            logger.info(f"Loaded embedding model: {settings.DEFAULT_EMBEDDING_MODEL}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for a list of texts."""
        if not self.embedding_model:
            await self.load_embedding_model()
        
        try:
            embeddings = self.embedding_model.encode(texts)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}")
            raise
    
    async def summarize_text(self, text: str, max_length: int = 200) -> str:
        """Summarize text using OpenAI API or DeepSeek API."""
        # Try DeepSeek first if available
        if settings.DEEPSEEK_API_KEY:
            try:
                return await self._summarize_with_deepseek(text, max_length)
            except Exception as e:
                logger.error(f"Failed to summarize with DeepSeek: {e}")
                # Fall through to OpenAI
        
        # Try OpenAI if available
        if settings.OPENAI_API_KEY:
            try:
                return await self._summarize_with_openai(text, max_length)
            except Exception as e:
                logger.error(f"Failed to summarize with OpenAI: {e}")
                # Fall through to fallback
        
        # Fallback to a simple summarization
        logger.warning("No API keys available, using fallback summarization")
        sentences = text.split('. ')
        summary = '. '.join(sentences[:3]) + '.'
        return summary[:max_length]
        
    async def _summarize_with_deepseek(self, text: str, max_length: int = 200) -> str:
        """Summarize text using DeepSeek API."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": "You are a helpful assistant that summarizes text."},
                            {"role": "user", "content": f"Summarize the following text in about 100 words:\n\n{text}"}
                        ],
                        "max_tokens": 150
                    },
                    timeout=30.0
                )
                
                response_data = response.json()
                summary = response_data["choices"][0]["message"]["content"].strip()
                return summary
        except Exception as e:
            logger.error(f"Failed to summarize text with DeepSeek: {e}")
            raise
    
    async def _summarize_with_openai(self, text: str, max_length: int = 200) -> str:
        """Summarize text using OpenAI API."""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API key not set")
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {"role": "system", "content": "You are a helpful assistant that summarizes text."},
                            {"role": "user", "content": f"Summarize the following text in about 100 words:\n\n{text}"}
                        ],
                        "max_tokens": 150
                    },
                    timeout=30.0
                )
                
                response_data = response.json()
                summary = response_data["choices"][0]["message"]["content"].strip()
                return summary
        except Exception as e:
            logger.error(f"Failed to summarize text with OpenAI: {e}")
            raise
    
    async def extract_tags(self, text: str, max_tags: int = 5) -> List[str]:
        """Extract tags from text using DeepSeek or OpenAI API."""
        # Try DeepSeek first if available
        if settings.DEEPSEEK_API_KEY:
            try:
                return await self._extract_tags_with_deepseek(text, max_tags)
            except Exception as e:
                logger.error(f"Failed to extract tags with DeepSeek: {e}")
                # Fall through to OpenAI
        
        # Try OpenAI if available
        if settings.OPENAI_API_KEY:
            try:
                return await self._extract_tags_with_openai(text, max_tags)
            except Exception as e:
                logger.error(f"Failed to extract tags with OpenAI: {e}")
                # Fall through to fallback
        
        # Fallback to simple word frequency
        logger.warning("No API keys available, using fallback tag extraction")
        words = text.lower().split()
        word_freq = {}
        for word in words:
            if len(word) > 3:  # Only consider words longer than 3 characters
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency and return top words
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_words[:max_tags]]
        
    async def _extract_tags_with_deepseek(self, text: str, max_tags: int = 5) -> List[str]:
        """Extract tags from text using DeepSeek API."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": "You are a helpful assistant that extracts relevant tags from text."},
                            {"role": "user", "content": f"Extract {max_tags} relevant tags from this text. Return only the tags as a comma-separated list without explanations:\n\n{text}"}
                        ],
                        "max_tokens": 50
                    },
                    timeout=30.0
                )
                
                response_data = response.json()
                tags_text = response_data["choices"][0]["message"]["content"].strip()
                tags = [tag.strip() for tag in tags_text.split(',')]
                return tags
        except Exception as e:
            logger.error(f"Failed to extract tags with DeepSeek: {e}")
            raise
    
    async def _extract_tags_with_openai(self, text: str, max_tags: int = 5) -> List[str]:
        """Extract tags from text using OpenAI API."""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API key not set")
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {"role": "system", "content": "You are a helpful assistant that extracts relevant tags from text."},
                            {"role": "user", "content": f"Extract {max_tags} relevant tags from this text. Return only the tags as a comma-separated list without explanations:\n\n{text}"}
                        ],
                        "max_tokens": 50
                    },
                    timeout=30.0
                )
                
                response_data = response.json()
                tags_text = response_data["choices"][0]["message"]["content"].strip()
                tags = [tag.strip() for tag in tags_text.split(',')]
                return tags
        except Exception as e:
            logger.error(f"Failed to extract tags with OpenAI: {e}")
            raise

llm_client = LLMClient()
