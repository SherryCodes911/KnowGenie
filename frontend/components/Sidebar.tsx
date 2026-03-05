"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, FileSpreadsheet, File, Trash2, CheckCircle2,
  AlertCircle, Loader2, Sparkles, RefreshCw, X
} from "lucide-react";
import { DocumentInfo, uploadDocument, createEmbeddings, deleteDocument } from "@/lib/api";

interface Props {
  apiKey: string;
  docs: DocumentInfo[];
  setDocs: React.Dispatch<React.SetStateAction<DocumentInfo[]>>;
  activeDoc: DocumentInfo | null;
  setActiveDoc: (doc: DocumentInfo | null) => void;
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return <FileSpreadsheet className="w-4 h-4 text-jade" />;
  if (ext === "pdf") return <FileText className="w-4 h-4 text-genie" />;
  return <File className="w-4 h-4 text-paper-muted" />;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function Sidebar({ apiKey, docs, setDocs, activeDoc, setActiveDoc }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadMsg, setUploadMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const allowed = ["pdf", "txt", "csv"];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowed.includes(ext)) {
      setUploadMsg("❌ Unsupported file type. Use PDF, TXT, or CSV.");
      return;
    }

    setUploading(true);
    setUploadPct(0);
    setUploadMsg("Uploading…");

    // Optimistic entry
    const tempDoc: DocumentInfo = {
      id: `tmp-${Date.now()}`,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: "embedding",
    };
    setDocs((prev) => [tempDoc, ...prev]);

    try {
      // 1. Upload
      const upResult = await uploadDocument(file, apiKey, setUploadPct);
      setUploadMsg("Creating embeddings…");

      // 2. Embed
      const embedResult = await createEmbeddings(upResult.filename ?? file.name, apiKey);
      const chunks = embedResult.chunks ?? 0;

      const readyDoc: DocumentInfo = {
        ...tempDoc,
        id: upResult.filename ?? tempDoc.id,
        status: "ready",
      };
      setDocs((prev) => prev.map((d) => (d.id === tempDoc.id ? readyDoc : d)));
      setActiveDoc(readyDoc);
      setUploadMsg(`✅ ${chunks} chunks ready`);
    } catch (err: unknown) {
      setDocs((prev) =>
        prev.map((d) => d.id === tempDoc.id ? { ...d, status: "error" } : d)
      );
      setUploadMsg(`❌ ${err instanceof Error ? err.message : "Upload failed"}`);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMsg(""), 4000);
    }
  }, [apiKey, setDocs, setActiveDoc]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDelete = async (doc: DocumentInfo) => {
    try {
      await deleteDocument(doc.id, apiKey);
    } catch { /* ignore if backend doesn't support */ }
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    if (activeDoc?.id === doc.id) setActiveDoc(null);
  };

  return (
    <div className="h-full flex flex-col bg-ink-soft">
      {/* Header */}
      <div className="px-5 py-5 border-b border-ink-muted flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center glow-genie">
          <Sparkles className="w-4 h-4 text-genie" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-paper" style={{ fontFamily: "var(--font-display)" }}>
            KnowGenie
          </h1>
          <p className="text-xs text-paper-muted/60">Gemini 2.5 Flash</p>
        </div>
      </div>

      {/* Drop zone */}
      <div className="px-4 pt-4">
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          animate={{ borderColor: dragging ? "rgba(200,169,110,0.6)" : "rgba(42,42,50,1)" }}
          className="relative rounded-xl border-2 border-dashed border-ink-muted p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors hover:border-genie/30 hover:bg-genie/5 group"
        >
          <input ref={inputRef} type="file" accept=".pdf,.txt,.csv" className="hidden" onChange={onFileChange} />

          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 w-full">
                <Loader2 className="w-7 h-7 text-genie animate-spin" />
                <div className="w-full bg-ink-muted rounded-full h-1 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #c8a96e, #a07840)" }}
                    animate={{ width: `${uploadPct}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-paper-muted">{uploadMsg || `${uploadPct}%`}</p>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-1 text-center">
                <Upload className="w-6 h-6 text-genie/60 group-hover:text-genie transition-colors" />
                <p className="text-xs font-medium text-paper-muted">Drop file or click to upload</p>
                <p className="text-[10px] text-paper-muted/50">PDF · TXT · CSV</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {uploadMsg && !uploading && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-center mt-2 text-paper-muted">
            {uploadMsg}
          </motion.p>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] uppercase tracking-widest text-paper-muted/60 font-medium">
            Documents
          </h2>
          {docs.length > 0 && (
            <span className="text-[10px] text-paper-muted/40 bg-ink-muted rounded-full px-2 py-0.5">
              {docs.length}
            </span>
          )}
        </div>

        <AnimatePresence>
          {docs.length === 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-paper-muted/40 text-center py-8">
              No documents yet
            </motion.p>
          )}

          {docs.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={() => doc.status === "ready" && setActiveDoc(doc)}
              className={`group relative flex items-start gap-3 p-3 rounded-xl mb-2 cursor-pointer transition-all ${
                activeDoc?.id === doc.id
                  ? "bg-genie/10 border border-genie/20"
                  : "hover:bg-ink-muted/50 border border-transparent"
              } ${doc.status !== "ready" ? "opacity-60 cursor-default" : ""}`}
            >
              <div className="mt-0.5">{fileIcon(doc.name)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-paper truncate">{doc.name}</p>
                <p className="text-[10px] text-paper-muted/50 mt-0.5">{formatBytes(doc.size)}</p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1">
                {doc.status === "embedding" && <Loader2 className="w-3.5 h-3.5 text-genie animate-spin" />}
                {doc.status === "ready" && <CheckCircle2 className="w-3.5 h-3.5 text-jade" />}
                {doc.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}

                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                  className="opacity-0 group-hover:opacity-100 ml-1 text-paper-muted/40 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-ink-muted">
        <p className="text-[10px] text-paper-muted/30 text-center">
          KnowGenie · Gemini 2.5 RAG
        </p>
      </div>
    </div>
  );
}
