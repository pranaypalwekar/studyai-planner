from fastapi import APIRouter, Depends, HTTPException
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from bson import ObjectId
import datetime
import traceback

from models import get_db
from routes.auth_new import get_current_user

router = APIRouter()

def get_google_service(user_id: str):
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user or "google_tokens" not in user:
        return None
        
    tokens = user["google_tokens"]
    
    from config import Config
    from cryptography.fernet import Fernet
    
    decrypted_refresh = None
    if tokens.get("refresh_token"):
        f = Fernet(Config.FERNET_KEY)
        # Attempt to decrypt, or fallback to raw if not encrypted (backward compatibility)
        try:
            decrypted_refresh = f.decrypt(tokens.get("refresh_token").encode()).decode()
        except Exception:
            decrypted_refresh = tokens.get("refresh_token")
            
    creds = Credentials(
        token=tokens.get("access_token"),
        refresh_token=decrypted_refresh,
        token_uri=tokens.get("token_uri"),
        client_id=tokens.get("client_id"),
        client_secret=tokens.get("client_secret"),
        scopes=tokens.get("scopes")
    )
    
    # Refresh token if expired
    if creds.expired:
        creds.refresh(GoogleRequest())
        # Update db with new access token
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"google_tokens.access_token": creds.token}}
        )
        
    return build('classroom', 'v1', credentials=creds)

@router.post("/sync")
async def sync_classroom(user_id: str = Depends(get_current_user)):
    service = get_google_service(user_id)
    if not service:
        raise HTTPException(status_code=400, detail="Google Classroom not connected")

    try:
        # 1. Fetch Courses
        courses_result = service.courses().list(pageSize=20, courseStates=['ACTIVE']).execute()
        raw_courses = courses_result.get('courses', [])
        
        db = get_db()
        courses = []
        for c in raw_courses:
            course_data = {
                "id": c['id'],
                "user_id": user_id,
                "name": c.get('name', 'Untitled'),
                "section": c.get('section', ''),
                "room": c.get('room', ''),
                "alternateLink": c.get('alternateLink', ''),
                "description": c.get('descriptionHeading', ''),
                "updated_at": datetime.datetime.utcnow()
            }
            db.classroom_courses.update_one(
                {"id": c['id'], "user_id": user_id},
                {"$set": course_data},
                upsert=True
            )
            courses.append(course_data)

        # 2. Fetch CourseWork (Assignments) and Submissions
        assignments = []
        for course in courses:
            try:
                cw_result = service.courses().courseWork().list(courseId=course['id'], pageSize=20).execute()
                
                submissions_dict = {}
                try:
                    subs_result = service.courses().courseWork().studentSubmissions().list(
                        courseId=course['id'], courseWorkId='-').execute()
                    for sub in subs_result.get('studentSubmissions', []):
                        submissions_dict[sub['courseWorkId']] = sub
                except Exception as e:
                    pass

                for cw in cw_result.get('courseWork', []):
                    due_date = None
                    if 'dueDate' in cw:
                        d = cw['dueDate']
                        t = cw.get('dueTime', {})
                        due_date = datetime.datetime(
                            d['year'], d['month'], d['day'],
                            t.get('hours', 23), t.get('minutes', 59)
                        ).isoformat()

                    sub_info = submissions_dict.get(cw['id'], {})
                    attachments = []
                    if 'materials' in cw:
                        for m in cw['materials']:
                            if 'driveFile' in m:
                                attachments.append({
                                    "fileId": m['driveFile']['driveFile'].get('id', ''),
                                    "name": m['driveFile']['driveFile'].get('title', 'Drive File'),
                                    "url": m['driveFile']['driveFile'].get('alternateLink', '')
                                })
                            elif 'link' in m:
                                attachments.append({
                                    "name": m['link'].get('title', 'Link'),
                                    "url": m['link'].get('url', '')
                                })

                    assignment = {
                        "id": cw['id'],
                        "user_id": user_id,
                        "course_id": course['id'],
                        "course_name": course['name'],
                        "title": cw.get('title', 'Untitled'),
                        "description": cw.get('description', ''),
                        "due_date": due_date,
                        "max_points": cw.get('maxPoints'),
                        "type": cw.get('workType', 'ASSIGNMENT').lower(),
                        "alternateLink": cw.get('alternateLink', ''),
                        "submission_state": sub_info.get('state', 'NEW'),
                        "grade": sub_info.get('assignedGrade'),
                        "late": sub_info.get('late', False),
                        "attachments": attachments,
                        "updated_at": datetime.datetime.utcnow()
                    }
                    db.classroom_assignments.update_one(
                        {"id": cw['id'], "user_id": user_id},
                        {"$set": assignment},
                        upsert=True
                    )
                    assignments.append(assignment)
            except Exception as e:
                traceback.print_exc()

        # 3. Fetch Materials (Notes)
        materials = []
        for course in courses:
            try:
                mat_result = service.courses().courseWorkMaterials().list(courseId=course['id'], pageSize=20).execute()
                for mat in mat_result.get('courseWorkMaterials', []):
                    material = {
                        "id": mat['id'],
                        "user_id": user_id,
                        "course_id": course['id'],
                        "course_name": course['name'],
                        "title": mat.get('title', 'Untitled'),
                        "description": mat.get('description', ''),
                        "content_preview": mat.get('description', '')[:200] if mat.get('description') else '',
                        "type": "material",
                        "alternateLink": mat.get('alternateLink', ''),
                        "attachments": [],
                        "updated_at": datetime.datetime.utcnow()
                    }
                    
                    # Handle attachments if any
                    if 'materials' in mat:
                        for m in mat['materials']:
                            if 'driveFile' in m:
                                material['attachments'].append({
                                    "fileId": m['driveFile']['driveFile'].get('id', ''),
                                    "name": m['driveFile']['driveFile'].get('title', 'Drive File'),
                                    "url": m['driveFile']['driveFile'].get('alternateLink', '')
                                })
                            elif 'link' in m:
                                material['attachments'].append({
                                    "name": m['link'].get('title', 'Link'),
                                    "url": m['link'].get('url', '')
                                })

                    db.classroom_materials.update_one(
                        {"id": mat['id'], "user_id": user_id},
                        {"$set": material},
                        upsert=True
                    )
                    materials.append(material)
            except Exception as e:
                traceback.print_exc()

        return {
            "status": "success", 
            "message": f"Synced {len(courses)} courses, {len(assignments)} assignments, and {len(materials)} materials.",
            "synced": {"courses": len(courses), "assignments": len(assignments), "materials": len(materials)}
        }

    except Exception as e:
        traceback.print_exc()
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"error": str(e), "detail": str(e)})

@router.get("/data")
async def get_classroom_data(user_id: str = Depends(get_current_user)):
    db = get_db()
    courses = list(db.classroom_courses.find({"user_id": user_id}, {"_id": 0}))
    assignments = list(db.classroom_assignments.find({"user_id": user_id}, {"_id": 0}))
    notes = list(db.classroom_materials.find({"user_id": user_id}, {"_id": 0}))
    
    # Add some mock colors if missing for UI
    colors = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444']
    for i, course in enumerate(courses):
        if 'color' not in course:
            course['color'] = colors[i % len(colors)]
            
    return {
        "status": "success",
        "courses": courses,
        "assignments": assignments,
        "notes": notes
    }

@router.post("/schedule_from_assignments")
async def schedule_from_assignments(data: dict, user_id: str = Depends(get_current_user)):
    """
    Creates a smart study schedule based on assignments.
    Frontend sends: { assignments: [], daily_hours: int }
    """
    assignments = data.get('assignments', [])
    daily_hours = data.get('daily_hours', 4)
    
    if not assignments:
        return {"status": "success", "schedule": []}
        
    schedule = []
    now = datetime.datetime.utcnow()
    
    for asgn in assignments:
        due_date_str = asgn.get('due_date')
        if not due_date_str:
            continue
            
        due_date = datetime.datetime.fromisoformat(due_date_str.replace('Z', ''))
        days_remaining = (due_date - now).days
        
        # Priority logic
        urgency = "low"
        if days_remaining <= 2: urgency = "urgent"
        elif days_remaining <= 5: urgency = "medium"
        
        # Estimate total hours based on complexity (mock logic: 2-8 hours)
        # In a real app, we might use AI to estimate based on description
        total_hours_estimate = 4 if urgency == "medium" else (8 if urgency == "urgent" else 2)
        
        # Calculate daily load
        daily_needed = round(total_hours_estimate / max(days_remaining, 1), 1)
        
        schedule.append({
            "assignment": asgn.get('title', 'Untitled'),
            "course": asgn.get('course_name', 'General'),
            "due_date": due_date_str,
            "days_remaining": max(days_remaining, 0),
            "urgency": urgency,
            "total_hours_estimate": total_hours_estimate,
            "daily_hours_needed": min(daily_needed, daily_hours)
        })
        
    # Sort by urgency
    prio_map = {"urgent": 0, "medium": 1, "low": 2}
    schedule.sort(key=lambda x: prio_map.get(x['urgency'], 3))
    
    return {
        "status": "success",
        "schedule": schedule
    }

@router.get("/classrooms")
async def get_classrooms(user_id: str = Depends(get_current_user)):
    db = get_db()
    courses = list(db.classroom_courses.find({"user_id": user_id}, {"_id": 0}))
    return {"status": "success", "courses": courses}

@router.get("/assignments")
async def get_assignments(user_id: str = Depends(get_current_user)):
    db = get_db()
    assignments = list(db.classroom_assignments.find({"user_id": user_id}, {"_id": 0}))
    return {"status": "success", "assignments": assignments}

@router.get("/materials")
async def get_materials(user_id: str = Depends(get_current_user)):
    db = get_db()
    notes = list(db.classroom_materials.find({"user_id": user_id}, {"_id": 0}))
    return {"status": "success", "materials": notes}

@router.get("/grades")
async def get_grades(user_id: str = Depends(get_current_user)):
    db = get_db()
    # Find assignments with grades
    assignments = list(db.classroom_assignments.find({"user_id": user_id, "grade": {"$ne": None}}, {"_id": 0}))
    return {"status": "success", "grades": assignments}

@router.delete("/auth/disconnect")
async def disconnect_google(user_id: str = Depends(get_current_user)):
    db = get_db()
    db.users.update_one({"_id": ObjectId(user_id)}, {"$unset": {"google_tokens": ""}})
    db.classroom_courses.delete_many({"user_id": user_id})
    db.classroom_assignments.delete_many({"user_id": user_id})
    db.classroom_materials.delete_many({"user_id": user_id})
    return {"status": "success", "message": "Google Classroom disconnected and data removed"}
