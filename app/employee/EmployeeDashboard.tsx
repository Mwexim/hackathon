"use client";

import { ChevronDown, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Skeleton, cx } from "@/components/ui";
import { explainMath, getDebugEvents, getEmployeeOverview, logout, resetDemo } from "@/lib/client/api";
import { EVENT_LABELS, formatLikelihood, formatPercent } from "@/lib/client/format";
import type { DebugCustomerReport, EmployeeOverview, MathExplanation } from "@/lib/types";

export function EmployeeDashboard({ devTools }: { devTools: boolean }) {
  const [threshold, setThreshold] = useState(0.5);
  const [overview, setOverview] = useState<EmployeeOverview | null>(null);
  const [error, setError] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    const t = setTimeout(() => {
      getEmployeeOverview(threshold)
        .then((o) => id === reqId.current && (setOverview(o), setError(false)))
        .catch(() => id === reqId.current && setError(true));
    }, 150); // debounce the slider
    return () => clearTimeout(t);
  }, [threshold]);

  async function onLogout() {
    await logout().catch(() => undefined);
    window.location.assign("/login");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-black">LM</span>
            <div>
              <p className="font-semibold">Life Moments — detection quality</p>
              <p className="text-xs text-white/60">KBC employee view · synthetic population</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm hover:bg-white/10">
            <LogOut size={16} aria-hidden /> Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && <p className="mb-4 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">Could not load the overview.</p>}
        {!overview ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 md:col-span-3" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">
              <span className="tabular">{overview.totalCustomers.toLocaleString("en-US")}</span> customers scanned in{" "}
              <span className="tabular text-brand">{Math.round(overview.runtimeMs)} ms</span>
            </h1>
            <p className="mt-2 flex items-center gap-2 text-muted">
              <ShieldCheck size={18} className="text-positive" aria-hidden />
              Every detection is explainable and needs customer confirmation before anything changes.
            </p>

            <Card className="mt-6 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <label htmlFor="threshold" className="text-sm font-semibold">
                  Question threshold
                </label>
                <input
                  id="threshold"
                  type="range"
                  min={0.3}
                  max={0.95}
                  step={0.05}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="flex-1 accent-[var(--color-brand)]"
                />
                <span className="tabular w-14 rounded-lg bg-canvas px-2 py-1 text-center font-semibold">{threshold.toFixed(2)}</span>
              </div>
              <p className="mt-2 text-xs text-muted">
                Higher = fewer, surer questions (precision up, recall down). The live app asks directly from 0.85 and softly from 0.50.
              </p>
            </Card>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {overview.perEvent.map((e) => (
                <Card key={e.type} className="p-5">
                  <p className="text-sm font-semibold text-muted">{EVENT_LABELS[e.type]}</p>
                  <p className="tabular mt-1 text-3xl font-semibold">{e.detected}</p>
                  <p className="text-xs text-muted">would be asked · {e.planted} planted</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Metric label="Precision" value={e.precision} />
                    <Metric label="Recall" value={e.recall} />
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <p className="font-semibold">Precision / recall by threshold</p>
                <CurveChart curve={overview.thresholdCurve} current={threshold} />
              </Card>
              <Card className="p-5">
                <p className="font-semibold">Confidence distribution</p>
                <p className="text-xs text-muted">Customer × life-event pairs with at least one signal</p>
                <Histogram data={overview.confidenceHistogram} threshold={threshold} />
              </Card>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <p className="font-semibold">Actions we would show</p>
                <p className="text-xs text-muted">After confirmation, filtered by each customer&apos;s consent</p>
                <SplitBar
                  parts={[
                    { label: "Protect existing contract", value: overview.actionsByKind.service, className: "bg-positive" },
                    { label: "Commercial offer", value: overview.actionsByKind.commercial, className: "bg-brand" },
                  ]}
                />
              </Card>
              <Card className="p-5">
                <p className="font-semibold">Consent mix</p>
                <p className="text-xs text-muted">What customers allow us to show</p>
                <SplitBar
                  parts={[
                    { label: "Contracts only", value: overview.consentMix.none, className: "bg-ink" },
                    { label: "Light", value: overview.consentMix.basic, className: "bg-subtle" },
                    { label: "Personal", value: overview.consentMix.tailored, className: "bg-brand" },
                  ]}
                />
              </Card>
            </div>
          </>
        )}

        {devTools && <DemoTools />}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular text-lg font-semibold">{formatPercent(value)}</p>
      <div className="mt-1 h-1.5 rounded-full bg-line">
        <div className="h-1.5 rounded-full bg-brand transition-all duration-300" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

function CurveChart({ curve, current }: { curve: EmployeeOverview["thresholdCurve"]; current: number }) {
  const W = 480, H = 200, P = 32;
  const x = (t: number) => P + ((t - 0.3) / 0.65) * (W - 2 * P);
  const y = (v: number) => H - P - v * (H - 2 * P);
  const path = (k: "precision" | "recall") => curve.map((c, i) => `${i ? "L" : "M"}${x(c.threshold)},${y(c[k])}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Precision and recall curve">
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line x1={P} x2={W - P} y1={y(v)} y2={y(v)} stroke="var(--color-line)" />
          <text x={P - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="var(--color-muted)">{v * 100}%</text>
        </g>
      ))}
      {[0.3, 0.5, 0.7, 0.9].map((t) => (
        <text key={t} x={x(t)} y={H - 10} fontSize="10" textAnchor="middle" fill="var(--color-muted)">{t.toFixed(1)}</text>
      ))}
      <line x1={x(current)} x2={x(current)} y1={P - 8} y2={H - P} stroke="var(--color-ink)" strokeDasharray="3 3" />
      <path d={path("recall")} fill="none" stroke="var(--color-ink)" strokeWidth="2.5" />
      <path d={path("precision")} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" />
      <g fontSize="11" fontWeight="600">
        <rect x={W - P - 150} y={6} width="10" height="10" rx="2" fill="var(--color-brand)" />
        <text x={W - P - 135} y={15} fill="var(--color-ink)">Precision</text>
        <rect x={W - P - 70} y={6} width="10" height="10" rx="2" fill="var(--color-ink)" />
        <text x={W - P - 55} y={15} fill="var(--color-ink)">Recall</text>
      </g>
    </svg>
  );
}

function Histogram({ data, threshold }: { data: EmployeeOverview["confidenceHistogram"]; threshold: number }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="mt-4 flex h-44 items-end gap-1.5">
      {data.map((d, i) => (
        <div key={d.bucket} className="flex flex-1 flex-col items-center gap-1">
          <span className="tabular text-[10px] text-muted">{d.count}</span>
          <div
            className={cx("w-full rounded-t-md transition-colors", (i + 1) / 10 > threshold ? "bg-brand" : "bg-line")}
            style={{ height: `${(d.count / max) * 120}px` }}
            title={`${d.bucket}: ${d.count}`}
          />
          <span className="tabular text-[10px] text-muted">{(i / 10).toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

function SplitBar({ parts }: { parts: { label: string; value: number; className: string }[] }) {
  const total = Math.max(1, parts.reduce((s, p) => s + p.value, 0));
  return (
    <div className="mt-4">
      <div className="flex h-4 overflow-hidden rounded-full">
        {parts.map((p) => (
          <div key={p.label} className={cx(p.className, "transition-all duration-300")} style={{ width: `${(p.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5 text-sm">
            <span className={cx("h-2.5 w-2.5 rounded-sm", p.className)} />
            {p.label} <span className="tabular font-semibold">{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dev-only demo tools: explain the math for a demo customer, reset the demo.
// ---------------------------------------------------------------------------

function DemoTools() {
  const [reports, setReports] = useState<DebugCustomerReport[] | null>(null);
  const [selected, setSelected] = useState("customer_001");
  const [math, setMath] = useState<MathExplanation | null>(null);
  const [open, setOpen] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    getDebugEvents().then(setReports).catch(() => setReports([]));
  }, [version]);
  useEffect(() => {
    setMath(null);
    explainMath(selected).then(setMath).catch(() => setMath(null));
  }, [selected, version]);

  async function onReset() {
    setResetting(true);
    setMessage(null);
    try {
      await resetDemo();
      setVersion((v) => v + 1);
      setMessage("Demo reset — all customers are back to their initial state.");
    } catch {
      setMessage("Reset failed.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <section className="mt-10 border-t border-line pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Demo customers</h2>
          <p className="text-sm text-muted">Development only — hidden in production.</p>
        </div>
        <Button variant="secondary" onClick={onReset} disabled={resetting}>
          <RotateCcw size={16} aria-hidden /> {resetting ? "Resetting…" : "Reset demo"}
        </Button>
      </div>
      {message && <p className="mt-3 text-sm font-medium text-positive">{message}</p>}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {reports?.map((r) => {
          const top = [...r.scores].sort((a, b) => b.confidence - a.confidence)[0];
          return (
            <button key={r.customerId} onClick={() => setSelected(r.customerId)} className="text-left">
              <Card className={cx("transition", selected === r.customerId ? "ring-2 ring-brand" : "hover:ring-brand/30")}>
                <p className="font-semibold">{r.customerName}</p>
                <p className="text-xs text-muted">consent: {r.consent}</p>
                <p className="mt-2 text-sm">
                  {top.confidence >= 0.5 ? EVENT_LABELS[top.type] : "No life moment"}{" "}
                  <span className="tabular text-muted">· {formatLikelihood(top.confidence)}</span>
                </p>
                <p className="text-xs text-muted">{top.status.replace("_", " ")}</p>
              </Card>
            </button>
          );
        })}
      </div>

      <Card className="mt-4 p-0">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between px-5 py-4 font-semibold">
          Explain the math{math ? ` — ${math.customerName}` : ""}
          <ChevronDown size={18} className={cx("transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {open && math && (
          <div className="grid gap-4 border-t border-line p-5 lg:grid-cols-3">
            {math.events.map((e) => (
              <div key={e.type} className="rounded-xl bg-canvas p-4 text-sm">
                <p className="font-semibold">{EVENT_LABELS[e.type]}</p>
                <p className="tabular mt-2 text-muted">
                  prior {e.prior} → odds {e.priorOdds}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {e.signals.length === 0 && <li className="text-muted">No signals present</li>}
                  {e.signals.map((s) => (
                    <li key={s.signal} className={cx("flex justify-between gap-2", !s.counted && "text-subtle line-through")}>
                      <span>
                        {s.signal} <span className="text-xs text-subtle">({s.group})</span>
                      </span>
                      <span className="tabular font-semibold">×{s.likelihoodRatio}</span>
                    </li>
                  ))}
                </ul>
                <div className="tabular mt-3 border-t border-line pt-2">
                  <p>
                    odds = {e.priorOdds} × {e.signals.filter((s) => s.counted).map((s) => s.likelihoodRatio).join(" × ") || "1"} ={" "}
                    <b>{e.odds}</b>
                  </p>
                  <p>
                    confidence = odds / (1 + odds) = <b className={e.confidence >= 0.5 ? "text-brand" : ""}>{e.confidence}</b>{" "}
                    <span className="text-muted">({e.tier === "none" ? "no question" : `${e.tier} question`})</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
