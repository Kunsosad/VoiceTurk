import { useState, type FormEvent } from "react";
import { api } from "../api";
import { useToast } from "../../shared/ui/Toast";

const EMOTION_OPTIONS = [
  "neutral", "happy", "sad", "angry", "confused",
  "impatient", "excited", "frustrated", "surprised", "calm",
];

const DOMAIN_OPTIONS = [
  "ecommerce_cskh",
  "banking",
  "healthcare",
  "telecom",
  "education",
  "hospitality",
  "general",
];

interface CampaignFormData {
  name: string;
  description: string;
  domain: string;
  intents: string;
  target_emotions: string[];
  recording_instructions: string;
  accent_targets: string;
  environment_targets: string;
}

const DEFAULT_FORM: CampaignFormData = {
  name: "",
  description: "",
  domain: "ecommerce_cskh",
  intents: "order_status, delivery_delay, refund_request",
  target_emotions: ["neutral", "confused"],
  recording_instructions: "",
  accent_targets: "southern, northern",
  environment_targets: "quiet, light_noise",
};

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CampaignCreateForm({ onSuccess, onCancel }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<CampaignFormData>(DEFAULT_FORM);
  const [scriptText, setScriptText] = useState(
    `Tôi chưa nhận được hàng.|delivery_delay|Khách hàng đã chờ đơn hàng lâu hơn ngày dự kiến.
Đơn hàng của tôi đang ở đâu?|order_status|Khách hàng muốn biết trạng thái hiện tại của đơn hàng.
Tôi muốn hoàn tiền cho đơn này.|refund_request|Khách hàng không hài lòng và muốn hoàn tiền.`,
  );
  const [busy, setBusy] = useState(false);

  function toggleEmotion(emotion: string) {
    setForm((prev) => ({
      ...prev,
      target_emotions: prev.target_emotions.includes(emotion)
        ? prev.target_emotions.filter((e) => e !== emotion)
        : [...prev.target_emotions, emotion],
    }));
  }

  function parseScriptLines() {
    return scriptText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|");
        return {
          transcript: parts[0]?.trim() ?? line,
          intent: parts[1]?.trim() ?? "general",
          context_brief: parts[2]?.trim() ?? "",
        };
      });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.target_emotions.length === 0) {
      toast("Select at least one target emotion", "error");
      return;
    }
    const lines = parseScriptLines();
    if (lines.length === 0) {
      toast("Add at least one script line", "error");
      return;
    }
    setBusy(true);
    try {
      const campaign = await api.createCampaign({
        name: form.name,
        description: form.description,
        domain: form.domain,
        intents: form.intents
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        target_emotions: form.target_emotions,
        recording_instructions: form.recording_instructions,
        accent_targets: form.accent_targets
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        environment_targets: form.environment_targets
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        script_lines: lines,
      });
      toast(`Campaign "${campaign.name}" created`, "success");
      onSuccess();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "grid",
        placeItems: "center",
        zIndex: 200,
        padding: "20px",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="card"
        style={{
          width: "min(720px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "var(--r-xl)",
        }}
      >
        <div className="card-header" style={{ marginBottom: 24 }}>
          <div>
            <p className="eyebrow">NEW CAMPAIGN</p>
            <h2>Create recording campaign</h2>
          </div>
          <button className="secondary" onClick={onCancel} style={{ flexShrink: 0 }}>
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="form-group">
          {/* Basic info */}
          <label>
            Campaign name <span style={{ color: "var(--danger)" }}>*</span>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="E.g. E-commerce Prosody Q3"
              required
              minLength={2}
              maxLength={160}
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Describe the purpose of this campaign..."
              rows={2}
            />
          </label>

          <div className="form-row">
            <label>
              Domain <span style={{ color: "var(--danger)" }}>*</span>
              <select
                value={form.domain}
                onChange={(e) =>
                  setForm((p) => ({ ...p, domain: e.target.value }))
                }
              >
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Intents (comma-separated)
              <input
                value={form.intents}
                onChange={(e) =>
                  setForm((p) => ({ ...p, intents: e.target.value }))
                }
                placeholder="order_status, refund, ..."
              />
            </label>
          </div>

          <label>
            Target emotions <span style={{ color: "var(--danger)" }}>*</span>
            <div className="emotion-pills">
              {EMOTION_OPTIONS.map((emotion) => (
                <button
                  key={emotion}
                  type="button"
                  className={`emotion-pill ${form.target_emotions.includes(emotion) ? "selected" : ""}`}
                  onClick={() => toggleEmotion(emotion)}
                >
                  {emotion}
                </button>
              ))}
            </div>
          </label>

          {/* Script lines */}
          <label>
            Script lines{" "}
            <span className="hint">One per line: transcript|intent|context_brief</span>
            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              rows={6}
              style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
              placeholder="Tôi chưa nhận được hàng.|delivery_delay|Khách hàng chờ lâu."
            />
          </label>

          <label>
            Recording instructions
            <textarea
              value={form.recording_instructions}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  recording_instructions: e.target.value,
                }))
              }
              placeholder="Speak naturally, maintain 20–30 cm from microphone..."
              rows={2}
            />
          </label>

          <div className="form-row">
            <label>
              Accent targets
              <input
                value={form.accent_targets}
                onChange={(e) =>
                  setForm((p) => ({ ...p, accent_targets: e.target.value }))
                }
                placeholder="southern, northern, central"
              />
            </label>
            <label>
              Environment targets
              <input
                value={form.environment_targets}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    environment_targets: e.target.value,
                  }))
                }
                placeholder="quiet, light_noise"
              />
            </label>
          </div>

          {/* Preview */}
          <div
            className="notice"
            style={{ fontSize: "0.8rem", color: "var(--muted)" }}
          >
            Parsed: <strong>{parseScriptLines().length}</strong> script line
            {parseScriptLines().length !== 1 ? "s" : ""} ×{" "}
            <strong>{form.target_emotions.length}</strong> emotion
            {form.target_emotions.length !== 1 ? "s" : ""} ={" "}
            <strong>
              {parseScriptLines().length * form.target_emotions.length}
            </strong>{" "}
            recording items
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              disabled={busy || !form.name || form.target_emotions.length === 0}
              style={{ flex: 1 }}
            >
              {busy ? "Creating…" : "Create campaign"}
            </button>
            <button type="button" className="secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
