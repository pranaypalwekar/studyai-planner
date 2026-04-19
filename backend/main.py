import uvicorn
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from config import Config
from models import init_db

# Import all FastAPI-compatible routers
from routes.auth_new import router as auth_router
from routes.classroom_new import router as classroom_router
from routes.flashcards_new import router as flashcards_router
from routes.meet_new import router as meet_router
from routes.pomodoro_new import router as pomodoro_router
from routes.study_new import router as study_router
from routes.ai_tutor_new import router as ai_tutor_router
from routes.files_new import router as files_router

# Initialize App
app = FastAPI(
    title="StudyAI API",
    description="The intelligent backend powering StudyAI Planner",
    version="1.1.0"
)

# CORS Configuration
# Ensure frontend (usually port 5173) can communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database on Startup
@app.on_event("startup")
async def startup_db_client():
    init_db()

# ─── MAIN API ROUTER (Prefix: /api) ──────────────────────────────────────────

api_router = APIRouter()

@api_router.get("/")
async def api_root():
    """
    Test route for the base /api endpoint.
    This ensures that http://localhost:5000/api does not return 404.
    """
    return {
        "status": "success",
        "message": "StudyAI API is online and healthy.",
        "version": "1.1.0",
        "documentation": "/docs"
    }

# Include all sub-routers with their respective prefixes
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(classroom_router, prefix="/classroom", tags=["Classroom"])
api_router.include_router(flashcards_router, prefix="/flashcards", tags=["Flashcards"])
api_router.include_router(meet_router, prefix="/meet", tags=["Virtual Meet"])
api_router.include_router(pomodoro_router, prefix="/pomodoro", tags=["Study Timer"])
api_router.include_router(study_router, prefix="/study", tags=["Study Planner"])
api_router.include_router(ai_tutor_router, prefix="/ai", tags=["AI Tutor"])
api_router.include_router(files_router, prefix="/file", tags=["Files"])
# Also mount files router under /ai prefix so /api/ai/query works for frontend
api_router.include_router(files_router, prefix="/ai", tags=["AI File Query"])

# Finally, mount the main api_router into the app with the /api prefix
app.include_router(api_router, prefix="/api")

# ─── GLOBAL ROUTES ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """System-level health check."""
    return {"status": "ok", "message": "Backend server is running."}

@app.get("/")
async def root():
    """Landing page or redirect."""
    return {"message": "Welcome to StudyAI Backend. Visit /api for the API root or /docs for API documentation."}

if __name__ == "__main__":
    # Start the server
    # Port is typically 5000 as per Config.PORT
    uvicorn.run("main:app", host="0.0.0.0", port=Config.PORT, reload=Config.DEBUG)
