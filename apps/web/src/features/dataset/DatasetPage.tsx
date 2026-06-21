import { useState, useEffect } from "react";
import { api } from "../api";
import { useToast } from "../../shared/ui/Toast";
import { Status, EmptyState } from "../../shared/ui/components";
import type { Dataset } from "../../types/domain";

interface CoverageData {
  total_items: number;
  accepted_items: number;
  review_pending_items: number;
  need_retake_items: number;
  open_items: number;
  coverage_ratio: number;
  by_emotion?: Record<string, { total: number; accepted: number }>;
}

interface Props {
  campaignId: string;
}

export function DatasetPage({ campaignId }: Props) {
  const { toast } = useToast();
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("voiceturk.dataset") || "null");
    } catch {
      return null;
    }
  });
  const [verifyResult, setVerifyResult] = useState<string>("");
  const [building, setBuilding] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loadingCov, setLoadingCov] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    setLoadingCov(true);
    api
      .coverage(campaignId)
      .then((cov) => setCoverage(cov as unknown as CoverageData))
      .catch(() => {})
      .finally(() => setLoadingCov(false));
  }, [campaignId]);

  async function build() {
    if (!campaignId) return;
    setBuilding(true);
    try {
      const result = await api.build(campaignId);
      setDataset(result);
      sessionStorage.setItem("voiceturk.dataset", JSON.stringify(result));
      toast(`Dataset built: ${result.sample_count} accepted samples.`, "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBuilding(false);
    }
  }

  async function verify() {
    if (!dataset) return;
    setVerifying(true);
    try {
      const result = await api.verify(dataset.dataset_version_id, dataset.manifest_hash);
      setVerifyResult(result.result);
      toast(
        `Manifest verification: ${result.result}`,
        result.result === "MATCH" ? "success" : "error",
      );
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setVerifying(false);
    }
  }

  if (!campaignId) {
    return (
      <section className="section">
        <p className="eyebrow">STEP 4 · DATASET EXPORT</p>
        <h2>Package accepted voice data</h2>
        <EmptyState
          icon="📦"
          title="No campaign selected"
          description="Select an active campaign in the Campaign tab first, then build your dataset."
        />
      </section>
    );
  }

  const acceptedPct =
    coverage && coverage.total_items > 0
      ? Math.round((coverage.accepted_items / coverage.total_items) * 100)
      : 0;
  const isReady = (coverage?.accepted_items ?? 0) > 0;

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">STEP 4 · DATASET EXPORT</p>
          <h2>Package accepted voice data</h2>
          <p className="section-copy muted">
            Build a reproducible dataset package from ACCEPTED samples only. Verify manifest integrity with the stored hash.
          </p>
        </div>
      </div>

      {/* Coverage summary */}
      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 16 }}>Campaign coverage</p>
        {loadingCov ? (
          <div style={{ display: "flex", gap: 12 }}>
            {[100, 120, 100, 100].map((w, i) => (
              <div key={i} className="skeleton" style={{ height: 72, flex: 1, borderRadius: 12 }} />
            ))}
          </div>
        ) : coverage ? (
          <div className="coverage-stats">
            <div className="stat-box">
              <div className="stat-value highlight">{acceptedPct}%</div>
              <div className="stat-label">Coverage</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{coverage.accepted_items}</div>
              <div className="stat-label">Accepted</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{coverage.review_pending_items}</div>
              <div className="stat-label">Review pending</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{coverage.need_retake_items}</div>
              <div className="stat-label">Needs retake</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{coverage.open_items}</div>
              <div className="stat-label">Open</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{coverage.total_items}</div>
              <div className="stat-label">Total items</div>
            </div>
          </div>
        ) : (
          <p className="muted">Could not load coverage data.</p>
        )}

        {coverage?.by_emotion && Object.keys(coverage.by_emotion).length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", marginBottom: 10 }}>
              BY EMOTION
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {Object.entries(coverage.by_emotion).map(([emotion, data]) => {
                const pct = data.total > 0 ? Math.round((data.accepted / data.total) * 100) : 0;
                return (
                  <div key={emotion} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.82rem" }}>
                    <span style={{ width: 100, color: "var(--text-2)", fontWeight: 600 }}>{emotion}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 4, background: "var(--line)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))", borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                    <span style={{ color: "var(--muted)", width: 60, textAlign: "right" }}>{data.accepted}/{data.total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Build & verify */}
      <div className="grid-2">
        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 12 }}>Build dataset</p>
          <h3>Version 1.0</h3>
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: 8, marginBottom: 20 }}>
            Packages only ACCEPTED samples with annotations, quality report, data card, manifest, and license.
          </p>

          {!isReady && (
            <div className="notice warning" style={{ marginBottom: 16 }}>
              At least one accepted sample is required before building.
            </div>
          )}

          <button onClick={build} disabled={building || !isReady}>
            {building ? "Building…" : "Build dataset package"}
          </button>

          {dataset && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Status value={dataset.status} />
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {dataset.sample_count} sample{dataset.sample_count !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="dataset-files">
                {["annotations.jsonl", "quality_report.json", "data_card.md", "manifest.json", "license.json"].map((f) => (
                  <div key={f} className="dataset-file">
                    <span className="dataset-file-icon">📄</span>
                    {f}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Manifest hash</p>
                <code>{dataset.manifest_hash}</code>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <p className="eyebrow" style={{ marginBottom: 12 }}>Verify integrity</p>
          <h3>Manifest check</h3>
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: 8, marginBottom: 20 }}>
            Re-compute the stored manifest hash and confirm it matches. MATCH means the dataset is unmodified.
          </p>

          {!dataset && (
            <div className="notice" style={{ marginBottom: 16 }}>
              Build a dataset first to enable verification.
            </div>
          )}

          <button className="secondary" onClick={verify} disabled={verifying || !dataset}>
            {verifying ? "Verifying…" : "Verify manifest"}
          </button>

          {verifyResult && (
            <div
              className={`verify-result ${verifyResult === "MATCH" ? "match" : "mismatch"}`}
              style={{ marginTop: 20 }}
            >
              {verifyResult === "MATCH" ? "✓ MATCH" : "✕ MISMATCH"}
              <p style={{ fontSize: "0.8rem", fontWeight: 400, marginTop: 8 }}>
                {verifyResult === "MATCH"
                  ? "Dataset integrity confirmed. No modifications detected."
                  : "Hash mismatch detected. The dataset may have been altered."}
              </p>
            </div>
          )}

          {dataset && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Dataset ID</p>
              <code style={{ fontSize: "0.7rem" }}>{dataset.dataset_version_id}</code>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
