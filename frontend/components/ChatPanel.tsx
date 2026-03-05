"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, PanelLeftOpen, PanelLeftClose, Sparkles,
  BookOpen, Copy, Check, ChevronDown, Loader2
} from "lucide-react";
import { DocumentInfo, askQuestion } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { preview: string }[];
  ts: Date;
}

interface Props {
  apiKey: string;
  activeDoc: DocumentInfo | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const suggestions = [
  "Summarize the key points of this document",
  "What are the main topics covered?",
  "Find any dates or numbers mentioned",
  "What conclusions does the document reach?",
];

function UserBubble({ msg }: { msg: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-end mb-6"
    >
      <div
        className="max-w-[65%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
        style={{ background: "linear-gradient(135deg, rgba(200,169,110,0.2), rgba(160,120,64,0.15))", border: "1px solid rgba(200,169,110,0.2)" }}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

function AssistantBubble({ msg }: { msg: Message }) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Strip source block from rendered text (already parsed separately)
  const mainText = msg.content.split("\n\n---\n")[0];
  const hasSources = msg.sources && msg.sources.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 mb-6 group"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-ink-soft border border-ink-muted flex items-center justify-center mt-1">
        <Sparkles className="w-3.5 h-3.5 text-genie" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="rounded-2xl rounded-tl-sm bg-ink-soft border border-ink-muted px-4 py-3 relative">
          <div
            className="chat-prose text-sm leading-relaxed text-paper/90 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: formatContent(mainText) }}
          />

          {/* Copy btn */}
          <button
            onClick={copy}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-paper-muted/40 hover:text-paper-muted transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-jade" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Sources toggle */}
        {hasSources && (
          <div className="mt-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-[11px] text-paper-muted/50 hover:text-genie transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              {msg.sources!.length} source{msg.sources!.length > 1 ? "s" : ""}
              <ChevronDown className={`w-3 h-3 transition-transform ${showSources ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showSources && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-1.5 overflow-hidden"
                >
                  {msg.sources!.map((s, i) => (
                    <div key={i} className="rounded-lg bg-ink border border-ink-muted px-3 py-2">
                      <p className="text-[11px] text-paper-muted/70 font-mono leading-relaxed">{s.preview}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <p className="text-[10px] text-paper-muted/30 mt-1.5 ml-1">
          {msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

function ThinkingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 mb-6"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-ink-soft border border-ink-muted flex items-center justify-center mt-1">
        <Loader2 className="w-3.5 h-3.5 text-genie animate-spin" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-ink-soft border border-ink-muted px-4 py-3">
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              className="block w-1.5 h-1.5 rounded-full bg-genie/60"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Simple markdown-ish formatter
function formatContent(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/^- (.+)/gm, "• $1")
    .replace(/\n/g, "<br>");
}

export default function ChatPanel({ apiKey, activeDoc, sidebarOpen, onToggleSidebar }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = useCallback(async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || thinking) return;
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: q, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    try {
      const result = await askQuestion(q, apiKey);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        ts: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ ${err instanceof Error ? err.message : "Something went wrong. Is the backend running?"}`,
        ts: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking, apiKey]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="h-full flex flex-col bg-ink">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-ink-muted flex-shrink-0">
        <button
          onClick={onToggleSidebar}
          className="text-paper-muted/50 hover:text-paper-muted transition-colors"
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2 min-w-0">
          {activeDoc ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-jade animate-pulse_soft" />
              <span className="text-sm text-paper-muted truncate max-w-xs">{activeDoc.name}</span>
            </>
          ) : (
            <span className="text-sm text-paper-muted/40 italic">No document selected</span>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="h-full flex flex-col items-center justify-center text-center"
          >
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="mb-6">
              <div className="w-16 h-16 rounded-2xl bg-ink-soft border border-ink-muted flex items-center justify-center mx-auto glow-genie">
                <Sparkles className="w-7 h-7 text-genie" />
              </div>
            </motion.div>

            <h2 className="text-2xl font-light text-paper mb-2" style={{ fontFamily: "var(--font-display)" }}>
              {activeDoc ? "What would you like to know?" : "Upload a document to begin"}
            </h2>
            <p className="text-sm text-paper-muted/50 mb-8 max-w-sm leading-relaxed">
              {activeDoc
                ? `Ask anything about "${activeDoc.name}"`
                : "Use the sidebar to upload a PDF, TXT, or CSV file"}
            </p>

            {activeDoc && (
              <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
                {suggestions.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    onClick={() => send(s)}
                    className="text-left text-xs text-paper-muted/70 bg-ink-soft border border-ink-muted rounded-xl px-4 py-3 hover:border-genie/30 hover:bg-genie/5 hover:text-paper-muted transition-all leading-relaxed"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <AnimatePresence>
              {messages.map((msg) =>
                msg.role === "user"
                  ? <UserBubble key={msg.id} msg={msg} />
                  : <AssistantBubble key={msg.id} msg={msg} />
              )}
              {thinking && <ThinkingBubble key="thinking" />}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-ink-muted">
        <div className="max-w-2xl mx-auto">
          <div
            className={`relative flex items-end gap-3 rounded-2xl border transition-all ${
              activeDoc
                ? "border-ink-muted hover:border-genie/30 focus-within:border-genie/40 focus-within:shadow-[0_0_20px_rgba(200,169,110,0.08)]"
                : "border-ink-muted opacity-50"
            } bg-ink-soft px-4 py-3`}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
              }}
              onKeyDown={handleKeyDown}
              disabled={!activeDoc || thinking}
              placeholder={activeDoc ? "Ask about your document… (Enter to send)" : "Upload a document first"}
              className="flex-1 bg-transparent text-sm text-paper placeholder-paper-muted/30 outline-none resize-none leading-relaxed max-h-40 overflow-y-auto"
              style={{ minHeight: "24px" }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => send()}
              disabled={!input.trim() || thinking || !activeDoc}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: input.trim() && !thinking ? "linear-gradient(135deg, #c8a96e, #a07840)" : "#2a2a32" }}
            >
              {thinking
                ? <Loader2 className="w-4 h-4 text-paper animate-spin" />
                : <Send className="w-3.5 h-3.5 text-ink" />
              }
            </motion.button>
          </div>
          <p className="text-[10px] text-paper-muted/25 text-center mt-2">
            KnowGenie may make mistakes. Always verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
