/* Status chip and state rendering helpers */
export function Status({ value }: { value: string }) {
  return (
    <span className={`status ${value.toLowerCase().replace(/\s+/g, "_")}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

/* Skeleton loaders */
export function SkeletonCard() {
  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div className="skeleton skeleton-h2" />
      <div className="skeleton skeleton-text" style={{ width: "80%" }} />
      <div className="skeleton skeleton-text" style={{ width: "60%" }} />
      <div className="skeleton" style={{ height: 32, borderRadius: 10, marginTop: 8 }} />
    </div>
  );
}

export function SkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="campaign-grid">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* Empty state component */
export function EmptyState({
  icon = "◌",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

/* Coverage bar */
export function CoverageBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="coverage-bar" title={`${Math.round(pct)}% coverage`}>
      <div className="coverage-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* Waveform animation */
export function Waveform({ active }: { active: boolean }) {
  return (
    <div className={`waveform-bars ${active ? "live" : ""}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={
            active
              ? {
                  height: `${8 + Math.random() * 30}px`,
                  transition: "height 0.1s ease",
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

/* Volume meter */
export function VolumeMeter({ level }: { level: number }) {
  // level is dBFS, range -100 to 0
  const pct = Math.max(0, Math.min(100, ((level + 60) / 60) * 100));
  return (
    <div className="volume-meter" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="volume-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
