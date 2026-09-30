import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Moments",
  description: "Proof of concept: consent-aware life-moment detection in mobile banking.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#d6202f" };

/** Phone-width frame, centred on desktop. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen sm:py-6">
        <div className="relative mx-auto flex min-h-screen w-full max-w-[420px] flex-col overflow-hidden bg-canvas sm:min-h-[calc(100vh-3rem)] sm:rounded-[2rem] sm:shadow-2xl sm:ring-1 sm:ring-black/5">
          {children}
        </div>
      </body>
    </html>
  );
}
