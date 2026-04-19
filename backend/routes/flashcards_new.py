from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
import datetime
import os
import traceback
import json

from models import get_db
from routes.auth_new import get_current_user

router = APIRouter()

# ─── Pydantic Models ─────────────────────────────────────────────────────────

class FlashcardBase(BaseModel):
    front: str
    back: str

class DeckCreate(BaseModel):
    title: str
    subject: Optional[str] = "General"
    cards: Optional[List[FlashcardBase]] = []

class GenerateRequest(BaseModel):
    topic: str
    count: Optional[int] = 8
    context: Optional[str] = ""

class StudyTipsRequest(BaseModel):
    subject: Optional[str] = "General"
    difficulty: Optional[str] = "Medium"

# ─── Helpers ───────────────────────────────────────────────────────────────

def _get_decks_collection():
    db = get_db()
    return db.flashcard_decks

# ─── Routes ───────────────────────────────────────────────────────────────

@router.get("/decks")
async def get_decks(user_id: str = Depends(get_current_user)):
    """List all flashcard decks for the current user."""
    try:
        collection = _get_decks_collection()
        decks = list(collection.find({"user_id": user_id}))
        
        for deck in decks:
            deck['_id'] = str(deck['_id'])
        
        return {"status": "success", "decks": decks}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

@router.post("/decks")
async def create_deck(data: DeckCreate, user_id: str = Depends(get_current_user)):
    """Create a new flashcard deck manually."""
    try:
        deck = {
            "user_id": user_id,
            "title": data.title,
            "subject": data.subject,
            "cards": [c.dict() for c in data.cards],
            "created_at": datetime.datetime.utcnow().isoformat(),
            "last_studied": None,
            "mastered_count": 0
        }
        
        collection = _get_decks_collection()
        result = collection.insert_one(deck)
        deck['_id'] = str(result.inserted_id)
        
        return {"status": "success", "deck": deck}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

@router.post("/decks/{deck_id}/cards")
async def add_card(deck_id: str, data: FlashcardBase, user_id: str = Depends(get_current_user)):
    """Add a card to an existing deck."""
    try:
        collection = _get_decks_collection()
        
        new_card = {
            "id": str(ObjectId()),
            "front": data.front,
            "back": data.back,
            "mastered": False,
            "times_reviewed": 0
        }
        
        result = collection.update_one(
            {"_id": ObjectId(deck_id), "user_id": user_id},
            {"$push": {"cards": new_card}}
        )
        
        if result.matched_count == 0:
            return {"error": "Deck not found"}
        
        return {"status": "success", "card": new_card}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

@router.delete("/decks/{deck_id}")
async def delete_deck(deck_id: str, user_id: str = Depends(get_current_user)):
    """Delete a flashcard deck."""
    try:
        collection = _get_decks_collection()
        result = collection.delete_one({"_id": ObjectId(deck_id), "user_id": user_id})
        
        if result.deleted_count == 0:
            return {"error": "Deck not found"}
            
        return {"status": "success", "message": "Deck deleted"}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

@router.post("/generate")
async def generate_flashcards(data: GenerateRequest, user_id: str = Depends(get_current_user)):
    """Use Gemini AI to generate flashcards from a topic."""
    try:
        topic = data.topic
        count = min(int(data.count), 15)
        context = data.context
        
        api_key = os.getenv("GEMINI_API_KEY")
        
        if api_key:
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
                
                context_str = f"\n\nContext to use for generation:\n{context}" if context else ""
                prompt = f"Generate exactly {count} flashcards for studying: {topic}{context_str}" + """
                
Return ONLY a valid JSON array, nothing else. Each flashcard object must have "front" (question) and "back" (answer) keys.
Keep questions clear and concise. Keep answers brief but accurate (1-3 sentences max).
Example format: [{"front": "What is X?", "back": "X is..."}]"""
                
                response = client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=prompt
                )
                
                raw = response.text.strip()
                if raw.startswith("```json"):
                    raw = raw[7:]
                if raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()
                
                cards = json.loads(raw)
                
                # Add IDs and metadata to each card
                for i, card in enumerate(cards):
                    card['id'] = f"gen_{i}_{datetime.datetime.utcnow().timestamp()}"
                    card['mastered'] = False
                    card['times_reviewed'] = 0
                
                return {"status": "success", "cards": cards, "topic": topic}
                
            except Exception as e:
                traceback.print_exc()
        
        # Fallback mock flashcards
        mock_cards = [
            {"id": "mock_1", "front": f"What is {topic}?", "back": f"{topic} is a fundamental concept in its field of study.", "mastered": False, "times_reviewed": 0},
            {"id": "mock_2", "front": f"What are the key principles of {topic}?", "back": f"The key principles include foundational theories, core formulas, and practical applications.", "mastered": False, "times_reviewed": 0},
            {"id": "mock_3", "front": f"How is {topic} applied in practice?", "back": f"{topic} is applied through problem-solving, experimentation, and real-world scenarios.", "mastered": False, "times_reviewed": 0},
            {"id": "mock_4", "front": f"What are common mistakes when studying {topic}?", "back": f"Common mistakes include not practicing enough, memorizing without understanding, and skipping fundamentals.", "mastered": False, "times_reviewed": 0},
            {"id": "mock_5", "front": f"Name one important formula or rule in {topic}.", "back": f"Refer to your course materials for the specific formula. Focus on understanding derivation, not just memorization.", "mastered": False, "times_reviewed": 0},
        ]
        
        return {"status": "success", "cards": mock_cards[:count], "topic": topic}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

@router.post("/study_tips")
async def get_study_tips(data: StudyTipsRequest, user_id: str = Depends(get_current_user)):
    """Generate personalized study technique recommendations."""
    try:
        subject = data.subject
        difficulty = data.difficulty
        
        api_key = os.getenv("GEMINI_API_KEY")
        
        if api_key:
            try:
                from google import genai
                client = genai.Client(api_key=api_key)
                
                prompt = f"""You are StudyAI, an expert study coach. The student needs study technique recommendations for: {subject} (difficulty: {difficulty}).

Return ONLY valid JSON matching this structure:
{{
  "techniques": [
    {{
      "name": "Technique Name",
      "description": "Brief description",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "best_for": "What this is best for",
      "time_needed": "e.g. 25 min sessions"
    }}
  ],
  "daily_routine": "A suggested daily study routine paragraph",
  "motivation": "A short motivational message"
}}
Provide exactly 4 techniques."""
                
                response = client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=prompt
                )
                
                raw = response.text.strip()
                if raw.startswith("```json"):
                    raw = raw[7:]
                if raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()
                
                result = json.loads(raw)
                return {"status": "success", **result}
                
            except Exception as e:
                traceback.print_exc()
        
        # Fallback study tips
        return {
            "status": "success",
            "techniques": [
                {
                    "name": "Pomodoro Technique",
                    "description": "Study in focused 25-minute blocks with 5-minute breaks. After 4 blocks, take a longer 15-30 minute break.",
                    "steps": ["Set a timer for 25 minutes", "Focus on one task only", "Take a 5-min break", "Repeat 4 times, then long break"],
                    "best_for": "Maintaining focus and avoiding burnout",
                    "time_needed": "25 min sessions"
                },
                {
                    "name": "Active Recall",
                    "description": "Test yourself on the material instead of passively re-reading. Close the book and try to recall key concepts.",
                    "steps": ["Read a section once", "Close the book", "Write down everything you remember", "Check what you missed"],
                    "best_for": "Long-term memory retention",
                    "time_needed": "15-20 min per topic"
                },
                {
                    "name": "Spaced Repetition",
                    "description": "Review material at increasing intervals. Use flashcards and review them on day 1, 3, 7, 14, and 30.",
                    "steps": ["Create flashcards for key concepts", "Review all cards on day 1", "Review missed cards on day 3", "Gradually increase intervals"],
                    "best_for": "Memorizing facts, formulas, and vocabulary",
                    "time_needed": "10-15 min daily"
                },
                {
                    "name": "Feynman Technique",
                    "description": "Explain the concept as if you're teaching it to a 5-year-old. If you can't explain it simply, you don't understand it well enough.",
                    "steps": ["Choose a concept", "Explain it in simple language", "Identify gaps in your explanation", "Go back and study those gaps"],
                    "best_for": "Deep understanding of complex topics",
                    "time_needed": "20-30 min per concept"
                }
            ],
            "daily_routine": f"For {subject}: Start with 10 min of active recall from yesterday's material, then do 2 Pomodoro sessions of new material, followed by 15 min of flashcard review using spaced repetition. End with the Feynman technique on the hardest concept of the day.",
            "motivation": "Every expert was once a beginner. Your consistent effort today is building the knowledge of tomorrow. Keep pushing!"
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}
