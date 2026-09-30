"use client";

import { Check, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Card, ErrorState, PageTitle, SectionTitle, SkeletonList, cx } from "@/components/ui";
import { getCustomer, updateConsent } from "@/lib/client/api";
import { useApi } from "@/lib/client/useApi";
import type { ConsentLevel, Customer } from "@/lib/types";

const CONSENT: { level: ConsentLevel; title: string; will: string; wont: string }[] = [
  {
    level: "none",
    title: "Only what protects my contracts",
    will: "We only point out things that keep your existing insurance and accounts right.",
    wont: "No offers, ever.",
  },
  {
    level: "basic",
    title: "Light suggestions",
    will: "We protect your contracts first, and may add one relevant suggestion.",
    wont: "No more than one offer per life moment.",
  },
  {
    level: "tailored",
    title: "Personal proposals",
    will: "We protect your contracts first, then show proposals that fit your situation.",
    wont: "Never before you've confirmed what changed.",
  },
];

const PROACTIVITY: { level: Customer["consent"]["proactivityLevel"]; label: string; hint: string }[] = [
  { level: "low", label: "Low", hint: "Only ask when we're quite sure something changed." },
  { level: "medium", label: "Medium", hint: "Ask when it seems likely something changed." },
  { level: "high", label: "High", hint: "Feel free to check in with me when something may have changed." },
];

export default function SettingsPage() {
  const { data, loading, error, reload } = useApi(getCustomer);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [local, setLocal] = useState<Customer | null>(null);
  const customer = local ?? data;

  async function save(update: Parameters<typeof updateConsent>[0]) {
    if (!customer) return;
    const previous = customer;
    setLocal({ ...customer, consent: { ...customer.consent, ...update } }); // optimistic
    setSaving(true);
    setSaved(false);
    try {
      setLocal(await updateConsent(update));
      setSaved(true);
    } catch {
      setLocal(previous); // rollback
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorState onRetry={reload} />;
  if (loading || !customer) return <SkeletonList />;

  const proactivity = PROACTIVITY.find((p) => p.level === customer.consent.proactivityLevel)!;

  return (
    <div className="animate-fade-in">
      <PageTitle title="How proactive may KBC be?" subtitle="You decide what we do with what we notice." />

      <SectionTitle>What we may show you</SectionTitle>
      <div role="radiogroup" aria-label="Consent level" className="flex flex-col gap-2.5">
        {CONSENT.map((c) => {
          const active = customer.consent.marketing === c.level;
          return (
            <button
              key={c.level}
              role="radio"
              aria-checked={active}
              disabled={saving}
              onClick={() => !active && save({ marketing: c.level })}
              className="text-left"
            >
              <Card className={cx("flex gap-3 transition", active ? "ring-2 ring-brand" : "hover:ring-brand/30")}>
                <span
                  className={cx(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2",
                    active ? "bg-brand text-white ring-brand" : "ring-line",
                  )}
                >
                  {active && <Check size={13} strokeWidth={3} aria-hidden />}
                </span>
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="mt-1 text-sm text-muted">{c.will}</p>
                  <p className="mt-0.5 text-sm text-muted">{c.wont}</p>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      <SectionTitle>How often may we check in?</SectionTitle>
      <div role="radiogroup" aria-label="Proactivity" className="grid grid-cols-3 rounded-full bg-surface p-1 ring-1 ring-line">
        {PROACTIVITY.map((p) => {
          const active = customer.consent.proactivityLevel === p.level;
          return (
            <button
              key={p.level}
              role="radio"
              aria-checked={active}
              disabled={saving}
              onClick={() => !active && save({ proactivityLevel: p.level })}
              className={cx(
                "rounded-full py-2 text-sm font-semibold transition-colors",
                active ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-sm text-muted">{proactivity.hint}</p>

      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-positive-soft p-4 text-sm text-positive">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden />
        <p>
          You can change this at any time. KBC always asks before acting.
          <span className="mt-1 block text-positive/80">We never use health-related payments to detect life moments.</span>
        </p>
      </div>
      <p aria-live="polite" className="mt-3 h-5 text-center text-xs text-muted">
        {saving ? "Saving…" : saved ? "Saved" : ""}
      </p>
    </div>
  );
}
