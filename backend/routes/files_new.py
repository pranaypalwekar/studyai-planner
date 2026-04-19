from fastapi import APIRouter, Depends, HTTPException, Response, Query
from fastapi.responses import StreamingResponse, JSONResponse
from googleapiclient.discovery import build
import os
import io
import PyPDF2
from google import genai
import traceback
from pydantic import BaseModel
from typing import Optional

from models import get_db
from bson import ObjectId
from routes.auth_new import get_current_user

router = APIRouter()

# Supported Gemini model
GEMINI_MODEL = "gemini-2.0-flash"

# Simple in-memory cache for extracted text (keyed by file_id)
text_cache: dict[str, str] = {}


def get_google_credentials(user_id: str):
    """Retrieve and refresh Google credentials from DB."""
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user or "google_tokens" not in user:
        return None

    tokens = user["google_tokens"]

    from config import Config
    from cryptography.fernet import Fernet
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request as GoogleRequest

    decrypted_refresh = None
    if tokens.get("refresh_token"):
        f = Fernet(Config.FERNET_KEY)
        try:
            decrypted_refresh = f.decrypt(tokens.get("refresh_token").encode()).decode()
        except Exception:
            decrypted_refresh = tokens.get("refresh_token")

    creds = Credentials(
        token=tokens.get("access_token"),
        refresh_token=decrypted_refresh,
        token_uri=tokens.get("token_uri"),
        client_id=tokens.get("client_id"),
        client_secret=tokens.get("client_secret"),
        scopes=tokens.get("scopes"),
    )

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleRequest())
            db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"google_tokens.access_token": creds.token}},
            )
        except Exception:
            pass

    return creds


def get_drive_service(user_id: str):
    creds = get_google_credentials(user_id)
    if not creds:
        return None
    return build("drive", "v3", credentials=creds)


# ─── ROUTE: Download file ───────────────────────────────────────────────────────
# NOTE: Specific paths MUST come before the wildcard /{file_id} route.

@router.get("/download/{file_id}")
async def download_file(file_id: str, user_id: str = Depends(get_current_user)):
    """Download a Drive file and stream it to the client."""
    service = get_drive_service(user_id)
    if not service:
        # Fallback to public Drive download URL
        fallback_url = f"https://drive.google.com/uc?export=download&id={file_id}"
        return JSONResponse({"status": "fallback", "url": fallback_url})

    try:
        file_meta = service.files().get(
            fileId=file_id, fields="name, mimeType"
        ).execute()
        mime_type = file_meta.get("mimeType", "application/octet-stream")
        name = file_meta.get("name", "downloaded_file")

        if "application/vnd.google-apps" in mime_type:
            # Google Docs/Sheets/Slides → export as PDF
            export_mime = "application/pdf"
            req = service.files().export_media(fileId=file_id, mimeType=export_mime)
            ext = ".pdf"
        else:
            req = service.files().get_media(fileId=file_id)
            ext = ""

        file_bytes = req.execute()

        return Response(
            content=file_bytes,
            media_type=mime_type if not ext else "application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{name}{ext}"',
                "Content-Length": str(len(file_bytes)),
            },
        )
    except Exception as e:
        traceback.print_exc()
        # Fallback to public download link
        fallback_url = f"https://drive.google.com/uc?export=download&id={file_id}"
        return JSONResponse({"status": "fallback", "url": fallback_url})


# ─── ROUTE: Extract text content from file ─────────────────────────────────────

@router.get("/content/{file_id}")
async def get_file_content(
    file_id: str, user_id: str = Depends(get_current_user)
):
    """Extract text from a Google Drive file (PDF, Docs, Slides, plain text)."""
    if file_id in text_cache:
        return {"status": "success", "content": text_cache[file_id]}

    service = get_drive_service(user_id)
    if not service:
        raise HTTPException(status_code=401, detail="Google Drive not connected")

    try:
        file_meta = service.files().get(
            fileId=file_id, fields="name, mimeType"
        ).execute()
        mime_type = file_meta.get("mimeType", "")

        text_content = ""

        if "application/vnd.google-apps.document" in mime_type:
            req = service.files().export_media(fileId=file_id, mimeType="text/plain")
            text_content = req.execute().decode("utf-8", errors="ignore")

        elif "application/vnd.google-apps.presentation" in mime_type:
            req = service.files().export_media(fileId=file_id, mimeType="text/plain")
            text_content = req.execute().decode("utf-8", errors="ignore")

        elif "application/pdf" in mime_type:
            req = service.files().get_media(fileId=file_id)
            pdf_bytes = req.execute()
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            for page in pdf_reader.pages:
                t = page.extract_text()
                if t:
                    text_content += t + "\n"

        elif "text/" in mime_type:
            req = service.files().get_media(fileId=file_id)
            text_content = req.execute().decode("utf-8", errors="ignore")

        else:
            return {
                "status": "error",
                "message": f"Unsupported file format for text extraction: {mime_type}",
            }

        # Cache and return (limit payload size)
        text_cache[file_id] = text_content
        return {"status": "success", "content": text_content[:50000]}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


# ─── ROUTE: AI query using file content ────────────────────────────────────────

class AIQueryRequest(BaseModel):
    file_id: str
    question: Optional[str] = ""
    action: str = "chat"  # chat | summarize | key_points | explain_simply


@router.post("/query")
async def ai_query(data: AIQueryRequest, user_id: str = Depends(get_current_user)):
    """Answer a question or run an action using the content of a Drive file."""
    # Try cache first
    file_content = text_cache.get(data.file_id, "")

    if not file_content:
        # Fetch and extract text on-demand
        try:
            result = await get_file_content(data.file_id, user_id)
            if isinstance(result, dict) and result.get("status") == "success":
                file_content = result.get("content", "")
        except Exception:
            pass

    if not file_content:
        raise HTTPException(
            status_code=400,
            detail="Could not retrieve file content. The file may be inaccessible or in an unsupported format.",
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    try:
        client = genai.Client(api_key=api_key)

        # Chunk large content
        truncated = file_content[:20000]

        if data.action == "summarize":
            prompt = f"Summarize the following document in 3-5 clear paragraphs:\n\n{truncated}"
        elif data.action == "key_points":
            prompt = f"Extract the most important key points from this document as a numbered list:\n\n{truncated}"
        elif data.action == "explain_simply":
            prompt = f"Explain the core concepts of this document simply, as if explaining to a high school student:\n\n{truncated}"
        else:
            prompt = (
                f"You are an AI tutor. Answer the user's question using ONLY the information "
                f"from the provided document. If the answer isn't in the document, say so.\n\n"
                f"Document:\n{truncated}\n\n"
                f"User Question: {data.question}"
            )

        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        return {"status": "success", "answer": response.text}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")


# ─── ROUTE: Get file metadata ───────────────────────────────────────────────────
# This MUST be last because /{file_id} is a wildcard that would catch everything above.

@router.get("/{file_id}")
async def get_file_metadata(
    file_id: str, user_id: str = Depends(get_current_user)
):
    """Return metadata for a Google Drive file."""
    service = get_drive_service(user_id)
    if not service:
        raise HTTPException(status_code=401, detail="Google Drive not connected")

    try:
        file_meta = service.files().get(
            fileId=file_id,
            fields="id, name, mimeType, webViewLink, webContentLink, size",
        ).execute()
        return {"status": "success", "file": file_meta}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
