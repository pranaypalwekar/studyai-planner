from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import traceback

from routes.auth_new import get_current_user

router = APIRouter()

class SubjectInput(BaseModel):
    name: str
    difficulty: str  # Easy, Medium, Hard

class ScheduleRequest(BaseModel):
    subjects: List[SubjectInput]
    daily_hours: Optional[float] = 3.0
    exam_date: Optional[str] = None
    target: Optional[str] = "pass"

@router.post("/generate")
async def generate_schedule(data: ScheduleRequest, user_id: str = Depends(get_current_user)):
    """Generate proportional study schedule based on difficulty."""
    try:
        subjects_input = data.subjects
        daily_hours = data.daily_hours
        
        weight_map = {
            'Easy': 1.0,
            'Medium': 2.0,
            'Hard': 3.5
        }
        
        # Calculate total weights
        total_weight = sum([weight_map.get(s.difficulty, 1.0) for s in subjects_input])
        total_minutes_available = daily_hours * 60
        
        # Proportional mapping
        schedule = []
        for s in subjects_input:
            weight = weight_map.get(s.difficulty, 1.0)
            allocated_minutes = int(total_minutes_available * (weight / max(total_weight, 1)))
            
            # Formatting nicely depending on duration
            hours_component = allocated_minutes // 60
            mins_component = allocated_minutes % 60
            formatted_time = f"{hours_component}h {mins_component}m" if hours_component > 0 else f"{mins_component}m"
            
            schedule.append({
                "subject": s.name or "Untitled Subject",
                "difficulty": s.difficulty,
                "duration_minutes": allocated_minutes,
                "formatted_time": formatted_time
            })
            
        # Sort so harder subjects appear at top (eat the frog method)
        schedule.sort(key=lambda x: x['duration_minutes'], reverse=True)

        return {
            "status": "success",
            "schedule": schedule
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}
    
@router.get("/test")
async def test_study():
    return {"status": "ok", "message": "Study router is active"}
