"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, FileText, Zap, Brain } from "lucide-react";

interface Props {
  onLaunch: (apiKey: string) => void;
}

const features = [
  { icon: FileText, label: "PDF, TXT & CSV", desc: "Upload any document" },
  { icon: Brain, label: "Gemini 2.5 Flash", desc: "State-of-the-art AI" },
  { icon: Zap, label: "Instant RAG", desc: "Vectorized retrieval" },
];

export default function Landing({ onLaunch }: Props) {
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");

  const handleLaunch = () => {
    if (!key.trim()) { setErr("Please enter your Google API key."); return; }
    if (key.length < 20) { setErr("That doesn't look like a valid API key."); return; }
    onLaunch(key.trim());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(200,169,110,0.12) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(61,139,110,0.1) 0%, transparent 70%)" }}
        />
      </div>

      {/* Logo mark */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="mb-8 relative"
      >
        <div className="relative w-20 h-20 mx-auto">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, transparent 60%, rgba(200,169,110,0.6) 100%)",
              padding: "1px",
            }}
          />
          <div className="absolute inset-[2px] rounded-full bg-ink flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-genie" />
          </div>
        </div>
      </motion.div>

      {/* Hero text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="text-center mb-3"
      >
        <h1
          className="text-6xl md:text-8xl font-light tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Know<span className="text-genie italic">Genie</span>
        </h1>
        <p className="text-paper-muted text-lg md:text-xl font-light max-w-md mx-auto leading-relaxed">
          Ask anything about your documents. Powered by Gemini 2.5 retrieval intelligence.
        </p>
      </motion.div>

      {/* Features row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-6 mb-12 mt-6 flex-wrap justify-center"
      >
        {features.map(({ icon: Icon, label, desc }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-2 text-sm text-paper-muted"
          >
            <div className="w-7 h-7 rounded-lg bg-ink-soft border border-ink-muted flex items-center justify-center">
              <Icon className="w-3.5 h-3.5 text-genie" />
            </div>
            <div>
              <div className="text-paper text-xs font-medium">{label}</div>
              <div className="text-xs opacity-60">{desc}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* API Key card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="w-full max-w-md relative"
      >
        <div
          className="relative rounded-2xl p-[1px] glow-genie"
          style={{
            background: "linear-gradient(135deg, rgba(200,169,110,0.3) 0%, rgba(61,139,110,0.2) 50%, rgba(200,169,110,0.1) 100%)",
          }}
        >
          <div className="rounded-2xl bg-ink-soft p-6">
            <label className="block text-xs text-paper-muted font-medium uppercase tracking-widest mb-3">
              Google API Key
            </label>
            <div className="flex gap-3">
              <input
                type="password"
                placeholder="AIza..."
                value={key}
                onChange={(e) => { setKey(e.target.value); setErr(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLaunch()}
                className="flex-1 bg-ink border border-ink-muted rounded-xl px-4 py-3 text-sm text-paper placeholder-paper-muted/40 outline-none focus:border-genie/50 focus:ring-1 focus:ring-genie/20 transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLaunch}
                className="px-5 py-3 rounded-xl text-ink font-medium text-sm flex items-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, #c8a96e, #a07840)" }}
              >
                Enter
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>

            {err && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-red-400"
              >
                {err}
              </motion.p>
            )}

            <p className="mt-3 text-xs text-paper-muted/50 leading-relaxed">
              Your key is used only in this session and never stored.{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-genie/70 hover:text-genie underline underline-offset-2 transition-colors"
              >
                Get a free key →
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
