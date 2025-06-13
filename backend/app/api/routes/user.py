from fastapi import APIRouter, Path, HTTPException, Depends
from typing import List
from app.db.mongo import mongodb
from app.models.user import UserCreate, UserResponse, UserUpdate, UserRecommendation

router = APIRouter()

@router.post("/user", response_model=UserResponse)
async def create_user(
    user: UserCreate
):
    """
    Create a new user.
    Anonymous users are allowed.
    """
    users_collection = mongodb.get_collection("users")
    
    # Check if username already exists
    existing_user = await users_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create user in database
    user_db = UserResponse(**user.dict())
    await users_collection.insert_one(user_db.dict())
    
    return user_db

@router.get("/user/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str = Path(..., description="User ID")
):
    """
    Retrieve a user by their ID.
    """
    users_collection = mongodb.get_collection("users")
    user = await users_collection.find_one({"id": user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@router.put("/user/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate
):
    """
    Update a user's information.
    """
    users_collection = mongodb.get_collection("users")
    
    # Check if user exists
    existing_user = await users_collection.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update only non-None fields
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    
    if update_data:
        await users_collection.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
    
    # Get updated user
    updated_user = await users_collection.find_one({"id": user_id})
    return updated_user

@router.get("/user/{user_id}/documents", response_model=List[dict])
async def get_user_documents(
    user_id: str = Path(..., description="User ID")
):
    """
    Retrieve all documents uploaded by a specific user.
    """
    documents_collection = mongodb.get_collection("documents")
    documents = await documents_collection.find({"user_id": user_id}).to_list(length=100)
    
    return documents

@router.get("/user/{user_id}/recommendations", response_model=UserRecommendation)
async def get_user_recommendations(
    user_id: str = Path(..., description="User ID")
):
    """
    Get recommendations for similar users based on document similarity.
    """
    # TODO: Implement user similarity calculation
    # This would involve:
    # 1. Getting all documents for the user
    # 2. Calculating average embedding for the user
    # 3. Finding users with similar embeddings
    
    # For now, return a placeholder response
    return UserRecommendation(similar_users=[])
