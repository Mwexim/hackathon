export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line ${className}`}>{children}</div>;
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

export function Placeholder({ owner, children }: { owner: string; children?: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-line p-3 text-xs text-muted">
      Placeholder — {owner} will build this screen.{children ? " " : ""}
      {children}
    </div>
  );
}

export function LoadState({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <p className="py-6 text-center text-sm text-muted">Loading…</p>;
  if (error) return <p className="py-6 text-center text-sm text-brand">{error}</p>;
  return null;
}
