from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional
import datetime
from bson import ObjectId

from models import get_db
from routes.auth_new import get_current_user

router = APIRouter()

class PomodoroLog(BaseModel):
    duration: Optional[int] = 25
    subject: Optional[str] = "General"

@router.post("/log")
async def log_session(data: PomodoroLog, user_id: str = Depends(get_current_user)):
    db = get_db()
    
    duration = data.duration
    subject = data.subject
    
    # 1 min = 10 XP
    gained_xp = duration * 10
    
    user_oid = ObjectId(user_id)
    
    db.study_sessions.insert_one({
        "user_id": user_oid,
        "duration": duration,
        "subject": subject,
        "timestamp": datetime.datetime.utcnow(),
        "xp_earned": gained_xp
    })
    
    # Update User XP
    user = db.users.find_one_and_update(
        {"_id": user_oid},
        {"$inc": {"xp": gained_xp}},
        return_document=True
    )
    
    # Simple Level up logic: 1 Level = 1000 XP
    current_xp = user.get('xp', 0)
    new_level = max(1, (current_xp // 1000) + 1)
    
    if new_level > user.get('level', 1):
        db.users.update_one({"_id": user_oid}, {"$set": {"level": new_level}})
    
    return {
        "status": "success",
        "message": "Session logged successfully",
        "xp_earned": gained_xp,
        "total_xp": current_xp,
        "level": new_level
    }
