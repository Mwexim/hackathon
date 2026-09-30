import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Moments",
  description: "Proof of concept: consent-aware life-moment detection in mobile banking.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#e30613" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
