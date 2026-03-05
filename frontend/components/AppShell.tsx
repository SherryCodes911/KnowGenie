"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";
import { DocumentInfo } from "@/lib/api";

interface Props { apiKey: string; }

export default function AppShell({ apiKey }: Props) {
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex overflow-hidden bg-ink text-paper">
      {/* Sidebar */}
      <motion.div
        animate={{ width: sidebarOpen ? 300 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-shrink-0 overflow-hidden border-r border-ink-muted"
      >
        <div className="w-[300px] h-full">
          <Sidebar
            apiKey={apiKey}
            docs={docs}
            setDocs={setDocs}
            activeDoc={activeDoc}
            setActiveDoc={setActiveDoc}
          />
        </div>
      </motion.div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatPanel
          apiKey={apiKey}
          activeDoc={activeDoc}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
    </div>
  );
}
