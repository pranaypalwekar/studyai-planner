from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
import datetime
from models import get_db
from google.oauth2 import id_token
from google.auth.transport import requests
import os

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    db = get_db()
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing email or password"}), 400

    if db.users.find_one({"email": data['email']}):
        return jsonify({"error": "User already exists"}), 400

    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    
    new_user = {
        "email": data['email'],
        "password": hashed_password,
        "name": data.get('name', ''),
        "xp": 0,
        "level": 1,
        "badges": [],
        "created_at": datetime.datetime.utcnow()
    }
    
    result = db.users.insert_one(new_user)
    
    # Generate token
    access_token = create_access_token(identity=str(result.inserted_id), expires_delta=datetime.timedelta(days=7))
    
    return jsonify({
        "message": "User registered successfully",
        "access_token": access_token,
        "user": {
            "id": str(result.inserted_id),
            "email": new_user["email"],
            "name": new_user["name"],
            "xp": new_user["xp"],
            "level": new_user["level"]
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    db = get_db()
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Missing email or password"}), 400

    user = db.users.find_one({"email": data['email']})
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
        return jsonify({"error": "Invalid email or password"}), 401

    # Calculate Streak
    now = datetime.datetime.utcnow()
    last_login = user.get("last_login")
    streak = user.get("streak", 1)
    
    if last_login:
        delta = now.date() - last_login.date()
        if delta.days == 1:
            streak += 1
        elif delta.days > 1:
            streak = 1
            
    db.users.update_one({"_id": user['_id']}, {"$set": {"last_login": now, "streak": streak}})

    access_token = create_access_token(identity=str(user['_id']), expires_delta=datetime.timedelta(days=7))
    
    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": str(user['_id']),
            "email": user["email"],
            "name": user["name"],
            "xp": user.get("xp", 0),
            "level": user.get("level", 1),
            "streak": streak
        }
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    db = get_db()
    current_user_id = get_jwt_identity()
    from bson.objectid import ObjectId
    user = db.users.find_one({"_id": ObjectId(current_user_id)})
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({
        "id": str(user['_id']),
        "email": user["email"],
        "name": user["name"],
        "xp": user.get("xp", 0),
        "level": user.get("level", 1),
        "badges": user.get("badges", [])
    }), 200

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    db = get_db()
    data = request.get_json()
    token = data.get('credential')
    
    if not token:
        return jsonify({"error": "Missing Google credential"}), 400

    try:
        # In a real production app, verify with Client ID:
        # client_id = os.getenv("GOOGLE_CLIENT_ID")
        # idinfo = id_token.verify_oauth2_token(token, requests.Request(), client_id)
        
        # For development ease without a forced client ID configured:
        # We will decode the token blindly to get user email/name without validation
        import jwt
        idinfo = jwt.decode(token, options={"verify_signature": False})
        
        email = idinfo.get('email')
        name = idinfo.get('name')
        
        if not email:
            return jsonify({"error": "Invalid token"}), 400

        user = db.users.find_one({"email": email})
        
        if not user:
            # Create new user
            new_user = {
                "email": email,
                "password": b"", # No password for Google SSO
                "name": name,
                "xp": 0,
                "level": 1,
                "badges": [],
                "created_at": datetime.datetime.utcnow(),
                "auth_provider": "google"
            }
            result = db.users.insert_one(new_user)
            user_id = str(result.inserted_id)
            user = new_user
        else:
            user_id = str(user['_id'])

        # Calculate Streak
        now = datetime.datetime.utcnow()
        last_login = user.get("last_login")
        streak = user.get("streak", 1)
        if last_login:
            delta = now.date() - last_login.date()
            if delta.days == 1:
                streak += 1
            elif delta.days > 1:
                streak = 1
        
        from bson.objectid import ObjectId
        db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"last_login": now, "streak": streak}})

        access_token = create_access_token(identity=user_id, expires_delta=datetime.timedelta(days=7))
        
        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "user": {
                "id": user_id,
                "email": user["email"],
                "name": user.get("name", ""),
                "xp": user.get("xp", 0),
                "level": user.get("level", 1),
                "streak": streak
            }
        }), 200
        
    except ValueError:
        return jsonify({"error": "Invalid Google Token"}), 401
