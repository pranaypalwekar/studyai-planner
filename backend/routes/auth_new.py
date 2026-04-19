import os
import traceback
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from bson import ObjectId

from config import Config
from models import get_db

router = APIRouter()

# OAuth Scopes
SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/classroom.announcements.readonly",
    "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
    "https://www.googleapis.com/auth/drive.readonly",   # For file preview & download
]

# Helper to create JWT
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, Config.JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

# Helper to verify JWT
async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

@router.get("/google")
async def google_login():
    if not Config.GOOGLE_CLIENT_ID or not Config.GOOGLE_CLIENT_SECRET or \
       "your_google_client_id" in Config.GOOGLE_CLIENT_ID:
        return {"error": "Missing Google Credentials", "message": "Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your backend/.env file."}

    from urllib.parse import urlencode
    
    params = {
        "client_id": Config.GOOGLE_CLIENT_ID,
        "redirect_uri": f"http://localhost:5000/api/auth/callback",
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": secrets.token_urlsafe(16)
    }
    
    authorization_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    
    return {"url": authorization_url}

@router.get("/callback")
async def auth_callback(code: str, state: str):
    db = get_db()
    
    try:
        # Manual token exchange to avoid "Missing code verifier" PKCE issues in stateless FastAPI
        import requests
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": Config.GOOGLE_CLIENT_ID,
            "client_secret": Config.GOOGLE_CLIENT_SECRET,
            "redirect_uri": f"http://localhost:5000/api/auth/callback",
            "grant_type": "authorization_code"
        }
        
        token_res = requests.post(token_url, data=token_data)
        token_res_json = token_res.json()
        
        if "error" in token_res_json:
            print("Token Exchange Error:", token_res_json)
            return RedirectResponse(url="http://localhost:5173/login?error=token_exchange_failed")
            
        access_token = token_res_json.get("access_token")
        refresh_token = token_res_json.get("refresh_token")
        id_token_jwt = token_res_json.get("id_token")
        
        # Verify Identity using the id_token
        # Verify Identity using the id_token
        # Using a very large clock skew to mitigate Windows local time vs UTC epoch discrepancies (+05:30 offsets)
        id_info = id_token.verify_oauth2_token(
            id_token_jwt, google_requests.Request(), Config.GOOGLE_CLIENT_ID, clock_skew_in_seconds=86400
        )
        
        email = id_info['email']
        name = id_info.get('name', '')
        picture = id_info.get('picture', '')

        # Encrypt the refresh token
        from cryptography.fernet import Fernet
        encrypted_refresh_token = None
        if refresh_token:
            f = Fernet(Config.FERNET_KEY)
            encrypted_refresh_token = f.encrypt(refresh_token.encode()).decode()

        # Handle MongoDB update
        user = db.users.find_one({"email": email})
        if user:
            # If refresh_token is missing in new credentials (it only comes on first consent), keep the old one
            if not refresh_token and "google_tokens" in user:
                user_data = {
                    "email": email,
                    "name": name,
                    "picture": picture,
                    "google_tokens": {
                        "access_token": access_token,
                        "refresh_token": user["google_tokens"].get("refresh_token"),
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "client_id": Config.GOOGLE_CLIENT_ID,
                        "client_secret": Config.GOOGLE_CLIENT_SECRET,
                        "scopes": SCOPES
                    },
                    "last_login": datetime.utcnow()
                }
            else:
                 user_data = {
                    "email": email,
                    "name": name,
                    "picture": picture,
                    "google_tokens": {
                        "access_token": access_token,
                        "refresh_token": encrypted_refresh_token,
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "client_id": Config.GOOGLE_CLIENT_ID,
                        "client_secret": Config.GOOGLE_CLIENT_SECRET,
                        "scopes": SCOPES
                    },
                    "last_login": datetime.utcnow()
                }
            
            db.users.update_one({"_id": user["_id"]}, {"$set": user_data})
            user_id = str(user["_id"])
        else:
            user_data = {
                "email": email,
                "name": name,
                "picture": picture,
                "google_tokens": {
                    "access_token": access_token,
                    "refresh_token": encrypted_refresh_token,
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "client_id": Config.GOOGLE_CLIENT_ID,
                    "client_secret": Config.GOOGLE_CLIENT_SECRET,
                    "scopes": SCOPES
                },
                "last_login": datetime.utcnow(),
                "xp": 0,
                "level": 1,
                "badges": [],
                "created_at": datetime.utcnow()
            }
            result = db.users.insert_one(user_data)
            user_id = str(result.inserted_id)

        # Create JWT for Frontend
        access_token = create_access_token(data={"sub": user_id})
        
        # Redirect to frontend with token (In a real app, use a safe way to pass this)
        frontend_url = "http://localhost:5173/login?token=" + access_token
        return RedirectResponse(url=frontend_url)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return RedirectResponse(url="http://localhost:5173/login?error=auth_failed")

@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found or session expired")
            
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", ""),
            "picture": user.get("picture", ""),
            "xp": user.get("xp", 0),
            "level": user.get("level", 1),
            "streak": user.get("streak", 1),
            "google_connected": "google_tokens" in user
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

@router.put("/profile")
async def update_profile(request: Request, user_id: str = Depends(get_current_user)):
    data = await request.json()
    db = get_db()
    
    update_fields = {}
    if "name" in data: update_fields["name"] = data["name"]
    if "picture" in data: update_fields["picture"] = data["picture"]
    
    if update_fields:
        db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
        
    return {"status": "success", "message": "Profile updated"}
