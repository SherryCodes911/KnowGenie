// lib/api.ts
// All requests go to /api/backend/* which Next.js proxies to localhost:8000
// This avoids Chrome blocking cross-port requests from localhost:3000 → localhost:8000

export const BASE_URL = "/api/backend";

export interface UploadResult {
  success: boolean;
  message: string;
  filename?: string;
}

export interface EmbedResult {
  success: boolean;
  message: string;
  chunks?: number;
}

export interface ChatResult {
  answer: string;
  sources?: { preview: string }[];
}

export interface DocumentInfo {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: "ready" | "embedding" | "error";
}

// ─── Upload a document ────────────────────────────────────────────────────────
export async function uploadDocument(
  file: File,
  apiKey: string,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);

  let pct = 0;
  const ticker = setInterval(() => {
    pct = Math.min(pct + 10, 90);
    onProgress?.(pct);
  }, 200);

  try {
    const res = await fetch(`${BASE_URL}/upload`, {
      method: "POST",
      body: form,
    });

    clearInterval(ticker);
    onProgress?.(100);

    if (!res.ok) {
      let detail = res.statusText;
      try { const body = await res.json(); detail = body.detail ?? body.message ?? detail; } catch {}
      throw new Error(`Upload failed: ${detail}`);
    }

    return res.json();
  } catch (err) {
    clearInterval(ticker);
    throw err;
  }
}

// ─── Create embeddings for an uploaded file ───────────────────────────────────
export async function createEmbeddings(
  filename: string,
  apiKey: string
): Promise<EmbedResult> {
  const res = await fetch(`${BASE_URL}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, api_key: apiKey }),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { const body = await res.json(); detail = body.detail ?? body.message ?? detail; } catch {}
    throw new Error(`Embed failed: ${detail}`);
  }
  return res.json();
}

// ─── Ask a question ───────────────────────────────────────────────────────────
export async function askQuestion(
  query: string,
  apiKey: string
): Promise<ChatResult> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, api_key: apiKey }),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { const body = await res.json(); detail = body.detail ?? body.message ?? detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

// ─── List uploaded documents ──────────────────────────────────────────────────
export async function listDocuments(apiKey: string): Promise<DocumentInfo[]> {
  const res = await fetch(`${BASE_URL}/documents?api_key=${encodeURIComponent(apiKey)}`);
  if (!res.ok) return [];
  return res.json();
}

// ─── Delete a document ────────────────────────────────────────────────────────
export async function deleteDocument(
  docId: string,
  apiKey: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/documents/${docId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}