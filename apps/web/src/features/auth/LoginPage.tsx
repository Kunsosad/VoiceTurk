import { useState, type FormEvent } from "react";
import { api } from "../api";
import { useToast } from "../../shared/ui/Toast";
import type { User } from "../../types/domain";

interface Props {
  onAuthenticated: (user: User) => void;
}

export function LoginPage({ onAuthenticated }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("buyer@voiceturk.demo");
  const [password, setPassword] = useState("VoiceTurk123!");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"BUYER" | "CONTRIBUTOR">("BUYER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response =
        mode === "login"
          ? await api.login(email, password)
          : await api.register({ email, password, name, role });
      localStorage.setItem("voiceturk.access_token", response.access_token);
      onAuthenticated(response.user);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loginDemo(kind: "buyer" | "contributor") {
    setBusy(true);
    setError("");
    try {
      // Seed creates demo accounts if not present
      await api.seed().catch(() => {});
      const response = await api.login(`${kind}@voiceturk.demo`, "VoiceTurk123!");
      localStorage.setItem("voiceturk.access_token", response.access_token);
      onAuthenticated(response.user);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      {/* Hero */}
      <section className="auth-hero">
        <div
          className="brand-mark"
          style={{ width: 52, height: 52, fontSize: "1.05rem", marginBottom: 40 }}
        >
          VT
        </div>
        <p className="eyebrow">VOICE DATA, DIRECTED BEAUTIFULLY</p>
        <h1>
          Build Vietnamese voice datasets with studio-grade guidance.
        </h1>
        <p className="section-copy">
          Campaign design, coached recording, deterministic quality checks,
          self-review, and reproducible export — in one calm workspace.
        </p>

        <div className="signal-row">
          <span className="signal-chip">Immediate FastCheck</span>
          <span className="signal-chip">Async DeepCheck</span>
          <span className="signal-chip">Accepted-only export</span>
          <span className="signal-chip">MinIO / Local storage</span>
          <span className="signal-chip">Browser TTS Coach</span>
        </div>
      </section>

      {/* Auth card */}
      <section className="auth-card">
        <div className="auth-card-header">
          <p className="eyebrow">WELCOME TO VOICETURK</p>
          <h2>
            {mode === "login" ? "Sign in to your studio" : "Create your workspace"}
          </h2>
          <p>Secure pilot access with an expiring session.</p>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <label>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
              <label>
                Role
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as typeof role)}
                >
                  <option value="BUYER">Buyer – create & manage campaigns</option>
                  <option value="CONTRIBUTOR">Contributor – record voice samples</option>
                </select>
              </label>
            </>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={mode === "register" ? "Min 10 characters" : ""}
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} style={{ padding: "13px" }}>
            {busy
              ? "Opening studio…"
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        <button
          className="text-button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already registered? Sign in"}
        </button>

        <div className="divider">
          <span>or enter a demo workspace</span>
        </div>

        <div className="demo-grid">
          <button
            className="secondary"
            disabled={busy}
            onClick={() => loginDemo("buyer")}
          >
            Demo buyer
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => loginDemo("contributor")}
          >
            Demo contributor
          </button>
        </div>

        <p
          style={{
            marginTop: 20,
            fontSize: "0.72rem",
            color: "var(--muted)",
            lineHeight: 1.6,
          }}
        >
          Demo accounts: <code style={{ padding: "2px 6px", borderRadius: 4, fontSize: "0.7rem" }}>buyer@voiceturk.demo</code> and{" "}
          <code style={{ padding: "2px 6px", borderRadius: 4, fontSize: "0.7rem" }}>contributor@voiceturk.demo</code>, password{" "}
          <code style={{ padding: "2px 6px", borderRadius: 4, fontSize: "0.7rem" }}>VoiceTurk123!</code>
        </p>
      </section>
    </main>
  );
}
