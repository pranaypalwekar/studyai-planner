from flask import Blueprint, request, jsonify
import os
import json
from dotenv import load_dotenv
from google import genai
import PyPDF2
from io import BytesIO

load_dotenv()

ai_tutor_bp = Blueprint('ai_tutor', __name__)

@ai_tutor_bp.route('/ask', methods=['POST'])
def ask_tutor():
    data = request.get_json()
    question = data.get('question')

    if not question:
        return jsonify({"error": "Question is required"}), 400

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "Gemini API key is not configured"}), 500

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=f"You are StudyAI, an expert, encouraging AI academic tutor. Help the user with this question concisely: {question}"
        )
        return jsonify({"answer": response.text}), 200
    except Exception as e:
        print("Gemini API Error:", str(e))
        return jsonify({"error": f"Gemini error: {str(e)}"}), 500

@ai_tutor_bp.route('/generate_notes', methods=['POST'])
def generate_notes():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "Gemini API key is not configured"}), 500

    topic = request.form.get('topic', '')
    file = request.files.get('file')
    
    extracted_text = ""
    
    if file and file.filename.endswith('.pdf'):
        try:
            pdf_reader = PyPDF2.PdfReader(BytesIO(file.read()))
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
        except Exception as e:
            return jsonify({"error": f"Failed to parse PDF: {str(e)}"}), 400

    if not topic and not extracted_text:
        return jsonify({"error": "Provide a topic or a valid PDF"}), 400

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
            model='gemini-2.5-flash-lite',
            contents=prompt,
        )
        
        # Parse the JSON from the markdown block or direct response
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:-3].strip()
            
        data = json.loads(raw_text)
        return jsonify(data), 200
    except Exception as e:
        print("Gemini JSON Generation Error:", str(e))
        return jsonify({"error": f"Generation failed: {str(e)}"}), 500

