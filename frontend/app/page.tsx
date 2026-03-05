"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Landing from "@/components/Landing";
import AppShell from "@/components/AppShell";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [launched, setLaunched] = useState(false);

  if (!launched) {
    return <Landing onLaunch={(key) => { setApiKey(key); setLaunched(true); }} />;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="app"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-screen"
      >
        <AppShell apiKey={apiKey} />
      </motion.div>
    </AnimatePresence>
  );
}
