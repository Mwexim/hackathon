"use client";

import { CircleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/** Minimal error toast: const { toast, showToast } = useToast(); render {toast}. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  const showToast = useCallback((m: string) => setMessage(m), []);

  const toast = message ? (
    <div role="alert" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div className="animate-fade-in flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <CircleAlert size={16} aria-hidden /> {message}
      </div>
    </div>
  ) : null;

  return { toast, showToast };
}
