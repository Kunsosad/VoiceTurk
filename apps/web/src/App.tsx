import { useEffect, useState } from "react";
import { api } from "./features/api";
import { LoginPage } from "./features/auth/LoginPage";
import { CampaignPage } from "./features/campaigns/CampaignPage";
import { RecordingStudio } from "./features/recording/RecordingStudio";
import { ReviewPage } from "./features/review/ReviewPage";
import { DatasetPage } from "./features/dataset/DatasetPage";
import { ToastProvider } from "./shared/ui/Toast";
import type { Campaign, RecordingItem, Sample, User } from "./types/domain";
import "./styles.css";

/* ================================================================
   Step definitions
   ================================================================ */
type StudioStep = "Campaign" | "Recording" | "Review" | "Dataset";

const BUYER_STEPS: StudioStep[] = ["Campaign", "Recording", "Review", "Dataset"];
const CONTRIBUTOR_STEPS: StudioStep[] = ["Campaign", "Recording"];
const STEP_LABELS: Record<StudioStep, string> = {
  Campaign: "Campaign",
  Recording: "Recording",
  Review: "Review & Retake",
  Dataset: "Dataset Export",
};

/* ================================================================
   Root App
   ================================================================ */
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<StudioStep>("Campaign");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState("");
  const [online, setOnline] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("voiceturk.theme") === "light" ? "light" : "dark"),
  );
  // Review state lifted here so we can refresh from parent
  const [samples, setSamples] = useState<Sample[]>([]);
  const [retakes, setRetakes] = useState<RecordingItem[]>([]);

  const isBuyer = user?.role === "BUYER" || user?.role === "ADMIN";
  const activeSteps = isBuyer ? BUYER_STEPS : CONTRIBUTOR_STEPS;

  /* Theme sync */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("voiceturk.theme", theme);
  }, [theme]);

  /* Bootstrap: check API + restore session */
  useEffect(() => {
    api
      .health()
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  /* Load campaigns when user changes */
  useEffect(() => {
    if (user) refresh().catch(() => {});
  }, [user]);

  /* Step guard: if contributor lands on buyer-only step, reset */
  useEffect(() => {
    if (!isBuyer && (step === "Review" || step === "Dataset")) {
      setStep("Campaign");
    }
  }, [isBuyer, step]);

  async function refresh() {
    if (!user) return;
    try {
      const values = await api.campaigns();
      setCampaigns(values);
      if (!selected) {
        const active = values.find((c) => c.status === "ACTIVE");
        if (active) setSelected(active.campaign_id);
      }
    } catch {
      /* swallow — health check shows offline state */
    }
  }

  async function refreshReview() {
    try {
      await api.runDeepCheck();
      setSamples(await api.queue());
      if (selected) {
        const retakeItems = (await api.retakes(selected)) as RecordingItem[];
        setRetakes(retakeItems);
      }
    } catch {
      /* swallow */
    }
  }

  /* Load review data when entering review tab */
  useEffect(() => {
    if (step === "Review" && isBuyer) {
      refreshReview().catch(() => {});
    }
  }, [step, selected, isBuyer]);

  async function logout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    localStorage.removeItem("voiceturk.access_token");
    setUser(null);
    setCampaigns([]);
    setSelected("");
    setSamples([]);
    setRetakes([]);
  }

  /* Loading screen */
  if (loading) {
    return (
      <ToastProvider>
        <div className="app-loading">
          <div
            className="brand-mark"
            style={{ width: 52, height: 52, fontSize: "1rem" }}
          >
            VT
          </div>
          <p>Preparing your studio…</p>
        </div>
      </ToastProvider>
    );
  }

  /* Login screen */
  if (!user) {
    return (
      <ToastProvider>
        <LoginPage onAuthenticated={setUser} />
      </ToastProvider>
    );
  }

  /* App shell */
  return (
    <ToastProvider>
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <a href="#" className="brand" onClick={(e) => e.preventDefault()}>
            <div className="brand-mark">VT</div>
            <div className="brand-text">
              <strong>VoiceTurk Studio</strong>
              <small>{user.role.toLowerCase()} workspace</small>
            </div>
          </a>

          <div className="header-right">
            <div className={`api-badge ${online ? "online" : ""}`}>
              API {online ? "ready" : "offline"}
            </div>

            <button
              className="icon-button theme-btn"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "☀" : "◐"}
            </button>

            <div className="account-pill">
              <div className="account-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
              <div className="account-info">
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
            </div>

            <button className="ghost" onClick={logout} style={{ padding: "0 12px" }}>
              Log out
            </button>
          </div>
        </header>

        {/* Step navigation */}
        <nav className="workflow-nav" aria-label="Workspace navigation">
          {activeSteps.map((value, index) => (
            <button
              key={value}
              className={`nav-tab ${step === value ? "active" : ""}`}
              onClick={() => setStep(value)}
            >
              <span className="nav-step">{index + 1}</span>
              {STEP_LABELS[value]}
            </button>
          ))}
        </nav>

        {/* Page content */}
        <main className="workspace">
          {step === "Campaign" && (
            <CampaignPage
              campaigns={campaigns}
              selected={selected}
              setSelected={setSelected}
              refresh={refresh}
              user={user}
            />
          )}
          {step === "Recording" && (
            <RecordingStudio campaignId={selected} />
          )}
          {step === "Review" && isBuyer && (
            <ReviewPage
              campaignId={selected}
              samples={samples}
              retakes={retakes}
              onRefresh={refreshReview}
            />
          )}
          {step === "Dataset" && isBuyer && (
            <DatasetPage campaignId={selected} />
          )}
        </main>

        <footer style={{ textAlign: "center", color: "var(--muted)", padding: "24px", fontSize: "0.78rem" }}>
          Backend-owned truth · bounded recording pipeline · deterministic FastCheck · async DeepCheck
        </footer>
      </div>
    </ToastProvider>
  );
}
