// Shared UI kit. Reuse these everywhere so every screen has one visual style.

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { formatEUR } from "@/lib/client/format";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ children, className, ...rest }: ComponentProps<"div">) {
  // Tailwind can't guarantee which of two bg-* classes wins, so a caller's background replaces the default.
  const customBg = className?.split(/\s+/).some((c) => c.startsWith("bg-"));
  return (
    <div className={cx("rounded-2xl p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-line", !customBg && "bg-surface", className)} {...rest}>
      {children}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-sm",
  secondary: "bg-surface text-ink ring-1 ring-line hover:bg-canvas",
  ghost: "text-brand hover:bg-brand-soft",
};
const BTN = "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant = "primary", className, ...rest }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cx(BTN, VARIANTS[variant], className)} {...rest} />;
}

export function ButtonLink({ variant = "primary", className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(BTN, VARIANTS[variant], className)} {...rest} />;
}

type Tone = "neutral" | "brand" | "positive" | "info";
const TONES: Record<Tone, string> = {
  neutral: "bg-canvas text-muted ring-line",
  brand: "bg-brand-soft text-brand ring-brand/15",
  positive: "bg-positive-soft text-positive ring-positive/15",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between first:mt-0">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

/** EUR amount in nl-BE style; green for incoming, default for outgoing. */
export function Amount({
  value,
  direction,
  className,
}: {
  value: number;
  direction?: "in" | "out";
  className?: string;
}) {
  const sign = direction === "in" ? "+ " : direction === "out" ? "− " : "";
  return (
    <span className={cx("tabular whitespace-nowrap", direction === "in" && "text-positive", className)}>
      {sign}
      {formatEUR(direction ? Math.abs(value) : value)}
    </span>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-10 text-center ring-1 ring-line">
      {icon && <div className="mb-3 text-subtle">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState title="Something went wrong">
      <p>We couldn&apos;t load this right now.</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </EmptyState>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-shimmer rounded-xl bg-line/70", className)} />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

export { cx };
