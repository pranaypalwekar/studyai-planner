import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

load_dotenv()

class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/studyai")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback-secret-key-for-dev")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # Needs to be a valid 32 url-safe base64-encoded bytes (Fernet key)
    FERNET_KEY_STR = os.getenv("FERNET_KEY", b"vY-k9Tq7L92u9sC6tZ7I5gE1O1W9vL2U3B4N5M6X7y8=".decode())
    FERNET_KEY = FERNET_KEY_STR.encode() if isinstance(FERNET_KEY_STR, str) else FERNET_KEY_STR
    
    # Force hot-reload trigger
    PORT = int(os.getenv("PORT", 5000))
    DEBUG = True
