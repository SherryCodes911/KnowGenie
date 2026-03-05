import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KnowGenie — AI Document Intelligence",
  description: "Chat with your documents using Gemini 2.5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="mesh-bg antialiased">{children}</body>
    </html>
  );
}
