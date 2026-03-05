"""
server.py — FastAPI REST bridge for KnowGenie Next.js frontend
Run: uvicorn server:app --reload --port 8000

Fixes:
- /embed runs in a thread pool (non-blocking, no timeout on large files)
- Full traceback logged on every 500 error
- Detailed error message returned to frontend
"""

import os
import shutil
import uuid
import traceback
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from vectors import EmbeddingsManager
from chatbot import ChatbotManager

app = FastAPI(title="KnowGenie API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

documents: dict = {}
chatbot_cache: dict = {}


# ─── Models ──────────────────────────────────────────────────────────────────

class EmbedRequest(BaseModel):
    filename: str
    api_key: str

class ChatRequest(BaseModel):
    query: str
    api_key: str

class DeleteRequest(BaseModel):
    api_key: str


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "KnowGenie API"}


# ─── Upload ──────────────────────────────────────────────────────────────────

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    api_key: str = Form(...),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in [".pdf", ".txt", ".csv"]:
        raise HTTPException(400, "Unsupported file type. Use PDF, TXT, or CSV.")

    doc_id = str(uuid.uuid4())[:8]
    safe_name = f"{doc_id}{ext}"
    dest = UPLOAD_DIR / safe_name

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    size = dest.stat().st_size
    print(f"[server] Uploaded: {file.filename} → {safe_name} ({size} bytes)")

    documents[safe_name] = {
        "id": safe_name,
        "name": file.filename,
        "size": size,
        "uploadedAt": datetime.utcnow().isoformat(),
        "status": "uploaded",
        "path": str(dest),
    }

    return {
        "success": True,
        "message": "File uploaded",
        "filename": safe_name,
        "original_name": file.filename,
    }


# ─── Embed ────────────────────────────────────────────────────────────────────

@app.post("/embed")
async def embed_file(req: EmbedRequest):
    doc = documents.get(req.filename)
    if not doc:
        raise HTTPException(404, f"File '{req.filename}' not found. Upload it first.")

    file_path = doc["path"]
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found on disk.")

    def _do_embed():
        mgr = EmbeddingsManager(google_api_key=req.api_key)
        return mgr.create_embeddings(file_path)

    try:
        print(f"[server] Starting embed for: {req.filename}")
        # Run in thread pool so large files don't block the event loop
        result_msg = await run_in_threadpool(_do_embed)

        chunks = 0
        try:
            chunks = int(result_msg.split("with")[1].split("chunks")[0].strip())
        except Exception:
            pass

        documents[req.filename]["status"] = "ready"
        documents[req.filename]["chunks"] = chunks
        chatbot_cache.clear()

        print(f"[server] Embed complete: {chunks} chunks")
        return {"success": True, "message": result_msg, "chunks": chunks}

    except Exception as e:
        tb = traceback.format_exc()
        print(f"[server] EMBED ERROR for {req.filename}:\n{tb}")
        documents[req.filename]["status"] = "error"
        # Return the real error message to the frontend
        raise HTTPException(500, detail=str(e))


# ─── Chat ─────────────────────────────────────────────────────────────────────

@app.post("/chat")
async def chat(req: ChatRequest):
    cache_key = req.api_key[:8]

    def _load_bot():
        return ChatbotManager(google_api_key=req.api_key)

    def _ask(bot):
        return bot.get_response(req.query)

    if cache_key not in chatbot_cache:
        try:
            chatbot_cache[cache_key] = await run_in_threadpool(_load_bot)
        except Exception as e:
            tb = traceback.format_exc()
            print(f"[server] CHATBOT LOAD ERROR:\n{tb}")
            raise HTTPException(500, f"Failed to load chatbot: {e}")

    try:
        raw = await run_in_threadpool(_ask, chatbot_cache[cache_key])
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[server] CHAT ERROR:\n{tb}")
        # Reset cache so next request tries to reload
        chatbot_cache.pop(cache_key, None)
        raise HTTPException(500, str(e))

    parts = raw.split("\n\n---\n")
    answer = parts[0].strip()
    sources = []

    if len(parts) > 1:
        for line in parts[1].strip().splitlines():
            line = line.strip()
            if line and not line.startswith("📎") and not line.startswith("**"):
                clean = line.lstrip("0123456789. ").strip()
                if clean:
                    sources.append({"preview": clean})

    return {"answer": answer, "sources": sources}


# ─── List documents ───────────────────────────────────────────────────────────

@app.get("/documents")
def list_docs(api_key: str = ""):
    return [
        {
            "id": v["id"],
            "name": v["name"],
            "size": v["size"],
            "uploadedAt": v["uploadedAt"],
            "status": v["status"],
        }
        for v in documents.values()
    ]


# ─── Delete ───────────────────────────────────────────────────────────────────

@app.delete("/documents/{doc_id}")
def delete_doc(doc_id: str, req: DeleteRequest):
    doc = documents.get(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    try:
        path = Path(doc["path"])
        if path.exists():
            path.unlink()
    except Exception:
        pass

    del documents[doc_id]
    chatbot_cache.clear()
    return {"success": True}