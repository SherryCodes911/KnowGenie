"""
vectors.py — EmbeddingsManager for Gemini 2.5 RAG Pipeline
Tuned for 1–5 MB files on free tier (100 RPM limit).
- BATCH_SIZE=8, DELAY=0.7s → ~68 RPM (safely under 100 RPM)
- Retry on 429 with 20s cooldown
"""

import os
import time
import asyncio
import traceback
import nest_asyncio

from langchain_community.document_loaders import PyPDFLoader, TextLoader, CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS

nest_asyncio.apply()
try:
    loop = asyncio.get_event_loop()
except RuntimeError:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

FAISS_PATH      = "./faiss_index"
CHUNK_SIZE      = 800
CHUNK_OVERLAP   = 100
BATCH_SIZE      = 8     # 8 chunks/call × ~8.5 calls/min = ~68 RPM (free tier safe)
BATCH_DELAY     = 0.7   # seconds between batches
RETRY_ATTEMPTS  = 4
RETRY_DELAY     = 20    # seconds to wait after a 429 rate-limit hit


class EmbeddingsManager:
    def __init__(self, google_api_key: str):
        self.faiss_path = FAISS_PATH
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=google_api_key,
        )

    def _load_file(self, file_path: str):
        ext = os.path.splitext(file_path)[-1].lower()
        print(f"[vectors] Loading {ext} file: {file_path}")

        if ext == ".pdf":
            loader = PyPDFLoader(file_path)
        elif ext == ".txt":
            loader = TextLoader(file_path, encoding="utf-8")
        elif ext == ".csv":
            loader = CSVLoader(
                file_path=file_path,
                encoding="utf-8",
                csv_args={"delimiter": ","},
            )
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        docs = loader.load()
        if not docs:
            raise ValueError(f"No content loaded from {file_path}")
        print(f"[vectors] Loaded {len(docs)} raw document(s)")
        return docs

    def _split_documents(self, docs, ext: str):
        if ext == ".csv":
            # Each CSV row is already its own document — don't re-split
            return docs

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        splits = splitter.split_documents(docs)
        print(f"[vectors] Split into {len(splits)} chunk(s)")
        return splits

    def _embed_in_batches(self, splits) -> FAISS:
        total = len(splits)
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
        est_secs = int(total_batches * BATCH_DELAY)
        print(f"[vectors] Embedding {total} chunks in {total_batches} batches (~{est_secs}s)...")

        vectorstore = None

        for i in range(0, total, BATCH_SIZE):
            batch = splits[i : i + BATCH_SIZE]
            batch_num = i // BATCH_SIZE + 1

            print(f"[vectors] Batch {batch_num}/{total_batches} ({len(batch)} chunks)...")

            for attempt in range(1, RETRY_ATTEMPTS + 1):
                try:
                    if vectorstore is None:
                        vectorstore = FAISS.from_documents(batch, self.embeddings)
                    else:
                        vectorstore.merge_from(
                            FAISS.from_documents(batch, self.embeddings)
                        )
                    break  # success — next batch

                except Exception as e:
                    err = str(e)
                    is_rate_limit = "429" in err or "quota" in err.lower() or "rate" in err.lower()
                    print(f"[vectors] Batch {batch_num} attempt {attempt} failed: {err}")

                    if attempt < RETRY_ATTEMPTS:
                        wait = RETRY_DELAY if is_rate_limit else 5
                        print(f"[vectors] Waiting {wait}s before retry...")
                        time.sleep(wait)
                    else:
                        raise RuntimeError(
                            f"Batch {batch_num} failed after {RETRY_ATTEMPTS} attempts: {err}"
                        )

            # Pace calls to stay under 100 RPM
            if i + BATCH_SIZE < total:
                time.sleep(BATCH_DELAY)

        if vectorstore is None:
            raise RuntimeError("No embeddings were created.")

        return vectorstore

    def create_embeddings(self, file_path: str) -> str:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            ext = os.path.splitext(file_path)[-1].lower()
            docs = self._load_file(file_path)
            splits = self._split_documents(docs, ext)

            if not splits:
                raise ValueError("No text chunks created. Check your file content.")

            vectorstore = self._embed_in_batches(splits)
            vectorstore.save_local(self.faiss_path)

            msg = f"✅ Vector index created with {len(splits)} chunks → saved to '{self.faiss_path}'"
            print(f"[vectors] {msg}")
            return msg

        except Exception as e:
            print(f"[vectors] ERROR:\n{traceback.format_exc()}")
            raise