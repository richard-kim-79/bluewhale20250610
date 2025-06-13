"""
Celery configuration for BlueWhale async task processing.
"""
from celery import Celery
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Redis URL from environment or default
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create Celery app
celery_app = Celery(
    "bluewhale",
    broker=redis_url,
    backend=redis_url,
    include=[
        "app.tasks.document_processing",
    ]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour
    worker_prefetch_multiplier=1,  # One task per worker at a time
    task_acks_late=True,  # Acknowledge tasks after execution
)
