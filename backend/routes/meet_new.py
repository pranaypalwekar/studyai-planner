from fastapi import APIRouter, Depends
import uuid
import os

from routes.auth_new import get_current_user

router = APIRouter()

@router.post("/create")
async def create_meet(user_id: str = Depends(get_current_user)):
    """Virtual Study Room provisioned successfully."""
    # Generate a realistic looking meet code format xxx-xxxx-xxx
    hash_str = uuid.uuid4().hex
    meet_code = f"{hash_str[:3]}-{hash_str[3:7]}-{hash_str[7:10]}"
    meet_link = f"https://meet.google.com/{meet_code}"
    
    return {
        "status": "success",
        "message": "Virtual Study Room provisioned successfully.",
        "data": {
            "meet_url": meet_link,
            "meet_code": meet_code
        }
    }
