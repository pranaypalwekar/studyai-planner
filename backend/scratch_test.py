import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

try:
    print("Trying with gemini-2.0-flash...")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents="Hello"
    )
    print("Success 2.0:", response.text)
except Exception as e:
    print("Error 2.0:", e)

try:
    print("\nTrying with gemini-1.5-flash...")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents="Hello"
    )
    print("Success 1.5:", response.text)
except Exception as e:
    print("Error 1.5:", e)
