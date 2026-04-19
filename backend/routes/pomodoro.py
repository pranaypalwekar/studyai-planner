from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import datetime
from models import get_db

pomodoro_bp = Blueprint('pomodoro', __name__)

@pomodoro_bp.route('/log', methods=['POST'])
@jwt_required()
def log_session():
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json()
    
    duration = data.get('duration', 25) # in minutes
    subject = data.get('subject', 'General')
    
    # 1 min = 10 XP
    gained_xp = duration * 10
    
    from bson.objectid import ObjectId
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
    new_level = max(1, (user.get('xp', 0) // 1000) + 1)
    if new_level > user.get('level', 1):
        db.users.update_one({"_id": user_oid}, {"$set": {"level": new_level}})
    
    return jsonify({
        "message": "Session logged successfully",
        "xp_earned": gained_xp,
        "total_xp": user.get('xp', 0) + gained_xp,
        "level": new_level
    }), 200
