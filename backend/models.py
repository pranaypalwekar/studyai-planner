from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
import mongomock
import os
from config import Config

client = None
db = None

def init_db(uri=None):
    global client, db
    if not uri:
        uri = Config.MONGO_URI
    
    # Try connecting to real MongoDB
    try:
        import certifi
        temp_client = MongoClient(uri, serverSelectionTimeoutMS=10000, tlsCAFile=certifi.where())
        temp_client.server_info() # Force connection check
        client = temp_client
        print(f"[OK] Successfully connected to native MongoDB!")
    except Exception as e:
        print(f"[WARN] MongoDB not found running locally or connection failed. Error: {e}")
        print("[WARN] Falling back to in-memory Mongomock database!")
        client = mongomock.MongoClient()

    db_name = uri.split('/')[-1]
    if '?' in db_name:
        db_name = db_name.split('?')[0]
    
    if not db_name:
        db_name = "studyai"
        
    db = client[db_name]
    return db

def get_db():
    global db
    if db is None:
        init_db()
    return db
