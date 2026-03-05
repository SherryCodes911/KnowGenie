"""
debug_retrieval.py — See exactly what chunks are retrieved for any query.
Run: python debug_retrieval.py
"""
import asyncio
import nest_asyncio
nest_asyncio.apply()
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS

FAISS_PATH = "./faiss_index"

api_key = input("Paste your Google API key: ").strip()

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=api_key,
)

db = FAISS.load_local(FAISS_PATH, embeddings, allow_dangerous_deserialization=True)

print(f"\n✅ Index loaded. Total chunks: {db.index.ntotal}")
print("─" * 60)

while True:
    query = input("\nEnter a query (or 'quit'): ").strip()
    if query.lower() == "quit":
        break

    # Test with k=1,4,8 to see what's available
    for k in [1, 4, 8]:
        results = db.similarity_search_with_score(query, k=k)
        print(f"\n── Top {k} results ──")
        for i, (doc, score) in enumerate(results, 1):
            print(f"  [{i}] score={score:.4f} | {doc.page_content[:200].replace(chr(10), ' ')}")