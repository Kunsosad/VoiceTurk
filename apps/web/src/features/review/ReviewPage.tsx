import { useState } from "react";
import { api } from "../api";
import { useToast } from "../../shared/ui/Toast";
import { Status, EmptyState } from "../../shared/ui/components";
import type { Sample, RecordingItem } from "../../types/domain";
import { apiUrl } from "../../shared/api/httpClient";

interface Props {
  campaignId: string;
  samples: Sample[];
  retakes: RecordingItem[];
  onRefresh: () => Promise<void>;
}

export function ReviewPage({ campaignId, samples, retakes, onRefresh }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function decide(id: string, decision: string) {
    setBusy(id);
    try {
      await api.review(id, decision);
      toast(
        `${decision === "ACCEPT" ? "Accepted" : decision === "NEED_RETAKE" ? "Retake requested" : "Rejected"} — sample updated.`,
        decision === "ACCEPT" ? "success" : decision === "NEED_RETAKE" ? "warning" : "error",
      );
      await onRefresh();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function processAndRefresh() {
    setRefreshing(true);
    try {
      const result = await api.runDeepCheck();
      toast(`DeepCheck: ${result.processed} processed, ${result.pending} pending.`, "info");
      await onRefresh();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">STEP 3 · REVIEW & RETAKE</p>
          <h2>Self-review your samples</h2>
          <p className="section-copy muted">
            Listen to each recording and decide: accept, request a retake, or reject. Only ACCEPTED samples are included in the dataset.
          </p>
        </div>
        <button
          className="secondary"
          onClick={processAndRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Processing…" : "⟳ Process & refresh"}
        </button>
      </div>

      {retakes.length > 0 && (
        <div className="retake-banner">
          ⚠ {retakes.length} item{retakes.length !== 1 ? "s" : ""} need{retakes.length === 1 ? "s" : ""} a retake recording. Return to the Recording Studio — the coach will handle them automatically.
        </div>
      )}

      {samples.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No samples waiting for review"
          description="DeepCheck may still be processing, or all samples have already been reviewed. Click 'Process & refresh' to run pending checks."
          action={
            <button className="secondary" onClick={processAndRefresh} disabled={refreshing}>
              {refreshing ? "Processing…" : "Run DeepCheck"}
            </button>
          }
        />
      ) : (
        <div className="grid-auto">
          {samples.map((sample) => (
            <article key={sample.sample_id} className="card sample-card">
              <div className="sample-meta">
                <Status value={sample.status} />
                {sample.target_emotion_snapshot && (
                  <span className="tag">{sample.target_emotion_snapshot}</span>
                )}
                {sample.quality_score != null && (
                  <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: "0.82rem" }}>
                    {Math.round(sample.quality_score * 100)}% quality
                  </span>
                )}
              </div>

              <p className="sample-transcript">{sample.transcript_snapshot}</p>
              <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{sample.context_brief}</p>

              {sample.deep_check_message_vi && (
                <p className="ai-note">{sample.deep_check_message_vi}</p>
              )}

              <audio controls src={apiUrl(`/media/${sample.sample_id}`)} />

              <div className="quality-grid">
                {sample.fast_check_score != null && (
                  <div className="quality-cell">
                    FastCheck score <b>{sample.fast_check_score?.toFixed(2)}</b>
                  </div>
                )}
                {sample.loudness_db != null && (
                  <div className="quality-cell">
                    Loudness <b>{sample.loudness_db?.toFixed(1)} dBFS</b>
                  </div>
                )}
                {sample.silence_ratio != null && (
                  <div className="quality-cell">
                    Silence ratio <b>{(sample.silence_ratio! * 100).toFixed(0)}%</b>
                  </div>
                )}
                {sample.speech_rate_wps != null && (
                  <div className="quality-cell">
                    Speech rate <b>{sample.speech_rate_wps?.toFixed(1)} wps</b>
                  </div>
                )}
              </div>

              <div className="review-actions">
                <button
                  className="secondary"
                  style={{
                    background: "var(--success-dim)",
                    color: "var(--success)",
                    border: "1px solid rgba(78,216,160,0.3)",
                    flex: 1,
                  }}
                  disabled={busy === sample.sample_id}
                  onClick={() => decide(sample.sample_id, "ACCEPT")}
                >
                  ✓ Accept
                </button>
                <button
                  className="secondary"
                  style={{
                    background: "var(--warning-dim)",
                    color: "var(--warning)",
                    border: "1px solid rgba(245,190,98,0.3)",
                    flex: 1,
                  }}
                  disabled={busy === sample.sample_id}
                  onClick={() => decide(sample.sample_id, "NEED_RETAKE")}
                >
                  ↩ Retake
                </button>
                <button
                  className="danger"
                  style={{ flex: 1 }}
                  disabled={busy === sample.sample_id}
                  onClick={() => decide(sample.sample_id, "REJECT")}
                >
                  ✕ Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
