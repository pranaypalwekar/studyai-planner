from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import os
import traceback
import json
import PyPDF2
from io import BytesIO
from google import genai
from models import get_db
from datetime import datetime

from routes.auth_new import get_current_user

router = APIRouter()

# Use a supported Gemini model
GEMINI_MODEL = "gemini-2.0-flash"

class AskRequest(BaseModel):
    question: str

@router.post("/ask")
async def ask_tutor(data: AskRequest, user_id: str = Depends(get_current_user)):
    question = data.question
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured")

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=f"You are StudyAI, an expert, encouraging AI academic tutor. Help the user with this question concisely: {question}"
        )
        return {"answer": response.text}
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Gemini error: {str(e)}"}

@router.post("/generate_notes")
async def generate_notes(
    topic: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_current_user)
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured")

    extracted_text = ""
    
    if file and file.filename.endswith('.pdf'):
        try:
            content = await file.read()
            pdf_reader = PyPDF2.PdfReader(BytesIO(content))
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
        except Exception as e:
            traceback.print_exc()
            return {"error": f"Failed to parse PDF: {str(e)}"}

    if not topic and not extracted_text:
        raise HTTPException(status_code=400, detail="Provide a topic or a valid PDF")

    prompt = f"""
    You are an expert AI tutor for StudyAI. Analyze the following content.
    Topic requested: {topic}
    Document Text Extract (if any): {extracted_text[:4000]}...
    
    Generate a JSON response EXACTLY matching this structure, nothing else:
    {{
      "summary": "A concise 2-3 sentence overview of the topic.",
      "key_points": ["Point 1", "Point 2", "Point 3", "Point 4"],
      "prediction": 85,
      "prediction_text": "Based on the depth of this topic, students typically achieve this baseline score. Focus on XYZ for mastery."
    }}
    Make sure prediction is an integer between 60 and 99.
    """
    
    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
        
        # Parse the JSON from the markdown block or direct response
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
            
        data = json.loads(raw_text)
        return data
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Generation failed: {str(e)}"}

@router.get("/coach_summary")
async def get_coach_summary(user_id: str = Depends(get_current_user)):
    """Generate a personalized coaching summary based on actual synced classroom data."""
    try:
        db = get_db()
        assignments = list(db.assignments.find({"user_id": user_id}).sort("due_date", 1).limit(10))
        courses = list(db.courses.find({"user_id": user_id}))
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {"answer": "Sync your Google Classroom to get a personalized AI coaching summary here!"}

        if not assignments:
            return {"answer": "No assignments found. Sync your Google Classroom to get a personalized AI coaching summary!"}

        # Prepare context for Gemini
        context = "Current Assignments:\n"
        for a in assignments:
            context += f"- {a.get('title')} for {a.get('course_name')} (Due: {a.get('due_date')})\n"
        
        prompt = f"""You are StudyAI, a personalized academic coach. Based on the following assignments from the student's real Google Classroom, 
provide a supportive 2-3 sentence summary/guidance. Mention specific subjects if they have more work. 
Be encouraging but realistic about deadlines.

{context}

Response should be a clear, human-like paragraph."""

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )
        
        return {"answer": response.text.strip()}
    except Exception as e:
        traceback.print_exc()
        return {"answer": "I'm ready to analyze your classroom data! Just hit sync to get started."}
