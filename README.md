# KnowGenie

A retrieval-augmented generation (RAG) application that enables natural language querying over uploaded documents. Built with Gemini 2.5 Flash, FAISS vector storage, FastAPI, and Next.js.

---

## Architecture

```
knowgenie/
├── backend/
│   ├── server.py             # FastAPI REST API
│   ├── vectors.py            # Document loading, chunking, FAISS indexing
│   ├── chatbot.py            # Gemini 2.5 RAG retrieval chain
│   ├── app.py                # Streamlit interface (standalone alternative)
│   └── requirements.txt
│
└── frontend/
    ├── app/                  # Next.js app router
    ├── components/
    │   ├── Landing.tsx       # API key entry screen
    │   ├── AppShell.tsx      # Layout
    │   ├── Sidebar.tsx       # File upload and document list
    │   └── ChatPanel.tsx     # Chat interface
    └── lib/api.ts            # Backend API calls
```

**Stack:** Python 3.10+, FastAPI, LangChain, Google Generative AI, FAISS, Next.js 14, Tailwind CSS, Framer Motion

---

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- A Google AI Studio API key — [get one free](https://aistudio.google.com/app/apikey)

---

## Installation

**Backend**

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

**Frontend**

```bash
cd frontend
npm install
```

---

## Running the Application

Two terminal processes are required.

**Terminal 1 — API server**

```bash
cd backend
uvicorn server:app --reload --port 8000
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

1. Enter your Google API key on the landing screen.
2. Upload a document (PDF, TXT, or CSV) using the sidebar.
3. Wait for the embedding process to complete. Progress is displayed in real time.
4. Ask questions about the document in the chat interface.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | Upload a document |
| POST | `/embed` | Start background embedding |
| GET | `/embed/status/{filename}` | Poll embedding status |
| POST | `/chat` | Submit a query |
| GET | `/documents` | List uploaded documents |
| DELETE | `/documents/{id}` | Remove a document |

Interactive API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## Supported File Types

| Format | Loader | Chunking Strategy |
|--------|--------|-------------------|
| PDF | PyPDFLoader | RecursiveCharacterTextSplitter (800 tokens, 100 overlap) |
| TXT | TextLoader | RecursiveCharacterTextSplitter (800 tokens, 100 overlap) |
| CSV | CSVLoader | One document per row |

---

## Rate Limits

The free tier of the Gemini Embedding API allows 100 requests per minute. The pipeline batches chunks in groups of 8 with a 0.7-second delay between batches, keeping throughput at approximately 68 RPM. For larger files or higher throughput, enabling billing on Google AI Studio removes this constraint.

---

## Troubleshooting

**Embedding fails with a 429 error**
The free tier rate limit has been reached. The system will automatically retry after a 20-second cooldown. If failures persist, reduce `BATCH_SIZE` in `vectors.py` or enable billing.

**"Failed to fetch" on upload**
Confirm the backend is running on port 8000 and that `npm run dev` was restarted after any changes to `next.config.js`.

**Chatbot returns no results**
The FAISS index must exist before the chatbot loads. Ensure embedding completed successfully before submitting a query.

**Port conflict**
Change the port in the uvicorn command and update the proxy destination in `frontend/next.config.js` accordingly.

---

## Alternative Interface

The original Streamlit interface remains functional as a standalone option:

```bash
cd backend
streamlit run app.py
```

Available at [http://localhost:8501](http://localhost:8501).

---

## License

MIT