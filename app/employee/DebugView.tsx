"use client";

import { useRouter } from "next/navigation";
import { Card, LoadState } from "@/components/Card";
import { getDebugEvents, logout } from "@/lib/client/api";
import { EVENT_LABELS } from "@/lib/client/format";
import { useApi } from "@/lib/client/useApi";

const TIER_STYLE = {
  direct: "bg-brand text-white",
  soft: "bg-amber-100 text-amber-800",
  none: "bg-canvas text-muted",
} as const;

export function DebugView() {
  const router = useRouter();
  const { data, loading, error } = useApi(getDebugEvents);

  return (
    <>
      <header className="flex items-center justify-between bg-ink px-5 pb-4 pt-5 text-white">
        <div>
          <p className="text-xs opacity-70">KBC employee · dev only</p>
          <p className="text-lg font-semibold">Detection debug</p>
        </div>
        <button
          onClick={async () => {
            await logout().catch(() => undefined);
            router.replace("/login");
          }}
          className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium"
        >
          Log out
        </button>
      </header>
      <main className="flex flex-col gap-3 px-4 py-5">
        <LoadState loading={loading} error={error} />
        {data?.map((r) => (
          <Card key={r.customerId}>
            <p className="font-semibold">
              {r.customerName} <span className="text-xs font-normal text-muted">· consent {r.consent}</span>
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {r.scores.map((s) => (
                <div key={s.type} className="rounded-xl bg-canvas p-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{EVENT_LABELS[s.type]}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_STYLE[s.tier]}`}>
                      {(s.confidence * 100).toFixed(1)}% · {s.status}
                    </span>
                  </div>
                  {s.evidence.length > 0 && (
                    <ul className="mt-1.5 text-xs text-muted">
                      {s.evidence.map((e) => (
                        <li key={e.signal}>
                          ×{e.likelihoodRatio} — {e.signal}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </main>
    </>
  );
}
