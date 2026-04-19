from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from models import get_db
import datetime
import traceback

classroom_bp = Blueprint('classroom', __name__)


def _build_service(access_token):
    """Build a Google Classroom API service from an OAuth access token."""
    creds = Credentials(token=access_token)
    return build('classroom', 'v1', credentials=creds)


@classroom_bp.route('/sync', methods=['POST'])
@jwt_required()
def sync_classroom():
    """Full sync: fetch courses, assignments, and materials using a real Google access token."""
    data = request.get_json() or {}
    access_token = data.get('google_access_token')

    if not access_token:
        return jsonify({"error": "Google access token is required. Please connect your Google account first."}), 400

    try:
        service = _build_service(access_token)

        # ── 1. Fetch courses ───────────────────────────────────────────
        courses_result = service.courses().list(pageSize=20, courseStates=['ACTIVE']).execute()
        raw_courses = courses_result.get('courses', [])

        courses = []
        teacher_cache = {}
        color_palette = ['#8b5cf6', '#f43f5e', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6']

        for idx, c in enumerate(raw_courses):
            course_id = c['id']

            # Fetch teacher profile for this course
            teacher_info = {"name": "Unknown Teacher", "email": "", "avatar": "??"}
            owner_id = c.get('ownerId')
            if owner_id:
                if owner_id not in teacher_cache:
                    try:
                        profile = service.userProfiles().get(userId=owner_id).execute()
                        name = profile.get('name', {})
                        full_name = name.get('fullName', f"{name.get('givenName', '')} {name.get('familyName', '')}".strip())
                        email = profile.get('emailAddress', '')
                        initials = ''.join([part[0].upper() for part in full_name.split()[:2]]) if full_name else '??'
                        teacher_cache[owner_id] = {
                            "name": full_name,
                            "email": email,
                            "avatar": initials,
                            "photoUrl": profile.get('photoUrl', '')
                        }
                    except Exception:
                        teacher_cache[owner_id] = {"name": "Teacher", "email": "", "avatar": "T"}
                teacher_info = teacher_cache[owner_id]

            courses.append({
                "id": course_id,
                "name": c.get('name', 'Untitled Course'),
                "section": c.get('section', ''),
                "teacher": teacher_info,
                "color": color_palette[idx % len(color_palette)],
                "room": c.get('room', ''),
                "description": c.get('descriptionHeading', ''),
                "enrollmentCode": c.get('enrollmentCode', ''),
                "alternateLink": c.get('alternateLink', '')
            })

        # ── 2. Fetch coursework (assignments) for each course ──────────
        assignments = []
        for course in courses:
            try:
                cw_result = service.courses().courseWork().list(
                    courseId=course['id'],
                    pageSize=20,
                    orderBy='dueDate desc'
                ).execute()
                raw_cw = cw_result.get('courseWork', [])

                for cw in raw_cw:
                    due_date = None
                    if cw.get('dueDate'):
                        d = cw['dueDate']
                        t = cw.get('dueTime', {})
                        try:
                            due_date = datetime.datetime(
                                d.get('year', 2026), d.get('month', 1), d.get('day', 1),
                                t.get('hours', 23), t.get('minutes', 59)
                            ).isoformat()
                        except Exception:
                            due_date = None

                    # Gather attachments
                    attachments = []
                    for mat in cw.get('materials', []):
                        if mat.get('driveFile'):
                            df = mat['driveFile'].get('driveFile', {})
                            attachments.append({
                                "name": df.get('title', 'Untitled'),
                                "type": "drive",
                                "url": df.get('alternateLink', ''),
                                "size": ""
                            })
                        elif mat.get('link'):
                            attachments.append({
                                "name": mat['link'].get('title', 'Link'),
                                "type": "link",
                                "url": mat['link'].get('url', ''),
                                "size": ""
                            })
                        elif mat.get('form'):
                            attachments.append({
                                "name": mat['form'].get('title', 'Form'),
                                "type": "form",
                                "url": mat['form'].get('formUrl', ''),
                                "size": ""
                            })

                    # Determine type
                    work_type = cw.get('workType', 'ASSIGNMENT').lower()
                    type_map = {
                        'assignment': 'assignment',
                        'short_answer_question': 'quiz',
                        'multiple_choice_question': 'quiz',
                    }

                    assignments.append({
                        "id": cw.get('id', ''),
                        "course_id": course['id'],
                        "course_name": course['name'],
                        "teacher": course['teacher']['name'],
                        "title": cw.get('title', 'Untitled'),
                        "description": cw.get('description', ''),
                        "due_date": due_date,
                        "max_points": cw.get('maxPoints', 0),
                        "status": cw.get('state', 'PUBLISHED').lower(),
                        "type": type_map.get(work_type, 'assignment'),
                        "attachments": attachments,
                        "alternateLink": cw.get('alternateLink', '')
                    })
            except Exception as e:
                print(f"[WARN] Could not fetch coursework for {course['name']}: {e}")

        # Sort assignments by due date (soonest first, nulls last)
        assignments.sort(key=lambda a: a['due_date'] or '9999')

        # ── 3. Fetch course materials / announcements ──────────────────
        notes = []
        for course in courses:
            # Try announcements
            try:
                ann_result = service.courses().announcements().list(
                    courseId=course['id'],
                    pageSize=10
                ).execute()
                for ann in ann_result.get('announcements', []):
                    attachments = []
                    for mat in ann.get('materials', []):
                        if mat.get('driveFile'):
                            df = mat['driveFile'].get('driveFile', {})
                            attachments.append({
                                "name": df.get('title', 'File'),
                                "type": "drive",
                                "url": df.get('alternateLink', ''),
                                "size": ""
                            })
                        elif mat.get('link'):
                            attachments.append({
                                "name": mat['link'].get('title', 'Link'),
                                "type": "link",
                                "url": mat['link'].get('url', ''),
                                "size": ""
                            })

                    notes.append({
                        "id": ann.get('id', ''),
                        "course_id": course['id'],
                        "course_name": course['name'],
                        "teacher": course['teacher']['name'],
                        "title": ann.get('text', '')[:80] + ('...' if len(ann.get('text', '')) > 80 else ''),
                        "posted_date": ann.get('creationTime', ''),
                        "content_preview": ann.get('text', ''),
                        "attachments": attachments,
                        "type": "announcement",
                        "alternateLink": ann.get('alternateLink', '')
                    })
            except Exception as e:
                print(f"[WARN] Could not fetch announcements for {course['name']}: {e}")

            # Try course materials (topics/materials)
            try:
                mat_result = service.courses().courseWorkMaterials().list(
                    courseId=course['id'],
                    pageSize=10
                ).execute()
                for mat_item in mat_result.get('courseWorkMaterial', []):
                    attachments = []
                    for mat in mat_item.get('materials', []):
                        if mat.get('driveFile'):
                            df = mat['driveFile'].get('driveFile', {})
                            attachments.append({
                                "name": df.get('title', 'File'),
                                "type": "drive",
                                "url": df.get('alternateLink', ''),
                                "size": ""
                            })
                        elif mat.get('link'):
                            attachments.append({
                                "name": mat['link'].get('title', 'Link'),
                                "type": "link",
                                "url": mat['link'].get('url', ''),
                                "size": ""
                            })

                    notes.append({
                        "id": mat_item.get('id', ''),
                        "course_id": course['id'],
                        "course_name": course['name'],
                        "teacher": course['teacher']['name'],
                        "title": mat_item.get('title', 'Untitled Material'),
                        "posted_date": mat_item.get('creationTime', ''),
                        "content_preview": mat_item.get('description', ''),
                        "attachments": attachments,
                        "type": "material",
                        "alternateLink": mat_item.get('alternateLink', '')
                    })
            except Exception as e:
                # courseWorkMaterials might not be available for all courses
                pass

        # ── 4. Persist to Database ─────────────────────────────────────
        db = get_db()
        user_id = get_jwt_identity()

        # Update Courses
        if courses:
            for c in courses:
                c['user_id'] = user_id
                db.classroom_courses.update_one(
                    {"id": c['id'], "user_id": user_id},
                    {"$set": c},
                    upsert=True
                )

        # Update Assignments
        if assignments:
            # First mark old assignments for this user as archived or delete if they aren't in the new list?
            # For simplicity, we'll just upsert and keep them.
            for a in assignments:
                a['user_id'] = user_id
                db.classroom_assignments.update_one(
                    {"id": a['id'], "user_id": user_id},
                    {"$set": a},
                    upsert=True
                )

        # Update Notes
        if notes:
            for n in notes:
                n['user_id'] = user_id
                db.classroom_notes.update_one(
                    {"id": n['id'], "user_id": user_id},
                    {"$set": n},
                    upsert=True
                )

        return jsonify({
            "status": "success",
            "message": f"Synced {len(courses)} courses, {len(assignments)} assignments, {len(notes)} materials from Google Classroom",
            "courses": courses,
            "assignments": assignments,
            "notes": notes
        }), 200

    except Exception as e:
        traceback.print_exc()
        error_msg = str(e)
        if 'insufficient' in error_msg.lower() or '403' in error_msg:
            return jsonify({
                "error": "Google Classroom API is not enabled for your project. Please enable it at: https://console.cloud.google.com/apis/library/classroom.googleapis.com",
                "help_url": "https://console.cloud.google.com/apis/library/classroom.googleapis.com"
            }), 403
        return jsonify({"error": f"Failed to sync: {error_msg}"}), 500


@classroom_bp.route('/courses', methods=['POST'])
@jwt_required()
def get_courses():
    """Fetch courses using access token."""
    data = request.get_json() or {}
    access_token = data.get('google_access_token')
    if not access_token:
        return jsonify({"error": "Google access token required"}), 400

    try:
        service = _build_service(access_token)
        result = service.courses().list(pageSize=20, courseStates=['ACTIVE']).execute()
        return jsonify({"status": "success", "courses": result.get('courses', [])}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@classroom_bp.route('/data', methods=['GET'])
@jwt_required()
def get_classroom_data():
    """Fetch user's synced classroom data from the database."""
    db = get_db()
    user_id = get_jwt_identity()
    
    courses = list(db.classroom_courses.find({"user_id": user_id}, {"_id": 0}))
    assignments = list(db.classroom_assignments.find({"user_id": user_id}, {"_id": 0}))
    notes = list(db.classroom_notes.find({"user_id": user_id}, {"_id": 0}))
    
    return jsonify({
        "status": "success",
        "courses": courses,
        "assignments": assignments,
        "notes": notes
    }), 200


@classroom_bp.route('/schedule_from_assignments', methods=['POST'])
@jwt_required()
def schedule_from_assignments():
    """Generate a study schedule from provided assignments."""
    data = request.get_json() or {}
    assignments = data.get('assignments', [])
    daily_hours = float(data.get('daily_hours', 3))

    schedule_items = []
    for asgn in assignments:
        due_str = asgn.get('due_date')
        if not due_str:
            continue

        try:
            due = datetime.datetime.fromisoformat(due_str.replace('Z', '+00:00'))
        except Exception:
            continue

        now = datetime.datetime.now(due.tzinfo) if due.tzinfo else datetime.datetime.utcnow()
        days_left = max(1, (due - now).days)

        # Estimate effort based on type and points
        points = asgn.get('max_points', 50) or 50
        effort_map = {'assignment': 2.5, 'lab_report': 3.0, 'essay': 3.5, 'quiz': 1.0}
        base_hours = effort_map.get(asgn.get('type', 'assignment'), 2.0)
        # Scale more for higher-point assignments
        base_hours *= max(0.5, min(2.0, points / 50))
        daily_allocation = round(base_hours / days_left, 1)

        urgency = "urgent" if days_left <= 2 else ("medium" if days_left <= 5 else "low")

        schedule_items.append({
            "assignment": asgn.get('title', 'Untitled'),
            "course": asgn.get('course_name', ''),
            "teacher": asgn.get('teacher', ''),
            "days_remaining": days_left,
            "daily_hours_needed": min(daily_allocation, daily_hours),
            "total_hours_estimate": round(base_hours, 1),
            "urgency": urgency,
            "type": asgn.get('type', 'assignment')
        })

    schedule_items.sort(key=lambda x: x['days_remaining'])

    return jsonify({
        "status": "success",
        "schedule": schedule_items
    }), 200
