from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import get_db
import traceback

study_bp = Blueprint('study', __name__)

@study_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_schedule():
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # Expected data:
    # {
    #   "subjects": [{"name": "Math", "difficulty": 3}, {"name": "Physics", "difficulty": 5}],
    #   "exam_date": "2026-05-10",
    #   "daily_hours": 3,
    #   "target": "pass" # or "high_score"
    # }
    
    try:
        subjects_input = data.get('subjects', [])
        daily_hours = float(data.get('daily_hours', 3.0))
        
        weight_map = {
            'Easy': 1.0,
            'Medium': 2.0,
            'Hard': 3.5
        }
        
        # Calculate total weights
        total_weight = sum([weight_map.get(s['difficulty'], 1.0) for s in subjects_input])
        total_minutes_available = daily_hours * 60
        
        # Proportional mapping
        schedule = []
        for s in subjects_input:
            weight = weight_map.get(s['difficulty'], 1.0)
            allocated_minutes = int(total_minutes_available * (weight / max(total_weight, 1)))
            
            # Formatting nicely depending on duration
            hours_component = allocated_minutes // 60
            mins_component = allocated_minutes % 60
            formatted_time = f"{hours_component}h {mins_component}m" if hours_component > 0 else f"{mins_component}m"
            
            schedule.append({
                "subject": s['name'] or "Untitled Subject",
                "difficulty": s['difficulty'],
                "duration_minutes": allocated_minutes,
                "formatted_time": formatted_time
            })
            
        # Sort so harder subjects appear at top (eat the frog method)
        schedule.sort(key=lambda x: x['duration_minutes'], reverse=True)

        return jsonify({
            "status": "success",
            "schedule": schedule
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
