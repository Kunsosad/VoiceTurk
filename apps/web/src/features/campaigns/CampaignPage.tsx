import { useState, useEffect } from "react";
import { api } from "../api";
import { useToast } from "../../shared/ui/Toast";
import { Status, SkeletonGrid, EmptyState, CoverageBar } from "../../shared/ui/components";
import { CampaignCreateForm } from "./CampaignCreateForm";
import type { Campaign, User } from "../../types/domain";

/* Storage debug panel – dev only */
function StorageDebugPanel() {
  const [steps, setSteps] = useState<Array<{ name: string; detail?: string }>>([]);
  const [running, setRunning] = useState(false);
  const add = (name: string, detail?: string) =>
    setSteps((v) => [...v, { name, detail }]);

  async function run() {
    setSteps([]);
    setRunning(true);
    let current = "BACKEND_REACHABLE";
    try {
      const health = await api.storageHealth();
      add("BACKEND_REACHABLE", `${health.provider} · ${health.public_base_url ?? health.endpoint_url}`);
      current = "UPLOAD_INIT_OK";
      const slot = await api.debugStorageInit();
      add("UPLOAD_INIT_OK", slot.object_key);
      add("PRESIGNED_URL_RECEIVED", new URL(slot.upload_url, window.location.origin).host);
      current = "PRESIGNED_PUT_STARTED";
      add(current);
      await api.debugStoragePut(slot.upload_url, new Blob(["VoiceTurk browser storage probe"], { type: "text/plain" }));
      add("PRESIGNED_PUT_OK");
      current = "VERIFY_OBJECT_OK";
      const verified = await api.debugStorageVerify(slot.probe_id);
      if (!verified.exists) throw new Error("Object was not found after browser PUT");
      add("VERIFY_OBJECT_OK", JSON.stringify(verified.metadata));
    } catch (error) {
      add("FAILED_AT_STEP", `${current}: ${(error as Error).message}`);
    } finally {
      setRunning(false);
    }
  }
  return (
    <div className="card storage-debug">
      <div className="card-header">
        <div>
          <p className="eyebrow">DEVELOPMENT DIAGNOSTIC</p>
          <h3>Browser → MinIO probe</h3>
        </div>
        <button className="secondary" disabled={running} onClick={run}>
          {running ? "Running…" : "Run storage probe"}
        </button>
      </div>
      <p className="muted" style={{ fontSize: "0.82rem" }}>
        Catches browser-only hostname, CORS, and signed Content-Type failures.
      </p>
      <ol className="storage-debug-list" style={{ marginTop: 12 }}>
        {steps.map((step, i) => (
          <li key={`${step.name}-${i}`}>
            <b>{step.name}</b>
            {step.detail && <small>{step.detail}</small>}
          </li>
        ))}
      </ol>
    </div>
  );
}

interface Props {
  campaigns: Campaign[];
  selected: string;
  setSelected: (id: string) => void;
  refresh: () => Promise<void>;
  user: User;
}

export function CampaignPage({ campaigns, selected, setSelected, refresh, user }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [coverage, setCoverage] = useState<Record<string, Record<string, number>>>({});
  const isBuyer = user.role === "BUYER" || user.role === "ADMIN";

  useEffect(() => {
    campaigns.forEach(async (c) => {
      try {
        const cov = await api.coverage(c.campaign_id);
        setCoverage((prev) => ({ ...prev, [c.campaign_id]: cov as unknown as Record<string, number> }));
      } catch {
        /* ignore */
      }
    });
  }, [campaigns]);

  async function act(action: () => Promise<unknown>, successMsg: string) {
    setLoading(true);
    try {
      await action();
      toast(successMsg, "success");
      await refresh();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      {showCreate && (
        <CampaignCreateForm
          onSuccess={async () => {
            setShowCreate(false);
            await refresh();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="section-head">
        <div>
          <p className="eyebrow">STEP 1 · CAMPAIGNS</p>
          <h2>{isBuyer ? "Your recording campaigns" : "Available campaigns"}</h2>
          <p className="section-copy muted">
            {isBuyer
              ? "Create, configure, and activate campaigns to collect voice data."
              : "Join an active campaign and record coached voice samples."}
          </p>
        </div>
        {isBuyer && (
          <div className="section-actions">
            <button onClick={() => setShowCreate(true)} disabled={loading}>
              + New campaign
            </button>
            <button
              className="secondary"
              disabled={loading}
              onClick={() =>
                act(
                  () => api.seed().then(() => {}),
                  "Demo campaign with 20 items is ready.",
                )
              }
            >
              Seed demo
            </button>
          </div>
        )}
      </div>

      {loading && campaigns.length === 0 ? (
        <SkeletonGrid count={3} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon="🎙"
          title={isBuyer ? "No campaigns yet" : "No active campaigns"}
          description={
            isBuyer
              ? "Create your first campaign to define prompts and emotions for contributors."
              : "Check back later — campaigns will appear here when they become active."
          }
          action={
            isBuyer ? (
              <button onClick={() => setShowCreate(true)}>+ Create campaign</button>
            ) : undefined
          }
        />
      ) : (
        <div className="campaign-grid">
          {campaigns.map((c) => {
            const cov = coverage[c.campaign_id];
            const accepted = cov?.accepted_items ?? 0;
            const total = cov?.total_items ?? c.item_count;
            return (
              <article
                key={c.campaign_id}
                className={`campaign-card interactive ${selected === c.campaign_id ? "selected" : ""}`}
                onClick={() => setSelected(c.campaign_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelected(c.campaign_id)}
                aria-pressed={selected === c.campaign_id}
              >
                <div className="campaign-card-header">
                  <h3 className="campaign-card-title">{c.name}</h3>
                  <Status value={c.status} />
                </div>

                {c.description && (
                  <p className="muted" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                    {c.description}
                  </p>
                )}

                <div className="campaign-card-meta">
                  <span>{c.domain}</span>
                  <span>·</span>
                  <span>{c.item_count} items</span>
                  {cov && (
                    <>
                      <span>·</span>
                      <span>{accepted} accepted</span>
                    </>
                  )}
                </div>

                <div className="tags">
                  {c.target_emotions.slice(0, 4).map((emotion) => (
                    <span key={emotion} className="tag">
                      {emotion}
                    </span>
                  ))}
                  {c.target_emotions.length > 4 && (
                    <span className="tag">+{c.target_emotions.length - 4}</span>
                  )}
                </div>

                {total > 0 && <CoverageBar value={accepted} max={total} />}

                <div className="campaign-card-footer">
                  {isBuyer && c.status === "DRAFT" && (
                    <button
                      className="secondary"
                      style={{ fontSize: "0.8rem", padding: "7px 12px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        act(
                          () => api.generate(c.campaign_id),
                          `Generated items for "${c.name}".`,
                        );
                      }}
                      disabled={loading}
                    >
                      Generate tasks
                    </button>
                  )}
                  {isBuyer && c.status === "PREVIEW_READY" && (
                    <button
                      style={{ fontSize: "0.8rem", padding: "7px 12px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        act(
                          () => api.activate(c.campaign_id),
                          `Campaign "${c.name}" is now active.`,
                        );
                      }}
                      disabled={loading}
                    >
                      Activate
                    </button>
                  )}
                  {!isBuyer && c.status === "ACTIVE" && (
                    <button
                      style={{ fontSize: "0.8rem", padding: "7px 12px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(c.campaign_id);
                      }}
                    >
                      {selected === c.campaign_id ? "✓ Selected" : "Join campaign"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Dev diagnostics */}
      {import.meta.env.DEV && (
        <details className="dev-tools">
          <summary>Development diagnostics</summary>
          <StorageDebugPanel />
        </details>
      )}
    </section>
  );
}
